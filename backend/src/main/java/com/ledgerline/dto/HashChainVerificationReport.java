package com.ledgerline.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HashChainVerificationReport {
    private String status; // "VERIFIED" or "BROKEN"
    private boolean valid;
    private int totalEntriesScanned;
    private int totalAccountsScanned;
    private Long firstBrokenEntryId;
    private Long brokenAccountId;
    private String failureReason;
    private Instant timestamp;
}
