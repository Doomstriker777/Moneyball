package com.ledgerline.repository;

import com.ledgerline.domain.LedgerAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LedgerAttemptRepository extends JpaRepository<LedgerAttempt, Long> {
    List<LedgerAttempt> findByAccountIdOrderByCreatedAtDesc(Long accountId);
    List<LedgerAttempt> findByUserIdOrderByCreatedAtDesc(Long userId);
}

