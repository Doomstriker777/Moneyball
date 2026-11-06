package com.ledgerline.repository;

import com.ledgerline.domain.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    List<LedgerEntry> findByJournalId(Long journalId);

    List<LedgerEntry> findByAccountIdOrderByIdAsc(Long accountId);

    @Query("SELECT e FROM LedgerEntry e WHERE e.accountId = :accountId ORDER BY e.id DESC LIMIT 1")
    Optional<LedgerEntry> findLatestByAccountId(@Param("accountId") Long accountId);

    @Query("SELECT COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) FROM LedgerEntry e WHERE e.accountId = :accountId")
    Long calculateBalanceFromEntries(@Param("accountId") Long accountId);
}

