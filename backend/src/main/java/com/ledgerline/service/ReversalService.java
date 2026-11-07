package com.ledgerline.service;

import com.ledgerline.domain.*;
import com.ledgerline.dto.PostingResponse;
import com.ledgerline.dto.ReversalRequest;
import com.ledgerline.exception.ResourceNotFoundException;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.JournalRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ReversalService {

    private final JournalRepository journalRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;
    private final AttemptLoggingService attemptLoggingService;
    private final HashService hashService;

    public ReversalService(
            JournalRepository journalRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AccountRepository accountRepository,
            AttemptLoggingService attemptLoggingService,
            HashService hashService) {
        this.journalRepository = journalRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.accountRepository = accountRepository;
        this.attemptLoggingService = attemptLoggingService;
        this.hashService = hashService;
    }

    /**
     * Reverses an existing journal by posting an equal-and-opposite journal.
     * Invariant: History is never edited or deleted; corrections occur exclusively via reversals.
     * Enforced by DB constraint: UNIQUE(reversal_of) allows each journal to be reversed at most once.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PostingResponse reverseJournal(Long journalId, ReversalRequest request, User user, String idempotencyKey) {
        if (user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only Administrators can reverse posted journals.");
        }

        Journal targetJournal = journalRepository.findById(journalId)
                .orElseThrow(() -> new ResourceNotFoundException("Journal not found with ID: " + journalId));

        if (targetJournal.getKind() == JournalKind.REVERSAL) {
            throw new IllegalArgumentException("Cannot reverse a journal that is itself a REVERSAL.");
        }

        if (journalRepository.existsByReversalOf(journalId)) {
            throw new IllegalArgumentException("Journal #" + journalId + " has already been reversed.");
        }

        List<LedgerEntry> originalEntries = ledgerEntryRepository.findByJournalId(journalId);
        if (originalEntries.isEmpty()) {
            throw new IllegalStateException("Journal #" + journalId + " contains no ledger entries to reverse.");
        }

        // Collect all distinct account IDs and lock them in ascending order
        List<Long> accountIds = originalEntries.stream()
                .map(LedgerEntry::getAccountId)
                .distinct()
                .sorted()
                .toList();

        List<Account> lockedAccounts = new ArrayList<>();
        for (Long accId : accountIds) {
            Account acc = accountRepository.findByIdForUpdate(accId)
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accId));
            lockedAccounts.add(acc);
        }

        // Create Reversal Journal
        Journal reversalJournal = Journal.builder()
                .kind(JournalKind.REVERSAL)
                .initiatedBy(user.getId())
                .reason(request.getReason() != null ? request.getReason() : "Reversal of Journal #" + journalId)
                .reversalOf(journalId)
                .build();
        reversalJournal = journalRepository.save(reversalJournal);

        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Long totalReversedAmount = 0L;

        // Invert entries: original DEBIT becomes CREDIT; original CREDIT becomes DEBIT
        for (LedgerEntry orig : originalEntries) {
            Account account = lockedAccounts.stream()
                    .filter(a -> a.getId().equals(orig.getAccountId()))
                    .findFirst()
                    .orElseThrow();

            EntryDirection invertedDirection = orig.getDirection() == EntryDirection.DEBIT ?
                    EntryDirection.CREDIT : EntryDirection.DEBIT;

            long newBalance;
            if (invertedDirection == EntryDirection.CREDIT) {
                newBalance = account.getBalance() + orig.getAmount();
            } else {
                newBalance = account.getBalance() - orig.getAmount();
            }
            account.setBalance(newBalance);
            accountRepository.save(account);

            String prevHash = ledgerEntryRepository.findLatestByAccountId(account.getId())
                    .map(LedgerEntry::getHash)
                    .orElse(null);

            String newHash = hashService.calculateEntryHash(
                    prevHash, account.getId(), reversalJournal.getId(),
                    invertedDirection, orig.getAmount(), newBalance, now
            );

            LedgerEntry reversalEntry = LedgerEntry.builder()
                    .journalId(reversalJournal.getId())
                    .accountId(account.getId())
                    .direction(invertedDirection)
                    .amount(orig.getAmount())
                    .balanceAfter(newBalance)
                    .prevHash(prevHash)
                    .hash(newHash)
                    .createdAt(now)
                    .build();
            ledgerEntryRepository.save(reversalEntry);

            totalReversedAmount += orig.getAmount();
        }

        attemptLoggingService.logPosted(
                null, user.getId(), JournalKind.REVERSAL, totalReversedAmount / 2,
                reversalJournal.getId(), "Reversal of Journal #" + journalId + " posted successfully", idempotencyKey
        );

        return PostingResponse.builder()
                .journalId(reversalJournal.getId())
                .kind(JournalKind.REVERSAL)
                .amount(totalReversedAmount / 2)
                .status("POSTED")
                .message("Journal #" + journalId + " reversed successfully via Reversal Journal #" + reversalJournal.getId())
                .createdAt(now)
                .build();
    }
}
