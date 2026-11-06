package com.ledgerline.repository;

import com.ledgerline.domain.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, IdempotencyKey.IdempotencyKeyId> {
    Optional<IdempotencyKey> findByUserIdAndKey(Long userId, String key);
}

