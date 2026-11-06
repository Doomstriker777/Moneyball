package com.ledgerline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ledger_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "journal_id", nullable = false)
    private Long journalId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EntryDirection direction;

    /**
     * Amount in paise (BIGINT, strictly > 0).
     */
    @Column(nullable = false)
    private Long amount;

    /**
     * Account balance immediately after this entry was posted.
     */
    @Column(name = "balance_after", nullable = false)
    private Long balanceAfter;

    @Column(name = "prev_hash", length = 64)
    private String prevHash;

    @Column(nullable = false, length = 64)
    private String hash;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}

