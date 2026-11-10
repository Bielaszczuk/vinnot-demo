package com.vinnot.shared.infrastructure.metrics;

import tools.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Bounded local snapshot consumed through Docker by the host; never an HTTP endpoint. */
@Component
@ConditionalOnProperty(name = "app.observability.snapshot.enabled", havingValue = "true", matchIfMissing = true)
public class OperationalSnapshotWriter {
    private static final Logger LOG = LoggerFactory.getLogger(OperationalSnapshotWriter.class);
    private final MeterRegistry registry;
    private final ObjectMapper mapper;
    private final Path destination;
    private final String processId = UUID.randomUUID().toString();

    public OperationalSnapshotWriter(MeterRegistry registry, ObjectMapper mapper,
            @Value("${app.observability.snapshot.path:/tmp/vinnot-operations.json}") String destination) {
        this.registry = registry;
        this.mapper = mapper;
        this.destination = Path.of(destination);
    }

    @Scheduled(fixedDelayString = "${app.observability.snapshot.interval-ms:60000}", initialDelay = 60000)
    public void write() {
        Path temporary = destination.resolveSibling(destination.getFileName() + ".next");
        try {
            // Private file first; readers see either a complete old or complete new snapshot.
            Files.deleteIfExists(temporary);
            Files.createFile(temporary, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
            mapper.writeValue(temporary.toFile(), snapshot());
            Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException | RuntimeException failure) {
            LOG.warn("Operational snapshot unavailable: {}", failure.getClass().getSimpleName());
        }
    }

    Map<String, Object> snapshot() {
        var result = new LinkedHashMap<String, Object>();
        result.put("schema", 1);
        result.put("process", processId);
        result.put("timestamp", Instant.now().getEpochSecond());
        for (String name : new String[] {"requests", "errors", "seconds", "slow"}) {
            var counter = registry.find("vinnot.http." + name).counter();
            result.put("http_" + name, Objects.isNull(counter) ? 0 : counter.count());
        }
        for (String name : new String[] {"active", "max", "pending"}) {
            double value = registry.find("hikaricp.connections." + name).gauges().stream()
                    .mapToDouble(gauge -> gauge.value()).sum();
            result.put("pool_" + name, Double.isFinite(value) ? value : -1);
        }
        result.put("pool_timeouts", registry.find("hikaricp.connections.timeout").counters().stream()
                .mapToDouble(counter -> counter.count()).sum());
        result.put("email_failures", registry.find("vinnot.email.failures").counters().stream()
                .mapToDouble(counter -> counter.count()).sum());
        for (OperationalTelemetry.AiOutcome outcome : OperationalTelemetry.AiOutcome.values()) {
            var counter = registry.find("vinnot.ai.attempts").tag("outcome", outcome.name()).counter();
            result.put("ai_" + outcome.name().toLowerCase(Locale.ROOT), Objects.isNull(counter) ? 0 : counter.count());
        }
        return result;
    }
}
