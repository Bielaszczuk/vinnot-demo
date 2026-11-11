package com.vinnot.wine.infrastructure.persistence.search;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CatalogSearchAccentNormalizerTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @AfterEach
    void clearInterruption() {
        Thread.interrupted();
    }

    @Test
    void rejectsInvalidBatchSettings() {
        assertThatThrownBy(() -> new CatalogSearchAccentNormalizer(jdbc, true, 0, Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("batch-size");
        assertThatThrownBy(() -> new CatalogSearchAccentNormalizer(jdbc, true, 10, Duration.ofMillis(-1)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("pause");
    }

    @Test
    void stopsAndKeepsTheInterruptionWhenInterruptedBetweenBatches() {
        when(jdbc.queryForList(anyString(), eq(UUID.class), anyInt()))
                .thenReturn(List.of(UUID.randomUUID()));
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        var normalizer = new CatalogSearchAccentNormalizer(jdbc, true, 1, Duration.ofSeconds(5));

        Thread.currentThread().interrupt();
        assertThatThrownBy(normalizer::normalizePending)
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("interrupted");
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }
}
