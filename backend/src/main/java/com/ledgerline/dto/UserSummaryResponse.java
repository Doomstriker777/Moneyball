package com.ledgerline.dto;

import com.ledgerline.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private Long id;
    private String email;
    private Role role;
    private Instant createdAt;
}

