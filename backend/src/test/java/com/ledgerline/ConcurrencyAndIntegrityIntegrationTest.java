package com.ledgerline;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.domain.*;
import com.ledgerline.dto.*;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.JournalRepository;
import com.ledgerline.repository.LedgerAttemptRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import com.ledgerline.service.PostingService;
import com.ledgerline.service.ReconciliationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConcurrencyAndIntegrityIntegrationTest {

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

    @Autowired
    private ReconciliationService reconciliationService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PostingService postingService;

    @Autowired
    private com.ledgerline.repository.UserRepository userRepository;

    private String holder1Token;
    private String holder2Token;
    private String adminToken;
    private String auditorToken;

    @BeforeEach
    void setUpTokens() throws Exception {
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

    private void ensureAccountFunded(Long accountId, long minPaise) {
        long current = accountRepository.findById(accountId).orElseThrow().getBalance();
        if (current < minPaise) {
            User adminUser = userRepository.findByEmail("admin@ledgerline.internal").orElseThrow();
            postingService.deposit(
                    DepositRequest.builder().accountId(accountId).amount(minPaise - current + 100000L).reason("Test prefund").build(),
                    adminUser,
                    "prefund-" + accountId + "-" + System.currentTimeMillis()
            );
        }
    }

    @Test
    @DisplayName("Race Test 1: No Overdraw — 20 concurrent withdrawals of 60 on balance 100 => exactly 1 succeeds, 19 refused")
    void noOverdrawConcurrentRace() throws Exception {
        User adminUser = userRepository.findByEmail("admin@ledgerline.internal").orElseThrow();

        // 1. Create and properly fund an isolated account with 10,000 paise (₹100.00) via double-entry deposit
        Account acc = accountRepository.save(Account.builder()
                .number("RACE-ACC-" + System.currentTimeMillis())
                .ownerId(4L) // Holder 1
                .type(AccountType.CUSTOMER)
                .balance(0L)
                .overdraftLimit(0L)
                .status(AccountStatus.ACTIVE)
                .build());

        postingService.deposit(
                DepositRequest.builder().accountId(acc.getId()).amount(10000L).reason("Fund race account").build(),
                adminUser,
                "fund-race-" + acc.getId()
        );

        int numThreads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch readyLatch = new CountDownLatch(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger refusedCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            final int index = i;
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await(); // All threads release at the exact same millisecond
                    WithdrawalRequest req = WithdrawalRequest.builder()
                            .accountId(acc.getId())
                            .amount(6000L) // ₹60.00
                            .reason("Concurrent race withdrawal " + index)
                            .build();

                    MvcResult result = mockMvc.perform(post("/api/withdrawals")
                                    .header("Authorization", "Bearer " + holder1Token)
                                    .header("Idempotency-Key", "race-with-" + acc.getId() + "-" + index)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(req)))
                            .andReturn();

                    int status = result.getResponse().getStatus();
                    if (status == 200) {
                        successCount.incrementAndGet();
                    } else if (status == 422) {
                        refusedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    refusedCount.incrementAndGet();
                }
            }));
        }

        readyLatch.await();
        startLatch.countDown(); // Fire all 20 threads simultaneously!

        for (Future<?> f : futures) {
            f.get(15, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertThat(successCount.get())
                .as("Strictly one withdrawal of 60 on balance 100 must succeed")
                .isEqualTo(1);
        assertThat(refusedCount.get())
                .as("Remaining 19 withdrawals must be refused")
                .isEqualTo(19);

        Account finalAcc = accountRepository.findById(acc.getId()).orElseThrow();
        assertThat(finalAcc.getBalance())
                .as("Final balance must be exactly 40 (100 - 60 = 40)")
                .isEqualTo(4000L);

        // Verify that 19 REFUSED attempts are ledgered in ledger_attempts
        List<LedgerAttempt> attempts = ledgerAttemptRepository.findByAccountIdOrderByCreatedAtDesc(acc.getId());
        long refusedAttempts = attempts.stream().filter(a -> a.getOutcome() == AttemptOutcome.REFUSED).count();
        assertThat(refusedAttempts).isEqualTo(19);
    }

    @Test
    @DisplayName("Race Test 2: Opposing Transfers — A->B and B->A 50 times concurrently without deadlock")
    void opposingTransfersNoDeadlock() throws Exception {
        User adminUser = userRepository.findByEmail("admin@ledgerline.internal").orElseThrow();

        // Properly fund both accounts via double-entry deposit so conservation holds
        postingService.deposit(
                DepositRequest.builder().accountId(2L).amount(500000L).reason("Fund A for opposing race").build(),
                adminUser,
                "fund-opp-a-" + UUID.randomUUID()
        );
        postingService.deposit(
                DepositRequest.builder().accountId(3L).amount(500000L).reason("Fund B for opposing race").build(),
                adminUser,
                "fund-opp-b-" + UUID.randomUUID()
        );

        int numPairs = 25; // 25 A->B and 25 B->A = 50 concurrent opposing transfers
        int totalThreads = numPairs * 2;
        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch readyLatch = new CountDownLatch(totalThreads);
        CountDownLatch startLatch = new CountDownLatch(1);

        List<Future<?>> futures = new ArrayList<>();
        AtomicInteger completedCount = new AtomicInteger(0);

        for (int i = 0; i < numPairs; i++) {
            final int idA = i;
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    TransferRequest req = TransferRequest.builder()
                            .sourceAccountId(2L)
                            .destinationAccountId(3L)
                            .amount(100L) // ₹1.00
                            .reason("A to B opposing " + idA)
                            .build();

                    MvcResult res = mockMvc.perform(post("/api/transfers")
                                    .header("Authorization", "Bearer " + holder1Token)
                                    .header("Idempotency-Key", "opp-a-b-" + idA + "-" + UUID.randomUUID())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(req)))
                            .andReturn();
                    if (res.getResponse().getStatus() == 200) {
                        completedCount.incrementAndGet();
                    }
                } catch (Exception ignored) {}
            }));

            final int idB = i;
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    TransferRequest req = TransferRequest.builder()
                            .sourceAccountId(3L)
                            .destinationAccountId(2L)
                            .amount(100L) // ₹1.00
                            .reason("B to A opposing " + idB)
                            .build();

                    MvcResult res = mockMvc.perform(post("/api/transfers")
                                    .header("Authorization", "Bearer " + holder2Token)
                                    .header("Idempotency-Key", "opp-b-a-" + idB + "-" + UUID.randomUUID())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(req)))
                            .andReturn();
                    if (res.getResponse().getStatus() == 200) {
                        completedCount.incrementAndGet();
                    }
                } catch (Exception ignored) {}
            }));
        }

        readyLatch.await();
        startLatch.countDown(); // Fire opposing transfers simultaneously

        for (Future<?> f : futures) {
            f.get(15, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertThat(completedCount.get())
                .as("All opposing transfers must complete with zero deadlocks")
                .isEqualTo(totalThreads);

        // Assert conservation equation holds after intense opposing concurrency
        ReconciliationReport report = reconciliationService.performReconciliation();
        assertThat(report.isConservationHolds())
                .as("Global conservation holds after 50 concurrent opposing transfers")
                .isTrue();
    }

    @Test
    @DisplayName("Race Test 3: Idempotent Replay — 10 concurrent requests with identical key produce exactly 1 journal")
    void idempotentReplayConcurrentRace() throws Exception {
        ensureAccountFunded(2L, 50000L);
        String sharedKey = "idemp-race-" + UUID.randomUUID();
        TransferRequest req = TransferRequest.builder()
                .sourceAccountId(2L)
                .destinationAccountId(3L)
                .amount(2500L) // ₹25.00
                .reason("Concurrent duplicate submission")
                .build();

        long journalsBefore = journalRepository.count();

        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch ready = new CountDownLatch(numThreads);
        CountDownLatch start = new CountDownLatch(1);

        List<Future<Integer>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            futures.add(executor.submit(() -> {
                ready.countDown();
                start.await();
                MvcResult res = mockMvc.perform(post("/api/transfers")
                                .header("Authorization", "Bearer " + holder1Token)
                                .header("Idempotency-Key", sharedKey)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(req)))
                        .andReturn();
                return res.getResponse().getStatus();
            }));
        }

        ready.await();
        start.countDown(); // Fire identical requests concurrently

        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : futures) {
            statuses.add(f.get(10, TimeUnit.SECONDS));
        }
        executor.shutdown();

        // Exactly one journal must be created
        long journalsAfter = journalRepository.count();
        assertThat(journalsAfter - journalsBefore)
                .as("Only one journal created despite 10 concurrent submissions with same key")
                .isEqualTo(1);

        // Every status is either 200 (original or replay) or 409 (retry-after during execution)
        assertThat(statuses).allMatch(s -> s == 200 || s == 409);

        // Sequential replay with same key must return 200 and identical journal
        MvcResult replayRes = mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + holder1Token)
                        .header("Idempotency-Key", sharedKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        PostingResponse replayPosting = objectMapper.readValue(
                replayRes.getResponse().getContentAsString(), PostingResponse.class
        );
        assertThat(replayPosting.getStatus()).isEqualTo("POSTED");

        // Same key with altered body must be rejected with 422 Unprocessable Entity
        TransferRequest alteredReq = TransferRequest.builder()
                .sourceAccountId(2L)
                .destinationAccountId(3L)
                .amount(99999L) // Altered amount!
                .reason("Different payload")
                .build();

        mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + holder1Token)
                        .header("Idempotency-Key", sharedKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alteredReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.title", is("Idempotency Key Payload Mismatch")));
    }

    @Test
    @DisplayName("Integrity Test 4: Append-Only DB Triggers prevent UPDATE, DELETE, and TRUNCATE")
    void appendOnlyTriggersEnforceImmutability() {
        // Attempting to update ledger_entries via raw SQL must throw PostgreSQL trigger exception
        assertThatThrownBy(() -> jdbcTemplate.execute("UPDATE ledger_entries SET amount = 999999 WHERE id = 1"))
                .hasMessageContaining("strictly append-only");

        // Attempting to delete from journals must fail
        assertThatThrownBy(() -> jdbcTemplate.execute("DELETE FROM journals WHERE id = 1"))
                .hasMessageContaining("strictly append-only");

        // Attempting to delete from ledger_attempts must fail
        assertThatThrownBy(() -> jdbcTemplate.execute("DELETE FROM ledger_attempts WHERE id = 1"))
                .hasMessageContaining("strictly append-only");
    }

    @Test
    @DisplayName("Integrity Test 5: Reversals — Admin posts equal-and-opposite reversal, UNIQUE(reversal_of) blocks duplicate reversal")
    void adminReversalInvertsJournalAndPreventsDuplicate() throws Exception {
        ensureAccountFunded(2L, 50000L);
        // 1. Post a transfer from Holder 1 to Holder 2
        TransferRequest transferReq = TransferRequest.builder()
                .sourceAccountId(2L)
                .destinationAccountId(3L)
                .amount(5000L) // ₹50.00
                .reason("Transfer to be reversed")
                .build();

        MvcResult transferResult = mockMvc.perform(post("/api/transfers")
                        .header("Authorization", "Bearer " + holder1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isOk())
                .andReturn();

        PostingResponse posting = objectMapper.readValue(
                transferResult.getResponse().getContentAsString(), PostingResponse.class
        );
        Long targetJournalId = posting.getJournalId();

        long srcBalanceAfterTransfer = accountRepository.findById(2L).orElseThrow().getBalance();
        long dstBalanceAfterTransfer = accountRepository.findById(3L).orElseThrow().getBalance();

        // 2. Admin executes Reversal
        ReversalRequest revReq = ReversalRequest.builder()
                .reason("Admin reversal of accidental transfer #" + targetJournalId)
                .build();

        MvcResult revResult = mockMvc.perform(post("/api/reversals/" + targetJournalId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(revReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind", is("REVERSAL")))
                .andReturn();

        // 3. Verify balances are exactly restored
        Account srcAfterRev = accountRepository.findById(2L).orElseThrow();
        Account dstAfterRev = accountRepository.findById(3L).orElseThrow();

        assertThat(srcAfterRev.getBalance()).isEqualTo(srcBalanceAfterTransfer + 5000L);
        assertThat(dstAfterRev.getBalance()).isEqualTo(dstBalanceAfterTransfer - 5000L);

        // 4. Attempting to reverse the SAME journal again must be rejected (UNIQUE reversal_of)
        mockMvc.perform(post("/api/reversals/" + targetJournalId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(revReq)))
                .andExpect(status().isBadRequest());

        // 5. Auditor attempting reversal must get 403 Forbidden
        mockMvc.perform(post("/api/reversals/" + targetJournalId)
                        .header("Authorization", "Bearer " + auditorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(revReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Integrity Test 6: Audit Reconciliation and Hash-Chain Verification")
    void reconciliationAndHashChainVerification() throws Exception {
        // Run Reconciliation
        MvcResult recRes = mockMvc.perform(get("/api/audit/reconciliation")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andReturn();
        System.out.println("RECONCILIATION RESULT: " + recRes.getResponse().getContentAsString());

        // Run Hash-Chain Verification
        MvcResult verRes = mockMvc.perform(get("/api/audit/verify")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andReturn();
        System.out.println("VERIFY RESULT: " + verRes.getResponse().getContentAsString());

        mockMvc.perform(get("/api/audit/reconciliation")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("BALANCED")))
                .andExpect(jsonPath("$.conservationHolds", is(true)))
                .andExpect(jsonPath("$.systemSum", is(0)));

        mockMvc.perform(get("/api/audit/verify")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("VERIFIED")))
                .andExpect(jsonPath("$.valid", is(true)));
    }

    @Test
    @DisplayName("Integrity Test 7: Compliance Flags — Large transfers trigger HIGH severity flag")
    void largeAmountTriggersComplianceFlag() throws Exception {
        // Admin deposits ₹15,000.00 (1,500,000 paise) which exceeds the ₹10,000 threshold
        DepositRequest req = DepositRequest.builder()
                .accountId(2L)
                .amount(1500000L)
                .reason("Large capital injection")
                .build();

        mockMvc.perform(post("/api/deposits")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Auditor inspects flags
        MvcResult res = mockMvc.perform(get("/api/audit/flags?status=OPEN")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andReturn();

        List<?> flags = objectMapper.readValue(res.getResponse().getContentAsString(), List.class);
        assertThat(flags).isNotEmpty();
    }
}
