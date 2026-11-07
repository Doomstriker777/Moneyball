package com.ledgerline.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.domain.IdempotencyKey;
import com.ledgerline.domain.IdempotencyStatus;
import com.ledgerline.domain.JournalKind;
import com.ledgerline.domain.User;
import com.ledgerline.exception.IdempotencyConflictException;
import com.ledgerline.exception.IdempotencyPayloadMismatchException;
import com.ledgerline.repository.IdempotencyKeyRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class IdempotencyService {

    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final AttemptLoggingService attemptLoggingService;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public IdempotencyService(
            IdempotencyKeyRepository idempotencyKeyRepository,
            AttemptLoggingService attemptLoggingService,
            EntityManager entityManager,
            ObjectMapper objectMapper) {
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.attemptLoggingService = attemptLoggingService;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    public String computeRequestHash(Object request) {
        try {
            String json = objectMapper.writeValueAsString(request);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new IllegalStateException("Failed to calculate request payload hash", e);
        }
    }

    /**
     * Attempts to atomically insert an idempotency key with status IN_PROGRESS.
     * Returns Optional.empty() if this is a brand new request (proceed with processing).
     * Returns Optional.of(storedResponse) if this is an idempotent replay of a completed request.
     * Throws 409 Conflict if request is currently in progress.
     * Throws 422 Unprocessable Entity if key was reused with a different request payload.
     */
    @Transactional
    public <T> Optional<T> acquireOrGetReplay(
            String key,
            User user,
            Object requestObject,
            JournalKind kind,
            Class<T> responseType) {

        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Header 'Idempotency-Key' is required for money-moving operations.");
        }

        String requestHash = computeRequestHash(requestObject);

        // Atomic native SQL insert: ON CONFLICT DO NOTHING
        int rowsInserted = entityManager.createNativeQuery(
                "INSERT INTO idempotency_keys (user_id, key, request_hash, status, created_at) " +
                "VALUES (:userId, :key, :requestHash, 'IN_PROGRESS', CURRENT_TIMESTAMP) " +
                "ON CONFLICT (user_id, key) DO NOTHING"
        )
        .setParameter("userId", user.getId())
        .setParameter("key", key.trim())
        .setParameter("requestHash", requestHash)
        .executeUpdate();

        if (rowsInserted > 0) {
            // Newly inserted; caller proceeds with business logic
            return Optional.empty();
        }

        // Key already exists; inspect existing record
        IdempotencyKey existing = idempotencyKeyRepository.findByUserIdAndKey(user.getId(), key.trim())
                .orElseThrow(() -> new IllegalStateException("Idempotency key was reported conflict but not found"));

        if (!existing.getRequestHash().equals(requestHash)) {
            attemptLoggingService.logRefusal(
                    null, user.getId(), kind, 0L,
                    "Idempotency key payload mismatch for key: " + key, key
            );
            throw new IdempotencyPayloadMismatchException(
                    "Idempotency-Key '" + key + "' was previously submitted with a different request payload."
            );
        }

        if (existing.getStatus() == IdempotencyStatus.IN_PROGRESS) {
            throw new IdempotencyConflictException(
                    "A request with Idempotency-Key '" + key + "' is currently being processed. Please retry shortly.",
                    "1"
            );
        }

        // COMPLETED with identical payload -> Record REPLAYED attempt and return stored response
        attemptLoggingService.logReplayed(
                null, user.getId(), kind, 0L, existing.getJournalId(), key
        );

        try {
            T storedResponse = objectMapper.readValue(existing.getResponseBody(), responseType);
            return Optional.of(storedResponse);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize cached idempotency response", e);
        }
    }

    /**
     * Completes the idempotency record in the same transaction as the journal.
     */
    @Transactional
    public void complete(String key, User user, Object responseObject, Long journalId) {
        if (key == null || key.isBlank()) {
            return;
        }

        try {
            String responseJson = objectMapper.writeValueAsString(responseObject);
            entityManager.createNativeQuery(
                    "UPDATE idempotency_keys " +
                    "SET status = 'COMPLETED', response_status = 200, response_body = :body, journal_id = :journalId " +
                    "WHERE user_id = :userId AND key = :key"
            )
            .setParameter("body", responseJson)
            .setParameter("journalId", journalId)
            .setParameter("userId", user.getId())
            .setParameter("key", key.trim())
            .executeUpdate();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize response body for idempotency record", e);
        }
    }
}

