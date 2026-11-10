package com.vinnot.shared.infrastructure.email;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;

/** Optional, local export of the rendered email bodies (see scripts/preview_transactional_emails.py). */
public final class EmailPreviewFiles {
    private EmailPreviewFiles() { }

    public static String baseUrl() {
        return System.getProperty("vinnot.email.preview.base-url", "https://vinnot.com");
    }

    public static BrandedEmailTemplate template() {
        return new BrandedEmailTemplate(baseUrl());
    }

    public static void write(String name, String html, String text) throws IOException {
        String directory = System.getProperty("vinnot.email.preview.directory");
        if (Objects.isNull(directory)) {
            return;
        }
        Path destination = Path.of(directory);
        Files.createDirectories(destination);
        Files.writeString(destination.resolve(name + ".html"), html);
        Files.writeString(destination.resolve(name + ".txt"), text);
    }
}
