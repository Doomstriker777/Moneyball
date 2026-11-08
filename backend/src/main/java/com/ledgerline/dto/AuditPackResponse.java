package com.ledgerline.dto;

import com.ledgerline.domain.Flag;
import com.ledgerline.domain.LedgerAttempt;
import com.ledgerline.domain.LedgerEntry;
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
public class AuditPackResponse {
    private String system;
    private String exportVersion;
    private Instant exportedAt;
    private String exportedBy;
    private ReconciliationReport reconciliation;
    private HashChainVerificationReport hashVerification;
    private List<AccountResponse> accounts;
    private List<LedgerEntry> ledgerEntries;
    private List<LedgerAttempt> ledgerAttempts;
    private List<Flag> complianceFlags;
    private String offlineVerificationInstructions;
}
