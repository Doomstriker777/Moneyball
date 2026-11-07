package com.ledgerline.controller;

import com.ledgerline.domain.JournalKind;
import com.ledgerline.domain.User;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.PostingResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.security.UserPrincipal;
import com.ledgerline.service.FlagService;
import com.ledgerline.service.IdempotencyService;
import com.ledgerline.service.PostingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Money Operations", description = "Endpoints for deposits, withdrawals, and internal transfers")
public class PostingController {

    private final PostingService postingService;
    private final IdempotencyService idempotencyService;
    private final FlagService flagService;

    public PostingController(
            PostingService postingService,
            IdempotencyService idempotencyService,
            FlagService flagService) {
        this.postingService = postingService;
        this.idempotencyService = idempotencyService;
        this.flagService = flagService;
    }

    @PostMapping("/transfers")
    @Operation(summary = "Transfer funds between accounts",
               description = "Atomic double-entry transfer with ordered row locks and idempotency protection.")
    public ResponseEntity<PostingResponse> transfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = (idempotencyKey != null && !idempotencyKey.isBlank()) ?
                idempotencyKey.trim() : UUID.randomUUID().toString();

        Optional<PostingResponse> replay = idempotencyService.acquireOrGetReplay(
                effectiveKey, user, request, JournalKind.TRANSFER, PostingResponse.class
        );
        if (replay.isPresent()) {
            return ResponseEntity.ok(replay.get());
        }

        PostingResponse response = executeWithRetry(() -> postingService.transfer(request, user, effectiveKey));
        idempotencyService.complete(effectiveKey, user, response, response.getJournalId());
        flagService.evaluatePostingFlags(response.getJournalId(), response.getSourceAccountId(), user.getId(), request.getAmount(), JournalKind.TRANSFER);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/deposits")
    @Operation(summary = "Deposit external funds",
               description = "Ingests simulated external capital into customer account. Debits EXTERNAL, credits customer.")
    public ResponseEntity<PostingResponse> deposit(
            @Valid @RequestBody DepositRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = (idempotencyKey != null && !idempotencyKey.isBlank()) ?
                idempotencyKey.trim() : UUID.randomUUID().toString();

        Optional<PostingResponse> replay = idempotencyService.acquireOrGetReplay(
                effectiveKey, user, request, JournalKind.DEPOSIT, PostingResponse.class
        );
        if (replay.isPresent()) {
            return ResponseEntity.ok(replay.get());
        }

        PostingResponse response = executeWithRetry(() -> postingService.deposit(request, user, effectiveKey));
        idempotencyService.complete(effectiveKey, user, response, response.getJournalId());
        flagService.evaluatePostingFlags(response.getJournalId(), response.getDestinationAccountId(), user.getId(), request.getAmount(), JournalKind.DEPOSIT);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdrawals")
    @Operation(summary = "Withdraw funds",
               description = "Withdraws funds from customer account to outside world. Debits customer, credits EXTERNAL.")
    public ResponseEntity<PostingResponse> withdraw(
            @Valid @RequestBody WithdrawalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = (idempotencyKey != null && !idempotencyKey.isBlank()) ?
                idempotencyKey.trim() : UUID.randomUUID().toString();

        Optional<PostingResponse> replay = idempotencyService.acquireOrGetReplay(
                effectiveKey, user, request, JournalKind.WITHDRAWAL, PostingResponse.class
        );
        if (replay.isPresent()) {
            return ResponseEntity.ok(replay.get());
        }

        PostingResponse response = executeWithRetry(() -> postingService.withdraw(request, user, effectiveKey));
        idempotencyService.complete(effectiveKey, user, response, response.getJournalId());
        flagService.evaluatePostingFlags(response.getJournalId(), response.getSourceAccountId(), user.getId(), request.getAmount(), JournalKind.WITHDRAWAL);

        return ResponseEntity.ok(response);
    }

    private <T> T executeWithRetry(java.util.function.Supplier<T> operation) {
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return operation.get();
            } catch (org.springframework.dao.ConcurrencyFailureException |
                     org.springframework.transaction.TransactionException e) {
                if (attempt == maxRetries) {
                    throw e;
                }
                try {
                    long backoff = (1L << attempt) * 10L + java.util.concurrent.ThreadLocalRandom.current().nextLong(25);
                    Thread.sleep(backoff);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
        throw new IllegalStateException("Unexpected retry loop termination");
    }
}
