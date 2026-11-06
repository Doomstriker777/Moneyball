package com.ledgerline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "account_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(AccountMember.AccountMemberId.class)
public class AccountMember {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountMemberId implements Serializable {
        private Long userId;
        private Long accountId;
    }
}

