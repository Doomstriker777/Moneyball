package com.ledgerline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "flags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Flag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "journal_id")
    private Long journalId;

    @Column(name = "attempt_id")
    private Long attemptId;

    @Column(nullable = false, length = 64)
    private String rule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FlagSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FlagStatus status = FlagStatus.OPEN;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}

