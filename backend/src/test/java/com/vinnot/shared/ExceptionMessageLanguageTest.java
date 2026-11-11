package com.vinnot.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Exception messages are developer-facing English: clients translate by error code, so a message in
 * Spanish would reach English users through any generic error path.
 */
class ExceptionMessageLanguageTest {

    private static final Path SOURCES = Path.of("src", "main", "java", "com", "vinnot");
    private static final List<String> MODULES = List.of("payment", "event");
    /** An exception constructor call, up to its closing parenthesis and semicolon. */
    private static final Pattern EXCEPTION_CALL = Pattern.compile("new \\w+Exception\\((.*?)\\);", Pattern.DOTALL);
    private static final Pattern SPANISH_TEXT = Pattern.compile("\"[^\"]*[áéíóúñÁÉÍÓÚÑ¿¡][^\"]*\"");

    @Test
    void paymentAndEventExceptionMessagesAreInEnglish() throws IOException {
        List<String> offenders = new ArrayList<>();
        for (String module : MODULES) {
            try (Stream<Path> files = Files.walk(SOURCES.resolve(module))) {
                for (Path file : files.filter(path -> path.toString().endsWith(".java")).toList()) {
                    collectSpanishMessages(file, offenders);
                }
            }
        }
        assertThat(offenders).isEmpty();
    }

    private static void collectSpanishMessages(Path file, List<String> offenders) throws IOException {
        Matcher call = EXCEPTION_CALL.matcher(Files.readString(file, StandardCharsets.UTF_8));
        while (call.find()) {
            Matcher text = SPANISH_TEXT.matcher(call.group(1));
            while (text.find()) {
                offenders.add(file.getFileName() + ": " + text.group());
            }
        }
    }
}
