package com.vinnot.ai.domain.model;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class WineAiProfile {

    private UUID id;
    private UUID wineId;
    private String language;
    private Map<String, Object> profileJson;
    private Instant createdAt;
    private Instant updatedAt;

    public WineAiProfile() {
    }

    public WineAiProfile(
            UUID id,
            UUID wineId,
            String language,
            Map<String, Object> profileJson,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.wineId = wineId;
        this.language = language;
        this.profileJson = profileJson;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static WineAiProfile create(UUID wineId, String language, Map<String, Object> profileJson) {
        return new WineAiProfile(
                UUID.randomUUID(),
                wineId,
                language,
                profileJson,
                Instant.now(),
                Instant.now()
        );
    }

    public void updateProfile(Map<String, Object> newProfileJson) {
        this.profileJson = newProfileJson;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getWineId() {
        return wineId;
    }

    public String getLanguage() {
        return language;
    }

    public Map<String, Object> getProfileJson() {
        return profileJson;
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

    public void setWineId(UUID wineId) {
        this.wineId = wineId;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public void setProfileJson(Map<String, Object> profileJson) {
        this.profileJson = profileJson;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

