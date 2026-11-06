package com.ledgerline.controller;

import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.dto.UserSummaryResponse;
import com.ledgerline.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user authentication and session context")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT", description = "Validates credentials, tracks failed attempts with lockout protection, and returns a signed JWT.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile", description = "Returns details of the currently authenticated user extracted from the JWT.")
    public ResponseEntity<UserSummaryResponse> getCurrentUser(@AuthenticationPrincipal UserDetails principal) {
        UserSummaryResponse response = authService.getCurrentUser(principal.getUsername());
        return ResponseEntity.ok(response);
    }
}

