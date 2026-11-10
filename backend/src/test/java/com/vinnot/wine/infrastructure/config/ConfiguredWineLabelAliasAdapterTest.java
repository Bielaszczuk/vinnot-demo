package com.vinnot.wine.infrastructure.config;

import com.vinnot.wine.domain.model.WineLabelAliasCategory;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ConfiguredWineLabelAliasAdapterTest {

    @Test
    void resolvesConfiguredAliasesWithoutDependingOnCaseOrAccents() {
        WineLabelAliasProperties properties = new WineLabelAliasProperties();
        properties.setRegions(Map.of("uco valley", "Valle de Uco"));
        ConfiguredWineLabelAliasAdapter adapter =
                new ConfiguredWineLabelAliasAdapter(properties);

        assertThat(adapter.canonicalize(
                WineLabelAliasCategory.REGION, "UCO-Valley"))
                .isEqualTo("Valle de Uco");
        assertThat(adapter.canonicalize(
                WineLabelAliasCategory.GRAPE, "Malbec"))
                .isEqualTo("Malbec");
    }
}
