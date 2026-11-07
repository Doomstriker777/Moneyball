package com.ledgerline.controller;

import com.ledgerline.domain.JournalKind;
import com.ledgerline.domain.User;
import com.ledgerline.dto.PostingResponse;
import com.ledgerline.dto.ReversalRequest;
import com.ledgerline.security.UserPrincipal;
import com.ledgerline.service.IdempotencyService;
import com.ledgerline.service.ReversalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/reversals")
@Tag(name = "Reversals", description = "Endpoints for immutable journal corrections by administrators")
public class ReversalController {

    private final ReversalService reversalService;
    private final IdempotencyService idempotencyService;

    public ReversalController(
            ReversalService reversalService,
            IdempotencyService idempotencyService) {
        this.reversalService = reversalService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping("/{journalId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Post equal-and-opposite reversal journal",
               description = "Inverts original journal entries with ordered account locks. Reversal is enforced unique per journal.")
    public ResponseEntity<PostingResponse> reverse(
            @PathVariable Long journalId,
            @Valid @RequestBody ReversalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = (idempotencyKey != null && !idempotencyKey.isBlank()) ?
                idempotencyKey.trim() : UUID.randomUUID().toString();

        Optional<PostingResponse> replay = idempotencyService.acquireOrGetReplay(
                effectiveKey, user, request, JournalKind.REVERSAL, PostingResponse.class
        );
        if (replay.isPresent()) {
            return ResponseEntity.ok(replay.get());
        }

        PostingResponse response = reversalService.reverseJournal(journalId, request, user, effectiveKey);
        idempotencyService.complete(effectiveKey, user, response, response.getJournalId());
        return ResponseEntity.ok(response);
    }
}
