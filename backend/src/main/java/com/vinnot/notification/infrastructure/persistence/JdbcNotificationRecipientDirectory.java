package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.NotificationRecipientDirectoryPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Read-only view of the account table; the notification module never depends on the user module's code. */
@Component
public class JdbcNotificationRecipientDirectory implements NotificationRecipientDirectoryPort {
    private final JdbcTemplate jdbc;

    public JdbcNotificationRecipientDirectory(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<DirectoryUser> findUser(UUID userId) {
        // Same display name as User#getFullName.
        return jdbc.query("SELECT email, first_name, last_name, preferred_language FROM users WHERE id = ?",
                (row, index) -> new DirectoryUser(NotificationRecipient.address(row.getString("email"),
                        String.format("%s %s", row.getString("first_name"), row.getString("last_name")).trim()),
                        locale(row.getString("preferred_language"))),
                userId).stream().findFirst();
    }

    private static NotificationLocale locale(String language) {
        return Objects.isNull(language) ? null : NotificationLocale.fromLanguage(language);
    }
}
