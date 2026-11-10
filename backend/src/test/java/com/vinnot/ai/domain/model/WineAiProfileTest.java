package com.vinnot.ai.domain.model;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineAiProfileTest {

    @Test
    void createsAndReplacesProfileContentWhileKeepingIdentity() {
        UUID wineId = UUID.randomUUID();
        WineAiProfile profile = WineAiProfile.create(
                wineId, "es-AR", Map.of("summary", "Original"));
        var originalUpdatedAt = profile.getUpdatedAt();

        profile.updateProfile(Map.of("summary", "Updated"));

        assertThat(profile.getWineId()).isEqualTo(wineId);
        assertThat(profile.getLanguage()).isEqualTo("es-AR");
        assertThat(profile.getProfileJson()).containsEntry("summary", "Updated");
        assertThat(profile.getUpdatedAt()).isAfterOrEqualTo(originalUpdatedAt);
    }
}
