package com.ledgerline.service;

import com.ledgerline.domain.*;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.PostingResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.exception.AccountFrozenException;
import com.ledgerline.exception.InsufficientFundsException;
import com.ledgerline.exception.ResourceNotFoundException;
import com.ledgerline.repository.AccountMemberRepository;
import com.ledgerline.repository.AccountRepository;
import com.ledgerline.repository.JournalRepository;
import com.ledgerline.repository.LedgerEntryRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class PostingService {

    public static final Long EXTERNAL_ACCOUNT_ID = 1L;

    private final AccountRepository accountRepository;
    private final AccountMemberRepository accountMemberRepository;
    private final JournalRepository journalRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AttemptLoggingService attemptLoggingService;
    private final HashService hashService;
    private final FlagService flagService;

    public PostingService(
            AccountRepository accountRepository,
            AccountMemberRepository accountMemberRepository,
            JournalRepository journalRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AttemptLoggingService attemptLoggingService,
            HashService hashService,
            FlagService flagService) {
        this.accountRepository = accountRepository;
        this.accountMemberRepository = accountMemberRepository;
        this.journalRepository = journalRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.attemptLoggingService = attemptLoggingService;
        this.hashService = hashService;
        this.flagService = flagService;
    }

    /**
     * Executes an internal transfer between two accounts.
     * Concurrency: Locks accounts in strictly ascending ID order to prevent deadlocks.
     * Rollback Safety: Refused attempts are recorded via REQUIRES_NEW and survive rollback.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PostingResponse transfer(TransferRequest request, User user, String idempotencyKey) {
        validateWriteAuthorization(user);

        Long sourceId = request.getSourceAccountId();
        Long destinationId = resolveDestinationAccountId(request);

        if (sourceId.equals(destinationId)) {
            attemptLoggingService.logRefusal(
                    sourceId, user.getId(), JournalKind.TRANSFER, request.getAmount(),
                    "Cannot transfer funds to the same account", idempotencyKey
            );
            throw new IllegalArgumentException("Source and destination accounts must be distinct");
        }

        // Pessimistic locking in strictly ascending ID order to eliminate deadlock cycles
        Long firstId = Math.min(sourceId, destinationId);
        Long secondId = Math.max(sourceId, destinationId);

        Account firstAccount = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + firstId));
        Account secondAccount = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + secondId));

        Account sourceAccount = sourceId.equals(firstId) ? firstAccount : secondAccount;
        Account destinationAccount = destinationId.equals(firstId) ? firstAccount : secondAccount;

        // Entitlement check on source account (debit source) under row lock
        validateDebitEntitlement(sourceAccount, user, request.getAmount(), idempotencyKey, JournalKind.TRANSFER);

        // Verify account statuses under lock
        if (sourceAccount.getStatus() != AccountStatus.ACTIVE) {
            attemptLoggingService.logRefusal(
                    sourceId, user.getId(), JournalKind.TRANSFER, request.getAmount(),
                    "Source account is " + sourceAccount.getStatus(), idempotencyKey
            );
            throw new AccountFrozenException("Source account is " + sourceAccount.getStatus());
        }

        if (destinationAccount.getStatus() != AccountStatus.ACTIVE) {
            attemptLoggingService.logRefusal(
                    sourceId, user.getId(), JournalKind.TRANSFER, request.getAmount(),
                    "Destination account is " + destinationAccount.getStatus(), idempotencyKey
            );
            throw new AccountFrozenException("Destination account is " + destinationAccount.getStatus());
        }

        // Verify balance under lock
        long sourceBalance = sourceAccount.getBalance();
        long overdraftLimit = sourceAccount.getOverdraftLimit();
        long amount = request.getAmount();

        if (sourceBalance - amount < -overdraftLimit) {
            LedgerAttempt attempt = attemptLoggingService.logRefusal(
                    sourceId, user.getId(), JournalKind.TRANSFER, amount,
                    "Insufficient funds (Balance: " + sourceBalance + " paise, Required: " + amount + " paise)", idempotencyKey
            );
            flagService.evaluateRefusalFlags(attempt.getId(), sourceId, user.getId());
            throw new InsufficientFundsException(
                    "Insufficient funds. Current balance: " + formatPaise(sourceBalance) + ", overdraft limit: " + formatPaise(overdraftLimit)
            );
        }

        // Record Journal
        Journal journal = Journal.builder()
                .kind(JournalKind.TRANSFER)
                .initiatedBy(user.getId())
                .reason(request.getReason())
                .build();
        journal = journalRepository.save(journal);

        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

        // 1. Debit Source Account (reduces balance)
        long newSourceBalance = sourceBalance - amount;
        sourceAccount.setBalance(newSourceBalance);
        accountRepository.save(sourceAccount);

        String srcPrevHash = getLatestHash(sourceAccount.getId());
        String srcHash = hashService.calculateEntryHash(
                srcPrevHash, sourceAccount.getId(), journal.getId(), EntryDirection.DEBIT, amount, newSourceBalance, now
        );

        LedgerEntry debitEntry = LedgerEntry.builder()
                .journalId(journal.getId())
                .accountId(sourceAccount.getId())
                .direction(EntryDirection.DEBIT)
                .amount(amount)
                .balanceAfter(newSourceBalance)
                .prevHash(srcPrevHash)
                .hash(srcHash)
                .createdAt(now)
                .build();
        ledgerEntryRepository.save(debitEntry);

        // 2. Credit Destination Account (increases balance)
        long newDestBalance = destinationAccount.getBalance() + amount;
        destinationAccount.setBalance(newDestBalance);
        accountRepository.save(destinationAccount);

        String dstPrevHash = getLatestHash(destinationAccount.getId());
        String dstHash = hashService.calculateEntryHash(
                dstPrevHash, destinationAccount.getId(), journal.getId(), EntryDirection.CREDIT, amount, newDestBalance, now
        );

        LedgerEntry creditEntry = LedgerEntry.builder()
                .journalId(journal.getId())
                .accountId(destinationAccount.getId())
                .direction(EntryDirection.CREDIT)
                .amount(amount)
                .balanceAfter(newDestBalance)
                .prevHash(dstPrevHash)
                .hash(dstHash)
                .createdAt(now)
                .build();
        ledgerEntryRepository.save(creditEntry);

        // Record posted attempt
        attemptLoggingService.logPosted(
                sourceId, user.getId(), JournalKind.TRANSFER, amount,
                journal.getId(), "Transfer completed successfully", idempotencyKey
        );

        return PostingResponse.builder()
                .journalId(journal.getId())
                .kind(JournalKind.TRANSFER)
                .amount(amount)
                .sourceAccountId(sourceId)
                .destinationAccountId(destinationId)
                .status("POSTED")
                .message("Transfer posted successfully")
                .sourceBalanceAfter(newSourceBalance)
                .destinationBalanceAfter(newDestBalance)
                .createdAt(now)
                .build();
    }

    /**
     * Ingests external funds into a customer account.
     * Double-entry: Debits EXTERNAL system account, Credits customer account.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PostingResponse deposit(DepositRequest request, User user, String idempotencyKey) {
        validateWriteAuthorization(user);

        Long accountId = request.getAccountId();

        // Ordered lock: EXTERNAL (ID 1) first, then Customer account
        Long firstId = Math.min(EXTERNAL_ACCOUNT_ID, accountId);
        Long secondId = Math.max(EXTERNAL_ACCOUNT_ID, accountId);

        Account firstAccount = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + firstId));
        Account secondAccount = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + secondId));

        Account externalAccount = EXTERNAL_ACCOUNT_ID.equals(firstId) ? firstAccount : secondAccount;
        Account customerAccount = accountId.equals(firstId) ? firstAccount : secondAccount;

        validateAccountOwnershipOrAdmin(customerAccount, user);

        if (customerAccount.getStatus() != AccountStatus.ACTIVE) {
            attemptLoggingService.logRefusal(
                    accountId, user.getId(), JournalKind.DEPOSIT, request.getAmount(),
                    "Target account is " + customerAccount.getStatus(), idempotencyKey
            );
            throw new AccountFrozenException("Account is " + customerAccount.getStatus());
        }

        long amount = request.getAmount();

        Journal journal = Journal.builder()
                .kind(JournalKind.DEPOSIT)
                .initiatedBy(user.getId())
                .reason(request.getReason())
                .build();
        journal = journalRepository.save(journal);

        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

        // 1. Debit EXTERNAL System Account
        long newExternalBalance = externalAccount.getBalance() - amount;
        externalAccount.setBalance(newExternalBalance);
        accountRepository.save(externalAccount);

        String extPrevHash = getLatestHash(externalAccount.getId());
        String extHash = hashService.calculateEntryHash(
                extPrevHash, externalAccount.getId(), journal.getId(), EntryDirection.DEBIT, amount, newExternalBalance, now
        );

        LedgerEntry extEntry = LedgerEntry.builder()
                .journalId(journal.getId())
                .accountId(externalAccount.getId())
                .direction(EntryDirection.DEBIT)
                .amount(amount)
                .balanceAfter(newExternalBalance)
                .prevHash(extPrevHash)
                .hash(extHash)
                .createdAt(now)
                .build();
        ledgerEntryRepository.save(extEntry);

        // 2. Credit Customer Account
        long newCustomerBalance = customerAccount.getBalance() + amount;
        customerAccount.setBalance(newCustomerBalance);
        accountRepository.save(customerAccount);

        String custPrevHash = getLatestHash(customerAccount.getId());
        String custHash = hashService.calculateEntryHash(
                custPrevHash, customerAccount.getId(), journal.getId(), EntryDirection.CREDIT, amount, newCustomerBalance, now
        );

        LedgerEntry custEntry = LedgerEntry.builder()
                .journalId(journal.getId())
                .accountId(customerAccount.getId())
                .direction(EntryDirection.CREDIT)
                .amount(amount)
                .balanceAfter(newCustomerBalance)
                .prevHash(custPrevHash)
                .hash(custHash)
                .createdAt(now)
                .build();
        ledgerEntryRepository.save(custEntry);

        attemptLoggingService.logPosted(
                accountId, user.getId(), JournalKind.DEPOSIT, amount,
                journal.getId(), "Deposit posted successfully", idempotencyKey
        );

        return PostingResponse.builder()
                .journalId(journal.getId())
                .kind(JournalKind.DEPOSIT)
                .amount(amount)
                .sourceAccountId(EXTERNAL_ACCOUNT_ID)
                .destinationAccountId(accountId)
                .status("POSTED")
                .message("Deposit completed successfully")
                .sourceBalanceAfter(newExternalBalance)
                .destinationBalanceAfter(newCustomerBalance)
                .createdAt(now)
                .build();
    }

    /**
     * Withdraws funds from a customer account to the external world.
     * Double-entry: Debits customer account, Credits EXTERNAL system account.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PostingResponse withdraw(WithdrawalRequest request, User user, String idempotencyKey) {
        validateWriteAuthorization(user);

        Long accountId = request.getAccountId();

        // Ordered lock: EXTERNAL (ID 1) first, then Customer account
        Long firstId = Math.min(EXTERNAL_ACCOUNT_ID, accountId);
        Long secondId = Math.max(EXTERNAL_ACCOUNT_ID, accountId);

        Account firstAccount = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + firstId));
        Account secondAccount = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + secondId));

        Account externalAccount = EXTERNAL_ACCOUNT_ID.equals(firstId) ? firstAccount : secondAccount;
        Account customerAccount = accountId.equals(firstId) ? firstAccount : secondAccount;

        validateDebitEntitlement(customerAccount, user, request.getAmount(), idempotencyKey, JournalKind.WITHDRAWAL);

        if (customerAccount.getStatus() != AccountStatus.ACTIVE) {
            attemptLoggingService.logRefusal(
                    accountId, user.getId(), JournalKind.WITHDRAWAL, request.getAmount(),
                    "Account is " + customerAccount.getStatus(), idempotencyKey
            );
            throw new AccountFrozenException("Account is " + customerAccount.getStatus());
        }

        long balance = customerAccount.getBalance();
        long overdraftLimit = customerAccount.getOverdraftLimit();
        long amount = request.getAmount();

        if (balance - amount < -overdraftLimit) {
            LedgerAttempt attempt = attemptLoggingService.logRefusal(
                    accountId, user.getId(), JournalKind.WITHDRAWAL, amount,
                    "Insufficient funds (Balance: " + balance + " paise, Required: " + amount + " paise)", idempotencyKey
            );
            flagService.evaluateRefusalFlags(attempt.getId(), accountId, user.getId());
            throw new InsufficientFundsException(
                    "Insufficient funds. Current balance: " + formatPaise(balance) + ", overdraft limit: " + formatPaise(overdraftLimit)
            );
        }

        Journal journal = Journal.builder()
                .kind(JournalKind.WITHDRAWAL)
                .initiatedBy(user.getId())
                .reason(request.getReason())
                .build();
        journal = journalRepository.save(journal);

        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

        // 1. Debit Customer Account
        long newCustomerBalance = balance - amount;
        customerAccount.setBalance(newCustomerBalance);
        accountRepository.save(customerAccount);

        String custPrevHash = getLatestHash(customerAccount.getId());
        String custHash = hashService.calculateEntryHash(
                custPrevHash, customerAccount.getId(), journal.getId(), EntryDirection.DEBIT, amount, newCustomerBalance, now
        );

        LedgerEntry custEntry = LedgerEntry.builder()
                .journalId(journal.getId())
                .accountId(customerAccount.getId())
                .direction(EntryDirection.DEBIT)
                .amount(amount)
                .balanceAfter(newCustomerBalance)
                .prevHash(custPrevHash)
                .hash(custHash)
                .createdAt(now)
                .build();
        ledgerEntryRepository.save(custEntry);

        // 2. Credit EXTERNAL System Account
        long newExternalBalance = externalAccount.getBalance() + amount;
        externalAccount.setBalance(newExternalBalance);
        accountRepository.save(externalAccount);

        String extPrevHash = getLatestHash(externalAccount.getId());
        String extHash = hashService.calculateEntryHash(
                extPrevHash, externalAccount.getId(), journal.getId(), EntryDirection.CREDIT, amount, newExternalBalance, now
        );

        LedgerEntry extEntry = LedgerEntry.builder()
                .journalId(journal.getId())
                .accountId(externalAccount.getId())
                .direction(EntryDirection.CREDIT)
                .amount(amount)
                .balanceAfter(newExternalBalance)
                .prevHash(extPrevHash)
                .hash(extHash)
                .createdAt(now)
                .build();
        ledgerEntryRepository.save(extEntry);

        attemptLoggingService.logPosted(
                accountId, user.getId(), JournalKind.WITHDRAWAL, amount,
                journal.getId(), "Withdrawal posted successfully", idempotencyKey
        );

        return PostingResponse.builder()
                .journalId(journal.getId())
                .kind(JournalKind.WITHDRAWAL)
                .amount(amount)
                .sourceAccountId(accountId)
                .destinationAccountId(EXTERNAL_ACCOUNT_ID)
                .status("POSTED")
                .message("Withdrawal completed successfully")
                .sourceBalanceAfter(newCustomerBalance)
                .destinationBalanceAfter(newExternalBalance)
                .createdAt(now)
                .build();
    }

    private Long resolveDestinationAccountId(TransferRequest request) {
        if (request.getDestinationAccountId() != null) {
            return request.getDestinationAccountId();
        }
        if (request.getDestinationAccountNumber() != null) {
            return accountRepository.findByNumber(request.getDestinationAccountNumber().trim())
                    .map(Account::getId)
                    .orElseThrow(() -> new ResourceNotFoundException("Destination account not found with number: " + request.getDestinationAccountNumber()));
        }
        throw new IllegalArgumentException("Destination account ID or number is required");
    }

    private void validateWriteAuthorization(User user) {
        if (user.getRole() == Role.AUDITOR) {
            throw new AccessDeniedException("Auditor role has read-only permissions; write operations are strictly prohibited.");
        }
    }

    private void validateDebitEntitlement(Account account, User user, Long amount, String idempotencyKey, JournalKind kind) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }

        Long accountId = account.getId();
        boolean isOwner = account.getOwnerId().equals(user.getId());
        boolean isMember = accountMemberRepository.existsByUserIdAndAccountId(user.getId(), accountId);

        if (!isOwner && !isMember) {
            // Log refusal attempt in REQUIRES_NEW
            attemptLoggingService.logRefusal(
                    accountId, user.getId(), kind, amount,
                    "Unauthorized debit attempt on unentitled account", idempotencyKey
            );
            // Return 404 (not 403) to prevent account enumeration
            throw new ResourceNotFoundException("Account not found with ID: " + accountId);
        }
    }

    private void validateAccountOwnershipOrAdmin(Account account, User user) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }

        Long accountId = account.getId();
        boolean isOwner = account.getOwnerId().equals(user.getId());
        boolean isMember = accountMemberRepository.existsByUserIdAndAccountId(user.getId(), accountId);

        if (!isOwner && !isMember) {
            throw new ResourceNotFoundException("Account not found with ID: " + accountId);
        }
    }

    private String getLatestHash(Long accountId) {
        return ledgerEntryRepository.findLatestByAccountId(accountId)
                .map(LedgerEntry::getHash)
                .orElse(null);
    }

    private String formatPaise(long paise) {
        return "₹" + String.format("%.2f", paise / 100.0);
    }
}
