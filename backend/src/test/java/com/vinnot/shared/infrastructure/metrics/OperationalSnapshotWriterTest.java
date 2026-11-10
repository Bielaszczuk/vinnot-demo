package com.vinnot.shared.infrastructure.metrics;

import tools.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class OperationalSnapshotWriterTest {
    @TempDir
    Path directory;

    @Test
    void writesPrivateAtomicAggregatesWithoutMetricTagsOrApplicationData() throws Exception {
        var registry = new SimpleMeterRegistry();
        var telemetry = new OperationalTelemetry(registry);
        telemetry.recordHttp(200, 100);
        telemetry.recordHttp(503, 6000);
        telemetry.recordHttp(400, -1);
        for (var outcome : OperationalTelemetry.AiOutcome.values()) {
            telemetry.recordAi(outcome);
        }
        registry.gauge("hikaricp.connections.max", 6);
        registry.gauge("hikaricp.connections.active", 2);
        registry.gauge("hikaricp.connections.pending", Double.NaN);
        registry.counter("hikaricp.connections.timeout").increment();
        registry.counter("private.metric", "email", "never-export@example.test").increment();
        var path = directory.resolve("snapshot.json");
        var writer = new OperationalSnapshotWriter(registry, new ObjectMapper(), path.toString());
        writer.write();
        var json = new ObjectMapper().readTree(path.toFile());
        assertThat(json.path("http_requests").asInt()).isEqualTo(3);
        assertThat(json.path("http_errors").asInt()).isEqualTo(1);
        assertThat(json.path("http_slow").asInt()).isEqualTo(1);
        assertThat(json.path("http_seconds").asDouble()).isCloseTo(6.1, within(0.000001));
        assertThat(json.path("pool_max").asInt()).isEqualTo(6);
        assertThat(json.path("pool_pending").asInt()).isEqualTo(-1);
        assertThat(json.path("pool_timeouts").asInt()).isEqualTo(1);
        assertThat(json.path("ai_quota_exhausted").asInt()).isEqualTo(1);
        assertThat(Files.readString(path)).doesNotContain("never-export", "private.metric", "\"email\":");
        assertThat(Files.getPosixFilePermissions(path)).isEqualTo(PosixFilePermissions.fromString("rw-------"));
        telemetry.recordHttp(200, 5000);
        writer.write();
        assertThat(new ObjectMapper().readTree(path.toFile()).path("http_requests").asInt()).isEqualTo(4);
        assertThat(Files.exists(directory.resolve("snapshot.json.next"))).isFalse();
    }

    @Test
    void emitsZerosForIdleCountersAndDoesNotBreakApplicationWhenDiskIsUnavailable() {
        var writer = new OperationalSnapshotWriter(new SimpleMeterRegistry(), new ObjectMapper(),
                directory.resolve("missing/monitor.json").toString());
        assertThat(writer.snapshot()).containsEntry("http_requests", 0.0).containsEntry("ai_success", 0.0);
        writer.write();
        assertThat(Files.exists(directory.resolve("missing/monitor.json"))).isFalse();
    }
}
