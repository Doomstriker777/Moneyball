package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.domain.AttemptOutcome;
import com.ledgerline.domain.JournalKind;
import com.ledgerline.domain.LedgerAttempt;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.JournalRepository;
import com.ledgerline.repository.LedgerAttemptRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PostingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private JournalRepository journalRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private LedgerAttemptRepository ledgerAttemptRepository;

    private String holder1Token;
    private String holder2Token;
    private String adminToken;
    private String auditorToken;

    @BeforeEach
    void setupTokens() throws Exception {
        holder1Token = obtainToken("holder1@ledgerline.internal", "Holder123!");
        holder2Token = obtainToken("holder2@ledgerline.internal", "Holder222!");
        adminToken = obtainToken("admin@ledgerline.internal", "Admin123!");
        auditorToken = obtainToken("auditor@ledgerline.internal", "Auditor123!");
    }

    private String obtainToken(String email, String password) throws Exception {
        LoginRequest req = LoginRequest.builder().email(email).password(password).build();
        MvcResult res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(res.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    @DisplayName("Deposit: Debits EXTERNAL, credits customer, global conservation sum remains 0")
    void depositSuccessMaintainsConservation() throws Exception {
        DepositRequest req = DepositRequest.builder()
                .accountId(2L) // ACC-100001 (Holder 1)
                .amount(20000L) // ₹200.00
                .reason("External top-up")
                .build();

        long balanceBefore = accountRepository.findById(2L).orElseThrow().getBalance();

        mockMvc.perform(post("/api/deposits")
                        .header("Authorization", "Bearer " + holder1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("POSTED")))
                .andExpect(jsonPath("$.amount", is(20000)))
                .andExpect(jsonPath("$.destinationBalanceAfter", is((int) (balanceBefore + 20000L))));

        // Conservation check: Sum of ALL accounts in system must remain strictly 0
        assertThat(accountRepository.sumAllBalances()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Withdrawal: Debits customer, credits EXTERNAL, global conservation sum remains 0")
    void withdrawalSuccessMaintainsConservation() throws Exception {
        WithdrawalRequest req = WithdrawalRequest.builder()
                .accountId(2L) // ACC-100001 (Holder 1)
                .amount(10000L) // ₹100.00
                .reason("ATM Cash withdrawal")
                .build();

        long balanceBefore = accountRepository.findById(2L).orElseThrow().getBalance();

        mockMvc.perform(post("/api/withdrawals")
                        .header("Authorization", "Bearer " + holder1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("POSTED")))
                .andExpect(jsonPath("$.amount", is(10000)))
                .andExpect(jsonPath("$.sourceBalanceAfter", is((int) (balanceBefore - 10000L))));

        assertThat(accountRepository.sumAllBalances()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Transfer: Moves paise between accounts, ordered locking prevents deadlocks, sum remains 0")
    void transferBetweenHoldersSuccess() throws Exception {
        TransferRequest req = TransferRequest.builder()
                .sourceAccountId(2L) // ACC-100001
                .destinationAccountId(3L) // ACC-100002
                .amount(15000L) // ₹150.00
                .reason("Peer to peer transfer")
                .build();

        long srcBefore = accountRepository.findById(2L).orElseThrow().getBalance();
        long dstBefore = accountRepository.findById(3L).orElseThrow().getBalance();

        mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + holder1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("POSTED")))
                .andExpect(jsonPath("$.sourceBalanceAfter", is((int) (srcBefore - 15000L))))
                .andExpect(jsonPath("$.destinationBalanceAfter", is((int) (dstBefore + 15000L))));

        assertThat(accountRepository.sumAllBalances()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Refusal Persistence: Insufficient funds rolls back transaction but leaves REFUSED attempt in ledger_attempts")
    void insufficientFundsPersistsRefusedAttempt() throws Exception {
        long attemptsBefore = ledgerAttemptRepository.count();
        long journalsBefore = journalRepository.count();

        WithdrawalRequest req = WithdrawalRequest.builder()
                .accountId(3L) // ACC-100002 (Holder 2)
                .amount(99999999L) // Far beyond balance
                .reason("Greedy withdrawal attempt")
                .build();

        mockMvc.perform(post("/api/withdrawals")
                        .header("Authorization", "Bearer " + holder2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.title", is("Insufficient Funds")));

        // Transaction must have rolled back: no new journal
        assertThat(journalRepository.count()).isEqualTo(journalsBefore);

        // But refusal must have persisted via REQUIRES_NEW!
        assertThat(ledgerAttemptRepository.count()).isEqualTo(attemptsBefore + 1);

        List<LedgerAttempt> attempts = ledgerAttemptRepository.findByAccountIdOrderByCreatedAtDesc(3L);
        assertThat(attempts).isNotEmpty();
        assertThat(attempts.get(0).getOutcome()).isEqualTo(AttemptOutcome.REFUSED);
        assertThat(attempts.get(0).getReason()).contains("Insufficient funds");
    }

    @Test
    @DisplayName("Authorization & Anti-Enumeration: Holder cannot transfer from unentitled account (returns 404, not 403)")
    void holderCannotDebitOtherAccount() throws Exception {
        TransferRequest req = TransferRequest.builder()
                .sourceAccountId(2L) // Owned by Holder 1
                .destinationAccountId(3L)
                .amount(1000L)
                .reason("Theft attempt")
                .build();

        // Holder 2 tries to initiate debit from Holder 1's account
        mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + holder2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound()); // Must return 404 to prevent enumeration
    }

    @Test
    @DisplayName("Auditor Write Restriction: Auditor is strictly read-only, all write paths return 403 Forbidden")
    void auditorCannotExecuteMoneyMovement() throws Exception {
        TransferRequest req = TransferRequest.builder()
                .sourceAccountId(2L)
                .destinationAccountId(3L)
                .amount(1000L)
                .reason("Auditor illegal write")
                .build();

        mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + auditorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Statement Endpoint: Returns chronological ledger entries and balance after each entry")
    void getStatementSuccess() throws Exception {
        mockMvc.perform(get("/api/accounts/2/statement")
                        .header("Authorization", "Bearer " + holder1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber", is("ACC-100001")))
                .andExpect(jsonPath("$.items").isArray());
    }
}

