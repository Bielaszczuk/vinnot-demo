package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.in.CollectSocialMetricsUseCase;
import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * The daily metrics run (#510): every publication published (or sent as a draft) in the last
 * {@code app.marketing.metrics.window-days} (30) gets today's snapshot, a day in the planner's zone, from its network's
 * reader. A network without a reader is skipped, a reading without metrics stores nothing, and a publication that fails
 * is logged without stopping the others.
 */
@Service
public class CollectSocialMetricsService implements CollectSocialMetricsUseCase {
    private static final Logger LOGGER = LoggerFactory.getLogger(CollectSocialMetricsService.class);
    private final SocialPublicationRepository publications;
    private final SocialMetricsRepository metrics;
    private final Map<SocialNetwork, SocialMetricsReader> readers = new EnumMap<>(SocialNetwork.class);
    private final ZoneId zone;
    private final Duration window;

    @Autowired
    public CollectSocialMetricsService(SocialPublicationRepository publications, SocialMetricsRepository metrics,
            ObjectProvider<SocialMetricsReader> readers, WeeklyPlanner.Settings settings,
            @Value("${app.marketing.metrics.window-days:30}") int windowDays) {
        this(publications, metrics, readers.orderedStream().toList(), settings.zone(), windowDays);
    }

    CollectSocialMetricsService(SocialPublicationRepository publications, SocialMetricsRepository metrics, List<SocialMetricsReader> readers,
            ZoneId zone, int windowDays) {
        if (windowDays < 1) {
            throw new IllegalArgumentException("app.marketing.metrics.window-days must be at least 1, got " + windowDays);
        }
        this.publications = publications;
        this.metrics = metrics;
        for (SocialMetricsReader reader : readers) {
            this.readers.put(reader.network(), reader);
        }
        this.zone = zone;
        this.window = Duration.ofDays(windowDays);
    }

    @Override
    public int collect(Instant now) {
        LocalDate today = now.atZone(zone).toLocalDate();
        int stored = 0;
        for (SocialPublication publication : publications.findSucceededSince(now.minus(window))) {
            SocialMetricsReader reader = readers.get(publication.network());
            if (Objects.nonNull(reader) && store(reader, publication, today, now)) {
                stored++;
            }
        }
        return stored;
    }

    private boolean store(SocialMetricsReader reader, SocialPublication publication, LocalDate today, Instant now) {
        try {
            Optional<PublicationMetrics> read = reader.read(publication.externalId());
            if (read.isEmpty()) {
                return false;
            }
            metrics.saveSnapshot(publication.id(), today, read.get(), now);
            return true;
        } catch (RuntimeException failure) {
            LOGGER.warn("Could not store the {} metrics of social publication {}: {}", publication.network(), publication.id(),
                    failure.getMessage());
            return false;
        }
    }
}
