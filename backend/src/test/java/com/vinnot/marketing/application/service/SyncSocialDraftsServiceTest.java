package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.exception.SocialPublishingException.Code;
import com.vinnot.marketing.application.model.DraftCheck;
import com.vinnot.marketing.application.port.out.SocialDraftTracker;
import com.vinnot.marketing.application.port.out.SocialPublicationRepository;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * #516 S1: a TikTok draft the creator posted from the TikTok app becomes published, with its public link when TikTok gives
 * one. Only drafts sent within the window are checked, at most a capped number per sweep; one failing draft does not stop
 * the others, and a failure that concerns the whole network stops that network's checks until the next sweep.
 */
class SyncSocialDraftsServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-05T12:00:00Z");
    private static final Instant FOURTEEN_DAYS_AGO = Instant.parse("2026-10-22T12:00:00Z");
    private static final Instant SENT = Instant.parse("2026-11-04T22:30:00Z");
    private static final String LINK = "https://www.tiktok.com/@vinnot/photo/7311";
    private final SocialPublicationRepository publications = mock(SocialPublicationRepository.class);
    private final SocialDraftTracker tiktok = tracker(SocialNetwork.TIKTOK);
    private final SyncSocialDraftsService service = new SyncSocialDraftsService(publications, List.of(tiktok), 14, 20);

    @Test
    void aPostedDraftIsPublishedWithItsLinkOverTheDraftStatusOnly() {
        SocialPublication draft = draft(SocialNetwork.TIKTOK, "p_inbox.1");
        when(publications.findDraftsSentSince(FOURTEEN_DAYS_AGO, 20)).thenReturn(List.of(draft));
        when(tiktok.check("p_inbox.1")).thenReturn(DraftCheck.posted(LINK));
        when(publications.saveIfStatus(any(), eq(PublicationStatus.DRAFT_SENT))).thenReturn(true);

        assertThat(service.syncDrafts(NOW)).isEqualTo(1);

        ArgumentCaptor<SocialPublication> saved = ArgumentCaptor.forClass(SocialPublication.class);
        verify(publications).saveIfStatus(saved.capture(), eq(PublicationStatus.DRAFT_SENT));
        assertThat(saved.getValue().id()).isEqualTo(draft.id());
        assertThat(saved.getValue().status()).isEqualTo(PublicationStatus.PUBLISHED);
        assertThat(saved.getValue().externalId()).isEqualTo("p_inbox.1");
        assertThat(saved.getValue().permalink()).isEqualTo(LINK);
        assertThat(saved.getValue().publishedAt()).isEqualTo(NOW);
        verify(publications, never()).save(any());
    }

    @Test
    void aDraftChangedMeanwhileIsNotCounted() {
        when(publications.findDraftsSentSince(FOURTEEN_DAYS_AGO, 20)).thenReturn(List.of(draft(SocialNetwork.TIKTOK, "p1")));
        when(tiktok.check("p1")).thenReturn(DraftCheck.posted(null));
        when(publications.saveIfStatus(any(), eq(PublicationStatus.DRAFT_SENT))).thenReturn(false);

        assertThat(service.syncDrafts(NOW)).isZero();
    }

    @Test
    void aDraftStillInTheInboxIsLeftAsItIs() {
        when(publications.findDraftsSentSince(FOURTEEN_DAYS_AGO, 20)).thenReturn(List.of(draft(SocialNetwork.TIKTOK, "p1")));
        when(tiktok.check("p1")).thenReturn(DraftCheck.pending());

        assertThat(service.syncDrafts(NOW)).isZero();

        verify(publications, never()).saveIfStatus(any(), any());
        verify(publications, never()).save(any());
    }

    @Test
    void aDraftOfANetworkWithoutTrackerIsSkipped() {
        SocialPublication tiktokDraft = draft(SocialNetwork.TIKTOK, "p1");
        when(publications.findDraftsSentSince(FOURTEEN_DAYS_AGO, 20)).thenReturn(List.of(draft(SocialNetwork.INSTAGRAM, "ig-1"),
                tiktokDraft));
        when(tiktok.check("p1")).thenReturn(DraftCheck.posted(null));
        when(publications.saveIfStatus(any(), eq(PublicationStatus.DRAFT_SENT))).thenReturn(true);

        assertThat(service.syncDrafts(NOW)).isEqualTo(1);

        verify(tiktok, never()).check("ig-1");
        verify(publications).saveIfStatus(any(), eq(PublicationStatus.DRAFT_SENT));
    }

    @Test
    void withoutAnyTrackerNothingIsRead() {
        SyncSocialDraftsService untracked = new SyncSocialDraftsService(publications, List.of(), 14, 20);

        assertThat(untracked.syncDrafts(NOW)).isZero();

        verifyNoInteractions(publications);
    }

    @Test
    void aFailingDraftIsSkippedAndTheOthersAreStillChecked() {
        SocialPublication rejected = draft(SocialNetwork.TIKTOK, "p_gone");
        SocialPublication broken = draft(SocialNetwork.TIKTOK, "p_broken");
        SocialPublication unsaved = draft(SocialNetwork.TIKTOK, "p_unsaved");
        SocialPublication posted = draft(SocialNetwork.TIKTOK, "p_ok");
        when(publications.findDraftsSentSince(FOURTEEN_DAYS_AGO, 20)).thenReturn(List.of(rejected, broken, unsaved, posted));
        when(tiktok.check("p_gone")).thenThrow(new SocialPublishingException(Code.REJECTED, "invalid_publish_id"));
        when(tiktok.check("p_broken")).thenThrow(new IllegalStateException("unexpected answer"));
        when(tiktok.check("p_unsaved")).thenReturn(DraftCheck.posted(null));
        when(tiktok.check("p_ok")).thenReturn(DraftCheck.posted(LINK));
        when(publications.saveIfStatus(any(), eq(PublicationStatus.DRAFT_SENT))).thenAnswer(call -> {
            SocialPublication publication = call.getArgument(0);
            if (publication.id().equals(unsaved.id())) {
                throw new IllegalStateException("database down");
            }
            return true;
        });

        assertThat(service.syncDrafts(NOW)).isEqualTo(1);

        verify(tiktok).check("p_ok");
        assertThat(rejected.status()).isEqualTo(PublicationStatus.DRAFT_SENT);
        assertThat(broken.status()).isEqualTo(PublicationStatus.DRAFT_SENT);
        assertThat(posted.status()).isEqualTo(PublicationStatus.PUBLISHED);
    }

    @Test
    void aFailureOfTheWholeNetworkStopsItsChecksUntilTheNextSweep() {
        for (Code code : new Code[] {Code.NOT_CONNECTED, Code.TOKEN_INVALID, Code.RATE_LIMITED}) {
            SocialDraftTracker network = tracker(SocialNetwork.TIKTOK);
            SocialPublicationRepository stored = mock(SocialPublicationRepository.class);
            when(stored.findDraftsSentSince(any(), anyInt())).thenReturn(List.of(draft(SocialNetwork.TIKTOK, "p1"),
                    draft(SocialNetwork.TIKTOK, "p2")));
            when(network.check("p1")).thenThrow(new SocialPublishingException(code, "network-wide"));

            assertThat(new SyncSocialDraftsService(stored, List.of(network), 14, 20).syncDrafts(NOW)).as(code.name()).isZero();

            verify(network, never()).check("p2");
            verify(stored, never()).saveIfStatus(any(), any());
        }
    }

    @Test
    void theWindowAndTheCapComeFromTheSettings() {
        SyncSocialDraftsService narrow = new SyncSocialDraftsService(publications, List.of(tiktok), 3, 5);
        when(publications.findDraftsSentSince(any(), anyInt())).thenReturn(List.of());

        assertThat(narrow.syncDrafts(NOW)).isZero();

        verify(publications).findDraftsSentSince(Instant.parse("2026-11-02T12:00:00Z"), 5);
        assertThatThrownBy(() -> new SyncSocialDraftsService(publications, List.of(tiktok), 0, 20))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("window-days");
        assertThatThrownBy(() -> new SyncSocialDraftsService(publications, List.of(tiktok), 14, 0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("max-per-sweep");
    }

    @Test
    void theTrackersComeFromTheContext() {
        @SuppressWarnings("unchecked")
        ObjectProvider<SocialDraftTracker> provider = mock(ObjectProvider.class);
        when(provider.orderedStream()).thenReturn(Stream.of(tiktok));
        SyncSocialDraftsService wired = new SyncSocialDraftsService(publications, provider, 14, 20);
        when(publications.findDraftsSentSince(FOURTEEN_DAYS_AGO, 20)).thenReturn(List.of(draft(SocialNetwork.TIKTOK, "p1")));
        when(tiktok.check("p1")).thenReturn(DraftCheck.posted(null));
        when(publications.saveIfStatus(any(), eq(PublicationStatus.DRAFT_SENT))).thenReturn(true);

        assertThat(wired.syncDrafts(NOW)).isEqualTo(1);
    }

    private static SocialDraftTracker tracker(SocialNetwork network) {
        SocialDraftTracker tracker = mock(SocialDraftTracker.class);
        when(tracker.network()).thenReturn(network);
        return tracker;
    }

    private static SocialPublication draft(SocialNetwork network, String externalId) {
        return SocialPublication.restore(UUID.randomUUID(), UUID.randomUUID(), network, PublicationStatus.DRAFT_SENT, externalId, null, 1,
                null, SENT, SENT, SENT);
    }
}
