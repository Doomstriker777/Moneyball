package com.ledgerline.repository;

import com.ledgerline.domain.Flag;
import com.ledgerline.domain.FlagStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlagRepository extends JpaRepository<Flag, Long> {
    List<Flag> findByStatusOrderByCreatedAtDesc(FlagStatus status);
}

