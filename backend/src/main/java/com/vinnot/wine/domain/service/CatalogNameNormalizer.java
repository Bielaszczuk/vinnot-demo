package com.vinnot.wine.domain.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;

/** Compares catalog names ignoring case, accents and punctuation ("Mendoza", "mendoza", "Mendozá"). */
public final class CatalogNameNormalizer {

    private CatalogNameNormalizer() {
    }

    public static String normalize(String value) {
        if (Objects.isNull(value) || value.isBlank()) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{Alnum}]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static boolean sameName(String left, String right) {
        String normalized = normalize(left);
        return !normalized.isEmpty() && normalized.equals(normalize(right));
    }
}
