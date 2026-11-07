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
public class ReconciliationReport {
    private String status; // "BALANCED" or "DISCREPANCY"
    private boolean conservationHolds; // true if systemSum == 0
    private Long systemSum; // in paise, should be 0
    private Long totalCustomerBalance; // in paise
    private Long externalAccountBalance; // in paise
    private int totalAccountsScanned;
    private int totalJournalsScanned;
    private List<DiscrepancyItem> discrepancies;
    private Instant timestamp;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscrepancyItem {
        private Long accountId;
        private String accountNumber;
        private Long cachedBalance;
        private Long recalculatedBalance;
        private Long difference;
    }
}
