package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.EmailSuppressionPort;
import com.vinnot.notification.domain.model.EmailSuppressionReason;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/** Stores a fingerprint of each address instead of the address itself. */
@Component
public class JdbcEmailSuppressionRepository implements EmailSuppressionPort {
    private final JdbcTemplate jdbc;

    public JdbcEmailSuppressionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean isSuppressed(String address) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM email_suppressions WHERE address_hash = ?)", Boolean.class,
                fingerprint(address)));
    }

    @Override
    public void suppress(String address, EmailSuppressionReason reason) {
        jdbc.update("""
                INSERT INTO email_suppressions (address_hash, reason) VALUES (?, ?)
                ON CONFLICT (address_hash) DO UPDATE SET last_event_at = CURRENT_TIMESTAMP
                """, fingerprint(address), reason.name());
    }

    /** SHA-256 of the trimmed, lower-cased address, in hex. */
    static String fingerprint(String address) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(address.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
