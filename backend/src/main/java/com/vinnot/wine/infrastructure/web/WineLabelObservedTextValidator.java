package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Validates and normalizes untrusted OCR evidence at the HTTP boundary.
 */
@Component
public class WineLabelObservedTextValidator {

    private static final int MAX_LINES = 24;
    private static final int MAX_LINE_LENGTH = 120;
    private static final int MAX_TOTAL_CHARACTERS = 2_000;

    public List<String> validate(List<String> observedText) {
        if (Objects.isNull(observedText) || observedText.isEmpty()) {
            return List.of();
        }
        if (observedText.size() > MAX_LINES) {
            throw invalid("Wine-label OCR text contains too many lines");
        }

        Map<String, String> uniqueLines = new LinkedHashMap<>();
        int totalCharacters = 0;
        for (String rawLine : observedText) {
            if (Objects.isNull(rawLine)) {
                continue;
            }
            String line = rawLine.replaceAll("\\s+", " ").trim();
            if (line.isEmpty()) {
                continue;
            }
            if (line.length() > MAX_LINE_LENGTH) {
                throw invalid("Wine-label OCR line is too long");
            }
            totalCharacters += line.length();
            if (totalCharacters > MAX_TOTAL_CHARACTERS) {
                throw invalid("Wine-label OCR text is too long");
            }
            uniqueLines.putIfAbsent(line.toLowerCase(Locale.ROOT), line);
        }
        return List.copyOf(uniqueLines.values());
    }

    private DomainException invalid(String message) {
        return new DomainException("INVALID_LABEL_TEXT", message);
    }
}
