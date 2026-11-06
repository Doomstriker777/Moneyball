package com.ledgerline.service;

import com.ledgerline.domain.User;
import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.LoginRequest;
import com.ledgerline.dto.UserSummaryResponse;
import com.ledgerline.repository.UserRepository;
import com.ledgerline.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final int maxFailedAttempts;
    private final int lockoutDurationMinutes;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${ledgerline.auth.max-failed-attempts:5}") int maxFailedAttempts,
            @Value("${ledgerline.auth.lockout-duration-minutes:15}") int lockoutDurationMinutes) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockoutDurationMinutes = lockoutDurationMinutes;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.isAccountLocked()) {
            throw new LockedException("Account is temporarily locked due to repeated failed login attempts. Try again later.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);
            if (attempts >= maxFailedAttempts) {
                user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(lockoutDurationMinutes)));
            }
            userRepository.save(user);
            throw new BadCredentialsException("Invalid email or password");
        }

        // Reset failed attempts on success
        if (user.getFailedAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    @Transactional(readOnly = true)
    public UserSummaryResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found"));
        return UserSummaryResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

