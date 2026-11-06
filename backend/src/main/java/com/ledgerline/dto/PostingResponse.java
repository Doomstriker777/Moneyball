package com.ledgerline.dto;

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
public class PostingResponse {
    private Long journalId;
    private JournalKind kind;
    private Long amount; // in paise
    private Long sourceAccountId;
    private Long destinationAccountId;
    private String status; // "POSTED"
    private String message;
    private Long sourceBalanceAfter;
    private Long destinationBalanceAfter;
    private Instant createdAt;
}
