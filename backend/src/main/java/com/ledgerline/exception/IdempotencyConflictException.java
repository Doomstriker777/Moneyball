package com.ledgerline.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class IdempotencyConflictException extends RuntimeException {
    private final String retryAfterSeconds;

    public IdempotencyConflictException(String message, String retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public String getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

