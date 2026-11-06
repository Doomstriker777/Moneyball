package com.ledgerline.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferRequest {

    @NotNull(message = "Source account ID is required")
    private Long sourceAccountId;

    private Long destinationAccountId;

    private String destinationAccountNumber;

    /**
     * Amount in paise (BIGINT, strictly > 0).
     */
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be strictly greater than 0")
    private Long amount;

    @NotBlank(message = "Reason is required")
    private String reason;
}

