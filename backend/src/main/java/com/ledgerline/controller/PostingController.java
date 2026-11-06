package com.ledgerline.controller;

import com.ledgerline.domain.User;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.PostingResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.security.UserPrincipal;
import com.ledgerline.service.PostingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Money Operations", description = "Endpoints for deposits, withdrawals, and internal transfers")
public class PostingController {

    private final PostingService postingService;

    public PostingController(PostingService postingService) {
        this.postingService = postingService;
    }

    @PostMapping("/transfers")
    @Operation(summary = "Transfer funds between accounts", description = "Executes double-entry transfer with deadlock-free ordered row locks. Refused attempts survive rollback.")
    public ResponseEntity<PostingResponse> transfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = idempotencyKey != null ? idempotencyKey : UUID.randomUUID().toString();
        PostingResponse response = postingService.transfer(request, user, effectiveKey);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/deposits")
    @Operation(summary = "Deposit external funds", description = "Ingests simulated external capital into customer account. Debits EXTERNAL, credits customer.")
    public ResponseEntity<PostingResponse> deposit(
            @Valid @RequestBody DepositRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = idempotencyKey != null ? idempotencyKey : UUID.randomUUID().toString();
        PostingResponse response = postingService.deposit(request, user, effectiveKey);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdrawals")
    @Operation(summary = "Withdraw funds", description = "Withdraws funds from customer account to outside world. Debits customer, credits EXTERNAL.")
    public ResponseEntity<PostingResponse> withdraw(
            @Valid @RequestBody WithdrawalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        String effectiveKey = idempotencyKey != null ? idempotencyKey : UUID.randomUUID().toString();
        PostingResponse response = postingService.withdraw(request, user, effectiveKey);
        return ResponseEntity.ok(response);
    }
}
