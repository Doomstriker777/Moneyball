package com.ledgerline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(IdempotencyKey.IdempotencyKeyId.class)
public class IdempotencyKey {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "key", nullable = false, length = 128)
    private String key;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IdempotencyStatus status;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "journal_id")
    private Long journalId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IdempotencyKeyId implements Serializable {
        private Long userId;
        private String key;
    }
}

