package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.port.out.SocialMetricsReader;
import com.vinnot.marketing.application.port.out.SocialMetricsRepository;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPublication;
import com.vinnot.marketing.domain.service.WeeklyPlanner;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * #510 S6: once a day every publication of the last 30 days gets one metrics snapshot per Argentina day from its network's
 * reader; a network without reader, a reading without metrics or a failing publication writes nothing and the rest go on.
 */
class CollectSocialMetricsServiceTest {
    /** 02:30 UTC on 3 November is still 2 November in Argentina. */
    private static final Instant NOW = Instant.parse("2026-11-03T02:30:00Z");
    private static final Instant THIRTY_DAYS_AGO = Instant.parse("2026-10-04T02:30:00Z");
    private static final LocalDate AR_TODAY = LocalDate.of(2026, 11, 2);
    private static final PublicationMetrics METRICS = new PublicationMetrics(120L, 100L, 9L, 2L, 1L, 1L, null);
    private static final ZoneId ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialMetricsRepository metrics = mock(SocialMetricsRepository.class);
    private final SocialMetricsReader instagram = reader(SocialNetwork.INSTAGRAM);
    private final SocialMetricsReader threads = reader(SocialNetwork.THREADS);
    private final CollectSocialMetricsService service = new CollectSocialMetricsService(publications, metrics, List.of(instagram, threads),
            ARGENTINA, 30);

    @Test
    void eachPublicationOfTheWindowGetsTodaysSnapshotFromItsNetwork() {
        SocialPublication onInstagram = published(SocialNetwork.INSTAGRAM, "ig-1");
        SocialPublication onThreads = published(SocialNetwork.THREADS, "th-1");
        when(publications.findSucceededSince(THIRTY_DAYS_AGO)).thenReturn(List.of(onInstagram, onThreads));
        when(instagram.read("ig-1")).thenReturn(Optional.of(METRICS));
        PublicationMetrics threadsMetrics = new PublicationMetrics(50L, null, 3L, 1L, null, 1L, null);
        when(threads.read("th-1")).thenReturn(Optional.of(threadsMetrics));

        assertThat(service.collect(NOW)).isEqualTo(2);

        verify(metrics).saveSnapshot(onInstagram.id(), AR_TODAY, METRICS, NOW);
        verify(metrics).saveSnapshot(onThreads.id(), AR_TODAY, threadsMetrics, NOW);
    }

    @Test
    void aReadingWithoutMetricsWritesNothing() {
        when(publications.findSucceededSince(THIRTY_DAYS_AGO)).thenReturn(List.of(published(SocialNetwork.INSTAGRAM, "ig-1")));
        when(instagram.read("ig-1")).thenReturn(Optional.empty());

        assertThat(service.collect(NOW)).isZero();
        verify(metrics, never()).saveSnapshot(any(), any(), any(), any());
    }

    @Test
    void aFailingPublicationIsSkippedAndTheOthersAreStillRead() {
        SocialPublication failing = published(SocialNetwork.INSTAGRAM, "ig-bad");
        SocialPublication unsaved = published(SocialNetwork.THREADS, "th-bad");
        SocialPublication fine = published(SocialNetwork.INSTAGRAM, "ig-ok");
        when(publications.findSucceededSince(THIRTY_DAYS_AGO)).thenReturn(List.of(failing, unsaved, fine));
        when(instagram.read("ig-bad")).thenThrow(new SocialPublishingException(SocialPublishingException.Code.TOKEN_INVALID, "expired"));
        when(threads.read("th-bad")).thenReturn(Optional.of(METRICS));
        doThrow(new IllegalStateException("database down")).when(metrics).saveSnapshot(eq(unsaved.id()), any(), any(), any());
        when(instagram.read("ig-ok")).thenReturn(Optional.of(METRICS));

        assertThat(service.collect(NOW)).isEqualTo(1);

        verify(metrics).saveSnapshot(fine.id(), AR_TODAY, METRICS, NOW);
        verify(metrics, never()).saveSnapshot(eq(failing.id()), any(), any(), any());
    }

    @Test
    void aNetworkWithoutReaderIsSkipped() {
        when(publications.findSucceededSince(THIRTY_DAYS_AGO)).thenReturn(List.of(published(SocialNetwork.TIKTOK, "tt-1")));

        assertThat(service.collect(NOW)).isZero();
        verifyNoInteractions(metrics);
        verify(instagram, never()).read(any());
        verify(threads, never()).read(any());
    }

    @Test
    void theReadersComeFromTheContextAndTheZoneFromThePlannerSettings() {
        @SuppressWarnings("unchecked")
        ObjectProvider<SocialMetricsReader> provider = mock(ObjectProvider.class);
        when(provider.orderedStream()).thenReturn(Stream.of(instagram));
        CollectSocialMetricsService wired = new CollectSocialMetricsService(publications, metrics, provider,
                WeeklyPlanner.Settings.defaults(), 30);
        SocialPublication onInstagram = published(SocialNetwork.INSTAGRAM, "ig-1");
        when(publications.findSucceededSince(THIRTY_DAYS_AGO)).thenReturn(List.of(onInstagram));
        when(instagram.read("ig-1")).thenReturn(Optional.of(METRICS));

        assertThat(wired.collect(NOW)).isEqualTo(1);
        verify(metrics).saveSnapshot(onInstagram.id(), AR_TODAY, METRICS, NOW);
        assertThatThrownBy(() -> new CollectSocialMetricsService(publications, metrics, List.of(), ARGENTINA, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static SocialMetricsReader reader(SocialNetwork network) {
        SocialMetricsReader reader = mock(SocialMetricsReader.class);
        when(reader.network()).thenReturn(network);
        return reader;
    }

    private static SocialPublication published(SocialNetwork network, String externalId) {
        Instant at = Instant.parse("2026-10-20T22:00:00Z");
        return SocialPublication.restore(UUID.randomUUID(), UUID.randomUUID(), network, PublicationStatus.PUBLISHED, externalId,
                "https://example.com/" + externalId, 1, null, at, at, at);
    }
}
