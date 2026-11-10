package com.vinnot.support.infrastructure;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.support.application.port.out.SupportRequestPort;
import com.vinnot.support.domain.model.SupportRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import java.util.LinkedHashMap;
import java.util.Map;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.security.NoSuchAlgorithmException;

@Component
public class JdbcSupportRequestAdapter implements SupportRequestPort {
    /** Kind used before the notification module; undelivered rows of it still expire here. */
    private static final String LEGACY_KIND = "SUPPORT_REQUEST";
    /** Content hash of acknowledgement marker rows; a request fingerprint is hex, so it never equals this. */
    static final String ACKNOWLEDGEMENT_MARKER = "acknowledgement";
    private final JdbcTemplate jdbc;
    private final NotificationPort notifications;
    private final ObjectMapper mapper;
    private final SupportDeliveryConfiguration configuration;

    public JdbcSupportRequestAdapter(JdbcTemplate jdbc, NotificationPort notifications,
            ObjectMapper mapper, SupportDeliveryConfiguration configuration) {
        this.jdbc = jdbc;
        this.notifications = notifications;
        this.mapper = mapper;
        this.configuration = configuration;
    }
    @Override
    @Transactional
    public void accept(SupportRequest request) {
        String recipient = configuration.requireRecipient();
        String hash = fingerprint(request);
        int inserted = jdbc.update("INSERT INTO support_request_receipts(id, content_hash) VALUES (?, ?) ON CONFLICT (id) DO NOTHING",
                request.requestId(), hash);
        if (inserted == 0) {
            String existing = jdbc.queryForObject("SELECT content_hash FROM support_request_receipts WHERE id = ?", String.class, request.requestId());
            if (!hash.equals(existing)) {
                throw new DomainException("SUPPORT_REQUEST_CONFLICT", "Request identifier already used");
            }
            return;
        }
        notifications.enqueue(NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
                NotificationRecipient.address(recipient, null), NotificationLocale.EN, Map.of(
                        "requestId", request.requestId().toString(), "name", request.name(), "email", request.email(),
                        "subject", request.subject(), "message", request.message()),
                "support:" + request.requestId()));
        if (!firstAcknowledgementToday(request.email())) {
            return;
        }
        // Anyone can type any address in the public form, so the acknowledgement carries no text they wrote:
        // no name (a generic greeting) and never the message.
        notifications.enqueue(NotificationRequest.of(NotificationType.SUPPORT_REQUEST_RECEIVED,
                NotificationRecipient.address(request.email(), null),
                NotificationLocale.fromLanguage(request.language()),
                Map.of("requestId", request.requestId().toString(), "subject", request.subject()),
                "support-received:" + request.requestId()));
    }
    /**
     * At most one acknowledgement per address and UTC day, however many requests name it. The marker row lives
     * with the request receipts (and expires with them), keyed by a digest of the normalized address so the
     * address itself is never stored; the outbox cannot cap it because delivered jobs are deleted.
     */
    private boolean firstAcknowledgementToday(String email) {
        byte[] digest = sha256("support-acknowledgement:" + email.trim().toLowerCase(Locale.ROOT));
        return jdbc.update("""
                INSERT INTO support_request_receipts(id, content_hash) VALUES (?, ?)
                ON CONFLICT (id) DO UPDATE SET created_at = CURRENT_TIMESTAMP
                WHERE support_request_receipts.content_hash = excluded.content_hash
                AND support_request_receipts.created_at < date_trunc('day', CURRENT_TIMESTAMP, 'UTC')
                """, UUID.nameUUIDFromBytes(digest), ACKNOWLEDGEMENT_MARKER) == 1;
    }
    /** The message the requester wrote; the language is not part of it, so a retry in another language still matches. */
    private String fingerprint(SupportRequest request) {
        Map<String, Object> content = new LinkedHashMap<>();
        content.put("requestId", request.requestId());
        content.put("name", request.name());
        content.put("email", request.email());
        content.put("subject", request.subject());
        content.put("message", request.message());
        try {
            return HexFormat.of().formatHex(sha256(mapper.writeValueAsString(content)));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Cannot fingerprint support request", exception);
        }
    }
    private static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
    /**
     * Expire undelivered personal data; successful jobs are already removed by the outbox worker and
     * undelivered notifications expire through the notification module's retention.
     */
    @Scheduled(fixedDelayString = "${app.support.cleanup-ms:3600000}")
    @Transactional
    public void cleanup() {
        jdbc.update("DELETE FROM external_effects WHERE kind = ? AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'", LEGACY_KIND);
        jdbc.update("DELETE FROM support_request_receipts WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
    }
}
