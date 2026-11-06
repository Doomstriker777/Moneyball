package com.ledgerline.exception;

import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setType(URI.create("https://ledgerline.internal/errors/not-found"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<ProblemDetail> handleInsufficientFunds(InsufficientFundsException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Insufficient Funds");
        problem.setType(URI.create("https://ledgerline.internal/errors/insufficient-funds"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(AccountFrozenException.class)
    public ResponseEntity<ProblemDetail> handleAccountFrozen(AccountFrozenException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Account Frozen");
        problem.setType(URI.create("https://ledgerline.internal/errors/account-frozen"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ProblemDetail> handleIdempotencyConflict(IdempotencyConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Request In Progress");
        problem.setType(URI.create("https://ledgerline.internal/errors/idempotency-in-progress"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .header(HttpHeaders.RETRY_AFTER, ex.getRetryAfterSeconds())
                .body(problem);
    }

    @ExceptionHandler(IdempotencyPayloadMismatchException.class)
    public ResponseEntity<ProblemDetail> handleIdempotencyPayloadMismatch(IdempotencyPayloadMismatchException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Idempotency Key Payload Mismatch");
        problem.setType(URI.create("https://ledgerline.internal/errors/idempotency-mismatch"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed for request");
        problem.setTitle("Bad Request");
        problem.setType(URI.create("https://ledgerline.internal/errors/validation-error"));
        problem.setProperty("timestamp", Instant.now());

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        problem.setProperty("errors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ProblemDetail> handleBadCredentials(BadCredentialsException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        problem.setTitle("Unauthorized");
        problem.setType(URI.create("https://ledgerline.internal/errors/unauthorized"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ProblemDetail> handleAccountLocked(LockedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problem.setTitle("Account Locked");
        problem.setType(URI.create("https://ledgerline.internal/errors/account-locked"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access is denied: insufficient role privileges");
        problem.setTitle("Forbidden");
        problem.setType(URI.create("https://ledgerline.internal/errors/forbidden"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthException(AuthenticationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Unauthorized");
        problem.setType(URI.create("https://ledgerline.internal/errors/unauthorized"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneralException(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        problem.setTitle("Internal Server Error");
        problem.setType(URI.create("https://ledgerline.internal/errors/internal-error"));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}

