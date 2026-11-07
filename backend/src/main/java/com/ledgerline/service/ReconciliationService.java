package com.ledgerline.service;

import com.ledgerline.domain.Account;
import com.ledgerline.domain.AccountType;
import com.ledgerline.domain.LedgerEntry;
import com.ledgerline.dto.HashChainVerificationReport;
import com.ledgerline.dto.ReconciliationReport;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.JournalRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReconciliationService {

    private final AccountRepository accountRepository;
    private final JournalRepository journalRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final HashService hashService;

    public ReconciliationService(
            AccountRepository accountRepository,
            JournalRepository journalRepository,
            LedgerEntryRepository ledgerEntryRepository,
            HashService hashService) {
        this.accountRepository = accountRepository;
        this.journalRepository = journalRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
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
}
