package com.ledgerline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String number;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountType type;

    /**
     * Running balance in paise (BIGINT).
     * Invariant: across all accounts including SYSTEM (EXTERNAL), SUM(balance) == 0.
     */
    @Column(nullable = false)
    @Builder.Default
    private Long balance = 0L;

    /**
     * Overdraft limit in paise (BIGINT, >= 0). Default is 0.
     * Enforced by DB constraint: type = 'SYSTEM' OR balance >= -overdraft_limit.
     */
    @Column(name = "overdraft_limit", nullable = false)
    @Builder.Default
    private Long overdraftLimit = 0L;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AccountStatus status = AccountStatus.ACTIVE;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}

