package com.ledgerline.service;

import com.ledgerline.domain.*;
import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.AuditPackResponse;
import com.ledgerline.dto.HashChainVerificationReport;
import com.ledgerline.dto.ReconciliationReport;
import com.ledgerline.dto.TransactionLogResponse;
import com.ledgerline.repository.*;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReconciliationService {

    private final AccountRepository accountRepository;
    private final JournalRepository journalRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final LedgerAttemptRepository ledgerAttemptRepository;
    private final FlagRepository flagRepository;
    private final HashService hashService;

    public ReconciliationService(
            AccountRepository accountRepository,
            JournalRepository journalRepository,
            LedgerEntryRepository ledgerEntryRepository,
            LedgerAttemptRepository ledgerAttemptRepository,
            FlagRepository flagRepository,
            HashService hashService) {
        this.accountRepository = accountRepository;
        this.journalRepository = journalRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.ledgerAttemptRepository = ledgerAttemptRepository;
        this.flagRepository = flagRepository;
        this.hashService = hashService;
    }

    /**
     * Recomputes balances from all ledger entries, compares with cached balances,
     * and verifies global conservation: sum(all accounts) == 0.
     */
    @Transactional(readOnly = true)
    public ReconciliationReport performReconciliation() {
        List<Account> accounts = accountRepository.findAll();
        List<ReconciliationReport.DiscrepancyItem> discrepancies = new ArrayList<>();

        long customerSum = 0L;
        long externalBalance = 0L;

        for (Account account : accounts) {
            Long recalculated = ledgerEntryRepository.calculateBalanceFromEntries(account.getId());
            Long cached = account.getBalance();

            if (!cached.equals(recalculated)) {
                discrepancies.add(ReconciliationReport.DiscrepancyItem.builder()
                        .accountId(account.getId())
                        .accountNumber(account.getNumber())
                        .cachedBalance(cached)
                        .recalculatedBalance(recalculated)
                        .difference(cached - recalculated)
                        .build());
            }

            if (account.getType() == AccountType.CUSTOMER) {
                customerSum += cached;
            } else if (account.getId().equals(PostingService.EXTERNAL_ACCOUNT_ID)) {
                externalBalance = cached;
            }
        }

        Long totalSystemSum = accountRepository.sumAllBalances();
        boolean conservationHolds = (totalSystemSum != null && totalSystemSum == 0L) && discrepancies.isEmpty();

        return ReconciliationReport.builder()
                .status(conservationHolds ? "BALANCED" : "DISCREPANCY")
                .conservationHolds(conservationHolds)
                .systemSum(totalSystemSum != null ? totalSystemSum : 0L)
                .totalCustomerBalance(customerSum)
                .externalAccountBalance(externalBalance)
                .totalAccountsScanned(accounts.size())
                .totalJournalsScanned((int) journalRepository.count())
                .discrepancies(discrepancies)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Traverses per-account SHA-256 hash chains from genesis to tip.
     * Detects any retroactively tampered balance, direction, amount, or link.
     */
    @Transactional(readOnly = true)
    public HashChainVerificationReport verifyHashChain() {
        List<Account> accounts = accountRepository.findAll();
        int totalScanned = 0;

        for (Account account : accounts) {
            List<LedgerEntry> entries = ledgerEntryRepository.findByAccountIdOrderByIdAsc(account.getId());
            String expectedPrevHash = null;

            for (LedgerEntry entry : entries) {
                totalScanned++;

                // 1. Verify link continuity
                if ((expectedPrevHash == null && entry.getPrevHash() != null) ||
                    (expectedPrevHash != null && !expectedPrevHash.equals(entry.getPrevHash()))) {
                    return HashChainVerificationReport.builder()
                            .status("BROKEN")
                            .valid(false)
                            .totalEntriesScanned(totalScanned)
                            .totalAccountsScanned(accounts.size())
                            .firstBrokenEntryId(entry.getId())
                            .brokenAccountId(account.getId())
                            .failureReason("Link broken: expected prevHash '" + expectedPrevHash +
                                    "' but found '" + entry.getPrevHash() + "'")
                            .timestamp(Instant.now())
                            .build();
                }

                // 2. Recompute and verify payload cryptographic hash
                String recomputedHash = hashService.calculateEntryHash(
                        entry.getPrevHash(),
                        entry.getAccountId(),
                        entry.getJournalId(),
                        entry.getDirection(),
                        entry.getAmount(),
                        entry.getBalanceAfter(),
                        entry.getCreatedAt()
                );

                if (!recomputedHash.equalsIgnoreCase(entry.getHash())) {
                    return HashChainVerificationReport.builder()
                            .status("BROKEN")
                            .valid(false)
                            .totalEntriesScanned(totalScanned)
                            .totalAccountsScanned(accounts.size())
                            .firstBrokenEntryId(entry.getId())
                            .brokenAccountId(account.getId())
                            .failureReason("Cryptographic hash mismatch on Entry #" + entry.getId() +
                                    ". Entry hash: " + entry.getHash() + ", Recomputed: " + recomputedHash)
                            .timestamp(Instant.now())
                            .build();
                }

                expectedPrevHash = entry.getHash();
            }
        }

        return HashChainVerificationReport.builder()
                .status("VERIFIED")
                .valid(true)
                .totalEntriesScanned(totalScanned)
                .totalAccountsScanned(accounts.size())
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Exports complete ledger audit pack for offline cryptographic verification by auditors.
     */
    @Transactional(readOnly = true)
    public AuditPackResponse exportAuditPack(User user) {
        ReconciliationReport rec = performReconciliation();
        HashChainVerificationReport verify = verifyHashChain();
        List<AccountResponse> accounts = accountRepository.findAll().stream()
                .map(AccountResponse::fromEntity)
                .toList();
        List<LedgerEntry> entries = ledgerEntryRepository.findAll();
        List<LedgerAttempt> attempts = ledgerAttemptRepository.findAll();
        List<Flag> flags = flagRepository.findAll();

        String instructions = """
                LedgerLine Offline Audit Verification Guide:
                1. Verify Invariant: The algebraic sum of all account balances (including EXT-000000) must equal 0.
                2. Verify Double-Entry Balance: For each journal, SUM(credits) must equal SUM(debits).
                3. Verify Cryptographic Hash Chain per Account:
                   For each entry in an account ordered chronologically from genesis to tip:
                   data = (prev_hash || account_id || journal_id || direction || amount || balance_after || created_at)
                   recomputed_hash = sha256(data)
                   assert recomputed_hash == entry.hash
                   assert next_entry.prev_hash == current_entry.hash
                4. Verify Refusal Log: Every refusal in ledger_attempts has outcome = REFUSED and no matching journal.
                """;

        return AuditPackResponse.builder()
                .system("LedgerLine Double-Entry Core Engine")
                .exportVersion("1.0.0")
                .exportedAt(Instant.now())
                .exportedBy(user != null ? user.getEmail() : "AUDITOR")
                .reconciliation(rec)
                .hashVerification(verify)
                .accounts(accounts)
                .ledgerEntries(entries)
                .ledgerAttempts(attempts)
                .complianceFlags(flags)
                .offlineVerificationInstructions(instructions)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TransactionLogResponse> getAllTransactions() {
        List<LedgerEntry> entries = ledgerEntryRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        Map<Long, Journal> journalMap = journalRepository.findAll().stream()
                .collect(Collectors.toMap(Journal::getId, j -> j, (a, b) -> a));
        Map<Long, Account> accountMap = accountRepository.findAll().stream()
                .collect(Collectors.toMap(Account::getId, a -> a, (a, b) -> a));

        List<TransactionLogResponse> list = new ArrayList<>();
        for (LedgerEntry e : entries) {
            Journal j = journalMap.get(e.getJournalId());
            Account acc = accountMap.get(e.getAccountId());

            List<LedgerEntry> siblings = ledgerEntryRepository.findByJournalId(e.getJournalId());
            Account counterparty = siblings.stream()
                    .filter(s -> !s.getId().equals(e.getId()))
                    .findFirst()
                    .map(s -> accountMap.get(s.getAccountId()))
                    .orElse(null);

            list.add(TransactionLogResponse.builder()
                    .journalId(e.getJournalId())
                    .entryId(e.getId())
                    .accountId(e.getAccountId())
                    .accountNumber(acc != null ? acc.getNumber() : "ACC-" + e.getAccountId())
                    .kind(j != null ? j.getKind() : null)
                    .direction(e.getDirection().name())
                    .amount(e.getAmount())
                    .balanceAfter(e.getBalanceAfter())
                    .reason(j != null ? j.getReason() : "")
                    .counterpartyAccountId(counterparty != null ? counterparty.getId() : null)
                    .counterpartyAccountNumber(counterparty != null ? counterparty.getNumber() : null)
                    .hash(e.getHash())
                    .createdAt(e.getCreatedAt())
                    .build());
        }
        return list;
    }
}
