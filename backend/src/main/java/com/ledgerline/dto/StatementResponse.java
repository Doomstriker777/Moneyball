package com.ledgerline.dto;

import com.ledgerline.domain.AccountStatus;
import com.ledgerline.domain.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatementResponse {
    private Long accountId;
    private String accountNumber;
    private Long ownerId;
    private AccountType type;
    private Long currentBalance; // in paise
    private Long overdraftLimit; // in paise
    private AccountStatus status;
    private List<StatementItemResponse> items;
}
