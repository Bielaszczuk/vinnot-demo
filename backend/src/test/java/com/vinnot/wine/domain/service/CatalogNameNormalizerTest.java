package com.vinnot.wine.domain.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogNameNormalizerTest {

    @Test
    void ignoresCaseAccentsAndPunctuation() {
        assertThat(CatalogNameNormalizer.normalize("  Luján de Cuyo, MENDOZA ")).isEqualTo("lujan de cuyo mendoza");
        assertThat(CatalogNameNormalizer.sameName("Mendozá", "mendoza")).isTrue();
        assertThat(CatalogNameNormalizer.sameName("Mendoza", "Maipo")).isFalse();
    }

    @Test
    void blankNamesNeverMatch() {
        assertThat(CatalogNameNormalizer.normalize(null)).isEmpty();
        assertThat(CatalogNameNormalizer.normalize("   ")).isEmpty();
        assertThat(CatalogNameNormalizer.sameName(" ", " ")).isFalse();
        assertThat(CatalogNameNormalizer.sameName(null, null)).isFalse();
    }
}
