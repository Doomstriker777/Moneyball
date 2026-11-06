package com.ledgerline.service;

import com.ledgerline.domain.AttemptOutcome;
import com.ledgerline.domain.JournalKind;
import com.ledgerline.domain.LedgerAttempt;
import com.ledgerline.repository.LedgerAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttemptLoggingService {

    private final LedgerAttemptRepository ledgerAttemptRepository;

    public AttemptLoggingService(LedgerAttemptRepository ledgerAttemptRepository) {
        this.ledgerAttemptRepository = ledgerAttemptRepository;
    }

    /**
     * Records a refused attempt in an independent transaction (REQUIRES_NEW).
     * Guaranteed to persist and survive even when the main posting transaction rolls back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public LedgerAttempt logRefusal(
            Long accountId,
            Long userId,
            JournalKind kind,
            Long amount,
            String reason,
            String idempotencyKey) {

        LedgerAttempt attempt = LedgerAttempt.builder()
                .accountId(accountId)
                .userId(userId)
                .kind(kind)
                .amount(amount != null ? amount : 0L)
                .outcome(AttemptOutcome.REFUSED)
                .reason(reason)
                .journalId(null)
                .idempotencyKey(idempotencyKey)
                .build();

        return ledgerAttemptRepository.save(attempt);
    }

    /**
     * Records a posted attempt within the SAME transaction as the journal.
     * Guarantees atomic foreign-key referencing to the newly inserted journal.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public LedgerAttempt logPosted(
            Long accountId,
            Long userId,
            JournalKind kind,
            Long amount,
            Long journalId,
            String reason,
            String idempotencyKey) {

        LedgerAttempt attempt = LedgerAttempt.builder()
                .accountId(accountId)
                .userId(userId)
                .kind(kind)
                .amount(amount != null ? amount : 0L)
                .outcome(AttemptOutcome.POSTED)
                .reason(reason)
                .journalId(journalId)
                .idempotencyKey(idempotencyKey)
                .build();

        return ledgerAttemptRepository.save(attempt);
    }

    /**
     * Records a replayed idempotent request.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public LedgerAttempt logReplayed(
            Long accountId,
            Long userId,
            JournalKind kind,
            Long amount,
            Long journalId,
            String idempotencyKey) {

        LedgerAttempt attempt = LedgerAttempt.builder()
                .accountId(accountId)
                .userId(userId)
                .kind(kind)
                .amount(amount != null ? amount : 0L)
                .outcome(AttemptOutcome.REPLAYED)
                .reason("Request replayed using existing idempotency key")
                .journalId(journalId)
                .idempotencyKey(idempotencyKey)
                .build();

        return ledgerAttemptRepository.save(attempt);
    }
}
