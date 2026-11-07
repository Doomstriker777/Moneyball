package com.ledgerline.dto;

import com.ledgerline.domain.AttemptOutcome;
import com.ledgerline.domain.EntryDirection;
import com.ledgerline.domain.JournalKind;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatementItemResponse {
    private Long id;
    private Long journalId;
    private String itemType; // "ENTRY" or "ATTEMPT"
    private JournalKind kind;
    private EntryDirection direction;
    private Long amount; // in paise
    private Long balanceAfter; // in paise
    private AttemptOutcome outcome; // POSTED, REFUSED, REPLAYED
    private String reason;
    private String hash;
    private String prevHash;
    private Instant createdAt;
}

