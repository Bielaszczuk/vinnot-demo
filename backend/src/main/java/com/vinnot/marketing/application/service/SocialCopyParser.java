package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.FactCheckResult;
import com.vinnot.marketing.domain.exception.InvalidPostCopyException;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Turns the model's JSON into validated copy in every language (#489, #497), and its verdict into a fact-check result.
 * Both languages must be valid: one invalid or missing language makes the whole answer invalid.
 */
@Service
public class SocialCopyParser {

    public PostCopies copies(Map<String, Object> response) {
        Map<String, Object> json = Objects.requireNonNullElse(response, Map.of());
        String illustration = illustration(json.get("illustration"));
        return new PostCopies(copy(PostLanguage.ES, json.get(PostLanguage.ES.code()), illustration),
                copy(PostLanguage.EN, json.get(PostLanguage.EN.code()), illustration));
    }

    private static PostCopy copy(PostLanguage language, Object value, String illustration) {
        if (!(value instanceof Map<?, ?> json)) {
            throw new InvalidPostCopyException(language.code() + ": copy is required");
        }
        try {
            return PostCopy.of(language, string(json.get("hook")), slides(json.get("slides")), string(json.get("caption")),
                    strings(json.get("hashtags")), string(json.get("altText")), string(json.get("cta")), illustration);
        } catch (InvalidPostCopyException exception) {
            throw new InvalidPostCopyException(language.code() + ": " + exception.getMessage());
        }
    }

    /** The optional shared hero subject (#492); one too long to use is dropped rather than discarding valid copy. */
    private static String illustration(Object value) {
        String subject = string(value);
        return Objects.isNull(subject) || subject.strip().length() > PostCopy.ILLUSTRATION_MAX ? null : subject;
    }

    /**
     * The fields each language of an answer holds, with their lengths and never their text, so a rejected answer can
     * be logged (#501).
     */
    public String shape(Map<String, Object> response) {
        if (Objects.isNull(response) || response.isEmpty()) {
            return "empty";
        }
        return new TreeMap<>(response).entrySet().stream().map(entry -> entry.getKey() + describe(entry.getValue()))
                .collect(Collectors.joining(" "));
    }

    private static String describe(Object value) {
        if (value instanceof Map<?, ?> fields) {
            return fields.entrySet().stream().map(field -> field.getKey() + "=" + size(field.getValue())).sorted()
                    .collect(Collectors.joining(",", "{", "}"));
        }
        return "=" + size(value);
    }

    private static String size(Object value) {
        if (value instanceof String text) {
            return String.valueOf(text.length());
        }
        if (value instanceof List<?> items) {
            return String.valueOf(items.size());
        }
        return Objects.isNull(value) ? "null" : value.getClass().getSimpleName();
    }

    public FactCheckResult factCheck(Map<String, Object> response) {
        Map<String, Object> json = Objects.requireNonNullElse(response, Map.of());
        List<String> issues = strings(json.get("issues"));
        Object ok = json.get("ok");
        boolean verdict = Objects.isNull(ok) ? issues.isEmpty() : Boolean.parseBoolean(String.valueOf(ok));
        return new FactCheckResult(verdict, issues);
    }

    private static List<PostCopy.Slide> slides(Object value) {
        if (!(value instanceof List<?> items)) {
            throw new InvalidPostCopyException("slides must be a list of title and body");
        }
        return items.stream().map(item -> {
            if (!(item instanceof Map<?, ?> slide)) {
                throw new InvalidPostCopyException("slides must be a list of title and body");
            }
            return new PostCopy.Slide(string(slide.get("title")), string(slide.get("body")));
        }).toList();
    }

    private static List<String> strings(Object value) {
        if (value instanceof List<?> items) {
            return items.stream().filter(Objects::nonNull).map(String::valueOf).toList();
        }
        return List.of();
    }

    private static String string(Object value) {
        return Objects.isNull(value) ? null : String.valueOf(value);
    }
}
