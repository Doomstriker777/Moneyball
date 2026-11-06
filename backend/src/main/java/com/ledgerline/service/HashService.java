package com.ledgerline.service;

import com.ledgerline.domain.EntryDirection;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class HashService {

    /**
     * Calculates the SHA-256 hash of a ledger entry chained to the previous entry hash:
     * hash = sha256(prev_hash || account_id || journal_id || direction || amount || balance_after || created_at)
     */
    public String calculateEntryHash(
            String prevHash,
            Long accountId,
            Long journalId,
            EntryDirection direction,
            Long amount,
            Long balanceAfter,
            Instant createdAt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String data = (prevHash == null ? "" : prevHash)
                    + accountId
                    + journalId
                    + direction.name()
                    + amount
                    + balanceAfter
                    + createdAt.toString();

            byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}

