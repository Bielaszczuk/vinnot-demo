package com.vinnot.ai.domain.model;

import com.vinnot.ai.domain.valueobject.CanonicalWinePair;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class WineComparison {

    private UUID id;
    private UUID wineAId;
    private UUID wineBId;
    private String language;
    private Map<String, Object> comparisonJson;
    private Instant createdAt;
    private Instant updatedAt;

    public WineComparison() {
    }

    public WineComparison(
            UUID id,
            UUID wineAId,
            UUID wineBId,
            String language,
            Map<String, Object> comparisonJson,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.wineAId = wineAId;
        this.wineBId = wineBId;
        this.language = language;
        this.comparisonJson = comparisonJson;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static WineComparison create(
            UUID wineAId,
            UUID wineBId,
            String language,
            Map<String, Object> comparisonJson) {

        CanonicalWinePair pair = CanonicalWinePair.of(wineAId, wineBId);

        return new WineComparison(
                UUID.randomUUID(),
                pair.wineAId(),
                pair.wineBId(),
                language,
                comparisonJson,
                Instant.now(),
                Instant.now()
        );
    }

    public void updateComparison(Map<String, Object> newComparisonJson) {
        this.comparisonJson = newComparisonJson;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getWineAId() {
        return wineAId;
    }

    public UUID getWineBId() {
        return wineBId;
    }

    public String getLanguage() {
        return language;
    }

    public Map<String, Object> getComparisonJson() {
        return comparisonJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setWineAId(UUID wineAId) {
        this.wineAId = wineAId;
    }

    public void setWineBId(UUID wineBId) {
        this.wineBId = wineBId;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public void setComparisonJson(Map<String, Object> comparisonJson) {
        this.comparisonJson = comparisonJson;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
