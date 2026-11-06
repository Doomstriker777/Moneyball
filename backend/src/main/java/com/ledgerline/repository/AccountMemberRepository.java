package com.ledgerline.repository;

import com.ledgerline.domain.AccountMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountMemberRepository extends JpaRepository<AccountMember, AccountMember.AccountMemberId> {
    boolean existsByUserIdAndAccountId(Long userId, Long accountId);
    List<AccountMember> findByUserId(Long userId);
    List<AccountMember> findByAccountId(Long accountId);
}

