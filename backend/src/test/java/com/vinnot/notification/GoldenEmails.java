package com.vinnot.notification;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.shared.infrastructure.email.BrandedEmailTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Emails captured from the senders that existed before the notification module (same inputs, same
 * site URL). Migrated templates must reproduce them byte for byte.
 */
public final class GoldenEmails {
    public static final String SITE = "https://vinnot.example";

    private GoldenEmails() { }

    public static BrandedEmailTemplate brand() {
        return new BrandedEmailTemplate(SITE);
    }

    public static void assertSame(String name, String recipient, RenderedNotification rendered) {
        assertThat("to: " + recipient + "\nsubject: " + rendered.subject() + "\n").isEqualTo(read(name + ".meta.txt"));
        assertThat(rendered.text()).isEqualTo(read(name + ".text.txt"));
        assertThat(rendered.html()).isEqualTo(read(name + ".html"));
    }

    private static String read(String file) {
        try (InputStream input = GoldenEmails.class.getResourceAsStream("/notification/golden/" + file)) {
            return new String(Objects.requireNonNull(input, file).readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
