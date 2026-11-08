package com.ledgerline.controller;

import com.ledgerline.domain.User;
import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.StatementResponse;
import com.ledgerline.security.UserPrincipal;
import com.ledgerline.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@Tag(name = "Accounts", description = "Endpoints for inspecting accounts and ruled-ledger statements")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    @Operation(summary = "List accessible accounts", description = "Returns accounts owned by or accessible to the caller. Admin and Auditor view all accounts.")
    public ResponseEntity<List<AccountResponse>> getAccounts(@AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        List<AccountResponse> accounts = accountService.getAccountsForUser(user);
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get account details by ID", description = "Returns account details. Unentitled accounts return 404 to avoid enumeration.")
    public ResponseEntity<AccountResponse> getAccountById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        AccountResponse response = accountService.getAccountById(id, user);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/statement")
    @Operation(summary = "Get ruled-ledger statement", description = "Returns posted entries merged with refused and replayed attempts in chronological order with balance after each entry.")
    public ResponseEntity<StatementResponse> getStatement(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        StatementResponse response = accountService.getStatement(id, user);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Freeze or unfreeze account", description = "Updates account status to ACTIVE or FROZEN. Admin only.")
    public ResponseEntity<AccountResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam com.ledgerline.domain.AccountStatus status,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        AccountResponse response = accountService.updateStatus(id, status, user);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/overdraft-limit")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Set overdraft limit", description = "Sets overdraft limit in paise. Admin only.")
    public ResponseEntity<AccountResponse> updateOverdraftLimit(
            @PathVariable Long id,
            @RequestParam Long limit,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        AccountResponse response = accountService.updateOverdraftLimit(id, limit, user);
        return ResponseEntity.ok(response);
    }
}

