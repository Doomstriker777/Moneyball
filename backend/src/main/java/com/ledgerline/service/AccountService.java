package com.ledgerline.service;

import com.ledgerline.domain.*;
import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.StatementItemResponse;
import com.ledgerline.dto.StatementResponse;
import com.ledgerline.exception.ResourceNotFoundException;
import com.ledgerline.repository.AccountMemberRepository;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.LedgerAttemptRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountMemberRepository accountMemberRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final LedgerAttemptRepository ledgerAttemptRepository;

    public AccountService(
            AccountRepository accountRepository,
            AccountMemberRepository accountMemberRepository,
            LedgerEntryRepository ledgerEntryRepository,
            LedgerAttemptRepository ledgerAttemptRepository) {
        this.accountRepository = accountRepository;
        this.accountMemberRepository = accountMemberRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.ledgerAttemptRepository = ledgerAttemptRepository;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccountsForUser(User user) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.AUDITOR) {
            return accountRepository.findAll().stream()
                    .map(AccountResponse::fromEntity)
                    .toList();
        }

        List<Long> memberAccountIds = accountMemberRepository.findByUserId(user.getId()).stream()
                .map(AccountMember::getAccountId)
                .toList();

        return accountRepository.findAll().stream()
                .filter(a -> a.getOwnerId().equals(user.getId()) || memberAccountIds.contains(a.getId()))
                .map(AccountResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Account getAccountEntityWithEntitlement(Long accountId, User user) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));

        // Entitlement enforcement: Holders can only access their own accounts
        // Return 404 (not 403) to prevent enumeration of account numbers
        if (user.getRole() == Role.HOLDER) {
            boolean isOwner = account.getOwnerId().equals(user.getId());
            boolean isMember = accountMemberRepository.existsByUserIdAndAccountId(user.getId(), accountId);
            if (!isOwner && !isMember) {
                throw new ResourceNotFoundException("Account not found with ID: " + accountId);
            }
        }

        return account;
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountById(Long accountId, User user) {
        Account account = getAccountEntityWithEntitlement(accountId, user);
        return AccountResponse.fromEntity(account);
    }

    @Transactional(readOnly = true)
    public StatementResponse getStatement(Long accountId, User user) {
        Account account = getAccountEntityWithEntitlement(accountId, user);

        List<LedgerEntry> entries = ledgerEntryRepository.findByAccountIdOrderByIdAsc(accountId);
        List<LedgerAttempt> attempts = ledgerAttemptRepository.findByAccountIdOrderByCreatedAtDesc(accountId);

        List<StatementItemResponse> items = new ArrayList<>();

        // Add posted ledger entries
        for (LedgerEntry entry : entries) {
            items.add(StatementItemResponse.builder()
                    .id(entry.getId())
                    .journalId(entry.getJournalId())
                    .itemType("ENTRY")
                    .direction(entry.getDirection())
                    .amount(entry.getAmount())
                    .balanceAfter(entry.getBalanceAfter())
                    .outcome(AttemptOutcome.POSTED)
                    .reason("Posted ledger transaction")
                    .hash(entry.getHash())
                    .prevHash(entry.getPrevHash())
                    .createdAt(entry.getCreatedAt())
                    .build());
        }

        // Add refused and replayed attempts (posted attempts are already represented by entries)
        for (LedgerAttempt attempt : attempts) {
            if (attempt.getOutcome() != AttemptOutcome.POSTED) {
                items.add(StatementItemResponse.builder()
                        .id(attempt.getId())
                        .journalId(attempt.getJournalId())
                        .itemType("ATTEMPT")
                        .kind(attempt.getKind())
                        .direction(null)
                        .amount(attempt.getAmount())
                        .balanceAfter(null)
                        .outcome(attempt.getOutcome())
                        .reason(attempt.getReason())
                        .createdAt(attempt.getCreatedAt())
                        .build());
            }
        }

        // Sort chronological (oldest to newest)
        items.sort(Comparator.comparing(StatementItemResponse::getCreatedAt));

        return StatementResponse.builder()
                .accountId(account.getId())
                .accountNumber(account.getNumber())
                .ownerId(account.getOwnerId())
                .type(account.getType())
                .currentBalance(account.getBalance())
                .overdraftLimit(account.getOverdraftLimit())
                .status(account.getStatus())
                .items(items)
                .build();
    }
}
