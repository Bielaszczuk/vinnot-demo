package com.vinnot.ai.infrastructure.persistence.lock;

import com.vinnot.ai.application.port.out.AiGenerationLeasePort;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PostgresAiGenerationLeaseAdapterTest {

    @Test
    void returnsAnOwnedLeaseWhenTheAtomicUpsertSucceeds() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.update(anyString(), eq("profile:1"),
                any(UUID.class), anyLong())).thenReturn(1);
        PostgresAiGenerationLeaseAdapter adapter =
                new PostgresAiGenerationLeaseAdapter(jdbcTemplate);

        AiGenerationLeasePort.Lease lease = adapter.tryAcquire(
                "profile:1", Duration.ofSeconds(45)).orElseThrow();

        assertThat(lease.key()).isEqualTo("profile:1");
        ArgumentCaptor<UUID> owner = ArgumentCaptor.forClass(UUID.class);
        verify(jdbcTemplate).update(anyString(), eq("profile:1"),
                owner.capture(), eq(45_000L));
        assertThat(lease.ownerId()).isEqualTo(owner.getValue());
    }

    @Test
    void reportsContentionAndReleasesOnlyTheOwnedLease() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.update(anyString(), eq("profile:2"),
                any(UUID.class), anyLong())).thenReturn(0);
        PostgresAiGenerationLeaseAdapter adapter =
                new PostgresAiGenerationLeaseAdapter(jdbcTemplate);

        assertThat(adapter.tryAcquire(
                "profile:2", Duration.ofSeconds(10))).isEmpty();

        AiGenerationLeasePort.Lease lease = new AiGenerationLeasePort.Lease(
                "profile:2", UUID.randomUUID());
        adapter.release(lease);
        verify(jdbcTemplate).update(
                "DELETE FROM ai_generation_leases WHERE lock_key = ? AND owner_id = ?",
                lease.key(), lease.ownerId());
    }
}
