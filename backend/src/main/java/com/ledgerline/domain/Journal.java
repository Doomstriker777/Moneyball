package com.ledgerline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "journals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Journal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JournalKind kind;

    @Column(name = "initiated_by", nullable = false)
    private Long initiatedBy;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "reversal_of", unique = true)
    private Long reversalOf;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}

