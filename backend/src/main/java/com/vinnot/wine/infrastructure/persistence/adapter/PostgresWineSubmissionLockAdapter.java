package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineSubmissionLockPort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;

@Component
public class PostgresWineSubmissionLockAdapter implements WineSubmissionLockPort {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public void lock(String wineName, String wineryName, Integer vintage) {
        String key = normalize(wineName)
                + "|" + normalize(wineryName)
                + "|" + Objects.requireNonNullElse(vintage, 0);
        entityManager.createNativeQuery(
                        "SELECT pg_advisory_xact_lock(hashtextextended(:catalogKey, 0))")
                .setParameter("catalogKey", key)
                .getSingleResult();
    }

    private String normalize(String value) {
        return Normalizer.normalize(
                        Objects.requireNonNullElse(value, ""), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{Alnum}]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
