package com.ledgerline.repository;

import com.ledgerline.domain.Journal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JournalRepository extends JpaRepository<Journal, Long> {
    Optional<Journal> findByReversalOf(Long reversalOf);
    boolean existsByReversalOf(Long reversalOf);
}

