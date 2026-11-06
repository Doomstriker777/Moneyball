package com.ledgerline.dto;

import com.ledgerline.domain.Account;
import com.ledgerline.domain.AccountStatus;
import com.ledgerline.domain.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountResponse {
    private Long id;
    private String number;
    private Long ownerId;
    private AccountType type;
    private Long balance;
    private Long overdraftLimit;
    private AccountStatus status;
    private Long version;
    private Instant createdAt;

    public static AccountResponse fromEntity(Account account) {
        return AccountResponse.builder()
                .id(account.getId())
                .number(account.getNumber())
                .ownerId(account.getOwnerId())
                .type(account.getType())
                .balance(account.getBalance())
                .overdraftLimit(account.getOverdraftLimit())
                .status(account.getStatus())
                .version(account.getVersion())
                .createdAt(account.getCreatedAt())
                .build();
    }
}

