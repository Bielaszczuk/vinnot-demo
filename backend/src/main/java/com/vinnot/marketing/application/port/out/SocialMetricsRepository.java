package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.marketing.domain.model.PublicationMetrics;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The {@code social_post_metrics} table (#510): one snapshot per publication and day. */
public interface SocialMetricsRepository {

    /** Stores the day's snapshot of a publication, replacing the one already stored for that day. */
    void saveSnapshot(UUID publicationId, LocalDate day, PublicationMetrics metrics, Instant capturedAt);

    /** The latest snapshot of each of these publications; publications without one are absent. */
    Map<UUID, PublicationMetrics> latestByPublication(Collection<UUID> publicationIds);

    /**
     * Each pillar's latest snapshots of the publications published from {@code since} on, summed per pillar of the post. A
     * post counts as measured when any of its snapshots has views. Pillars without snapshots are absent.
     */
    List<PillarPerformance> pillarPerformance(Instant since);
}
