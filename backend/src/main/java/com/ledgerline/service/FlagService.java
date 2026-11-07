package com.ledgerline.service;

import com.ledgerline.domain.*;
import com.ledgerline.dto.FlagReviewRequest;
import com.ledgerline.exception.ResourceNotFoundException;
import com.ledgerline.repository.FlagRepository;
import com.ledgerline.repository.JournalRepository;
import com.ledgerline.repository.LedgerAttemptRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class FlagService {

    public static final long LARGE_AMOUNT_PAISE_THRESHOLD = 1_000_000L; // ₹10,000.00
    public static final long ROUND_STRUCTURING_PAISE_THRESHOLD = 500_000L; // ₹5,000.00

    private final FlagRepository flagRepository;
    private final JournalRepository journalRepository;
    private final LedgerAttemptRepository ledgerAttemptRepository;

    public FlagService(
            FlagRepository flagRepository,
            JournalRepository journalRepository,
            LedgerAttemptRepository ledgerAttemptRepository) {
        this.flagRepository = flagRepository;
        this.journalRepository = journalRepository;
        this.ledgerAttemptRepository = ledgerAttemptRepository;
    }

    /**
     * Evaluates anti-fraud & compliance rules and persists flags.
     * Runs in a separate transaction so flag recording never breaks money posting.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void evaluatePostingFlags(Long journalId, Long accountId, Long userId, Long amount, JournalKind kind) {
        // Rule 1: Large Amount Alert (>= ₹10,000.00)
        if (amount != null && amount >= LARGE_AMOUNT_PAISE_THRESHOLD) {
            flagRepository.save(Flag.builder()
                    .journalId(journalId)
                    .rule("LARGE_AMOUNT")
                    .severity(FlagSeverity.HIGH)
                    .status(FlagStatus.OPEN)
                    .note("Operation exceeds large amount threshold of ₹10,000.00 (Amount: " + formatPaise(amount) + ")")
                    .build());
        }

        // Rule 2: Round-Number Structuring Alert (Divisible by ₹5,000.00)
        if (amount != null && amount >= ROUND_STRUCTURING_PAISE_THRESHOLD && (amount % ROUND_STRUCTURING_PAISE_THRESHOLD == 0)) {
            flagRepository.save(Flag.builder()
                    .journalId(journalId)
                    .rule("ROUND_STRUCTURING")
                    .severity(FlagSeverity.LOW)
                    .status(FlagStatus.OPEN)
                    .note("Suspicious round amount structuring detected: " + formatPaise(amount))
                    .build());
        }

        // Rule 3: Velocity Limit (More than 5 operations in 1 minute)
        Instant oneMinuteAgo = Instant.now().minus(Duration.ofMinutes(1));
        long recentUserOps = ledgerAttemptRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(a -> a.getCreatedAt().isAfter(oneMinuteAgo))
                .count();

        if (recentUserOps > 5) {
            flagRepository.save(Flag.builder()
                    .journalId(journalId)
                    .rule("VELOCITY_LIMIT")
                    .severity(FlagSeverity.MEDIUM)
                    .status(FlagStatus.OPEN)
                    .note("High velocity alert: user executed " + recentUserOps + " operations within 60 seconds")
                    .build());
        }
    }

    /**
     * Evaluates refusal patterns (Repeated refusals alert).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void evaluateRefusalFlags(Long attemptId, Long accountId, Long userId) {
        if (accountId == null) return;

        Instant tenMinutesAgo = Instant.now().minus(Duration.ofMinutes(10));
        long recentRefusals = ledgerAttemptRepository.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .filter(a -> a.getOutcome() == AttemptOutcome.REFUSED && a.getCreatedAt().isAfter(tenMinutesAgo))
                .count();

        if (recentRefusals >= 3) {
            flagRepository.save(Flag.builder()
                    .attemptId(attemptId)
                    .rule("REPEATED_REFUSALS")
                    .severity(FlagSeverity.HIGH)
                    .status(FlagStatus.OPEN)
                    .note("Account has accumulated " + recentRefusals + " failed or refused attempts within 10 minutes")
                    .build());
        }
    }

    @Transactional(readOnly = true)
    public List<Flag> getFlags(FlagStatus status) {
        if (status != null) {
            return flagRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return flagRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();
    }

    @Transactional
    public Flag reviewFlag(Long flagId, FlagReviewRequest request, User reviewer) {
        if (reviewer.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only Administrators can review compliance flags");
        }

        Flag flag = flagRepository.findById(flagId)
                .orElseThrow(() -> new ResourceNotFoundException("Flag not found with ID: " + flagId));

        flag.setStatus(FlagStatus.REVIEWED);
        flag.setReviewedBy(reviewer.getId());
        flag.setNote(request.getNote() != null ? request.getNote() : "Compliance review completed");

        return flagRepository.save(flag);
    }

    private String formatPaise(long paise) {
        return "₹" + String.format("%.2f", paise / 100.0);
    }
}

