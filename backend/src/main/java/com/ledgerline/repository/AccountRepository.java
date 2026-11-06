package com.ledgerline.repository;

import com.ledgerline.domain.Account;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByNumber(String number);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id IN :ids ORDER BY a.id ASC")
    List<Account> findAllByIdInForUpdateAsc(@Param("ids") List<Long> ids);

    List<Account> findByOwnerId(Long ownerId);

    @Query("SELECT SUM(a.balance) FROM Account a")
    Long sumAllBalances();
}

