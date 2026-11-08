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
public class TransactionLogResponse {
    private Long journalId;
    private Long entryId;
    private Long accountId;
    private String accountNumber;
    private JournalKind kind;
    private String direction;
    private Long amount; // in paise
    private Long balanceAfter; // in paise
    private String reason;
    private Long counterpartyAccountId;
    private String counterpartyAccountNumber;
    private String hash;
    private Instant createdAt;
}

