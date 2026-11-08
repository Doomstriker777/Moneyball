package com.ledgerline.controller;

import com.ledgerline.domain.Flag;
import com.ledgerline.domain.FlagStatus;
import com.ledgerline.domain.User;
import com.ledgerline.dto.FlagReviewRequest;
import com.ledgerline.dto.HashChainVerificationReport;
import com.ledgerline.dto.ReconciliationReport;
import com.ledgerline.security.UserPrincipal;
import com.ledgerline.service.FlagService;
import com.ledgerline.service.ReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit & Compliance", description = "Endpoints for reconciliation, cryptographic hash chain verification, and compliance flag reviews")
public class AuditController {

    private final ReconciliationService reconciliationService;
    private final FlagService flagService;

    public AuditController(
            ReconciliationService reconciliationService,
            FlagService flagService) {
        this.reconciliationService = reconciliationService;
        this.flagService = flagService;
    }

    @GetMapping({"/reconciliation", "/reconcile"})
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    @Operation(summary = "Recompute ledger balances and assert conservation",
               description = "Recomputes all balances from raw ledger entries, compares against cached balances, and verifies system sum is 0.")
    public ResponseEntity<ReconciliationReport> getReconciliation() {
        ReconciliationReport report = reconciliationService.performReconciliation();
        return ResponseEntity.ok(report);
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('AUDITOR')")
    @Operation(summary = "Export complete audit pack",
               description = "Exports all ledger entries, attempts, flags, verification reports, and offline verification instructions for regulatory audit.")
    public ResponseEntity<com.ledgerline.dto.AuditPackResponse> exportAuditPack(
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal != null ? principal.getUser() : null;
        com.ledgerline.dto.AuditPackResponse pack = reconciliationService.exportAuditPack(user);
        return ResponseEntity.ok(pack);
    }

    @GetMapping("/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    @Operation(summary = "Verify cryptographic SHA-256 hash chains",
               description = "Traverses all account entry chains from genesis to tip, verifying link continuity and payload hashes.")
    public ResponseEntity<HashChainVerificationReport> verifyHashChains() {
        HashChainVerificationReport report = reconciliationService.verifyHashChain();
        return ResponseEntity.ok(report);
    }

    @GetMapping("/flags")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    @Operation(summary = "List compliance & anomaly flags",
               description = "Lists rule-based flags (large amounts, velocity limits, structuring, repeated refusals).")
    public ResponseEntity<List<Flag>> getFlags(@RequestParam(required = false) FlagStatus status) {
        List<Flag> flags = flagService.getFlags(status);
        return ResponseEntity.ok(flags);
    }

    @PostMapping("/flags/{id}/review")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Submit human review for compliance flag",
               description = "Records administrator review note and transitions flag to REVIEWED status.")
    public ResponseEntity<Flag> reviewFlag(
            @PathVariable Long id,
            @Valid @RequestBody FlagReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        Flag reviewed = flagService.reviewFlag(id, request, user);
        return ResponseEntity.ok(reviewed);
    }
}
