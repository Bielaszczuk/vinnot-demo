package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.exception.UnreadableSocialAccountException;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.application.port.out.SocialPublishingNotices;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** #510 S5: tokens are refreshed before they expire; a failed refresh marks the account and tells the admins once. */
class SocialAccountRefreshServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");
    private static final Duration THREADS_LEAD = Duration.ofDays(10);
    private static final Duration THREADS_AGE = Duration.ofHours(24);
    private static final Duration TIKTOK_LEAD = Duration.ofMinutes(30);
    private final SocialAccountStore store = mock(SocialAccountStore.class);
    private final SocialPublishingNotices notices = mock(SocialPublishingNotices.class);
    private final SocialAccountOAuthProvider threads = mock(SocialAccountOAuthProvider.class);
    private final SocialAccountOAuthProvider tiktok = mock(SocialAccountOAuthProvider.class);
    private final Instant lease = NOW.plusSeconds(300);
    private final SocialAccountRefreshClaim threadsClaim = new SocialAccountRefreshClaim(SocialNetwork.THREADS, lease, "th-1", "old-access",
            NOW.plus(Duration.ofDays(5)), null, null);
    private final SocialAccountRefreshClaim tiktokClaim = new SocialAccountRefreshClaim(SocialNetwork.TIKTOK, lease, "open-1", "old-access",
            NOW.plusSeconds(600), "old-refresh", NOW.plus(Duration.ofDays(100)));
    private SocialAccountRefreshService service;

    @BeforeEach
    void setUp() {
        when(threads.network()).thenReturn(SocialNetwork.THREADS);
        when(threads.configured()).thenReturn(true);
        when(threads.refreshLead()).thenReturn(THREADS_LEAD);
        when(threads.minimumTokenAge()).thenReturn(THREADS_AGE);
        when(tiktok.network()).thenReturn(SocialNetwork.TIKTOK);
        when(tiktok.configured()).thenReturn(true);
        when(tiktok.refreshLead()).thenReturn(TIKTOK_LEAD);
        when(tiktok.minimumTokenAge()).thenReturn(Duration.ZERO);
        service = new SocialAccountRefreshService(store, List.of(threads, tiktok), notices, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private void due(SocialAccountRefreshClaim claim, Duration lead, Duration age) {
        when(store.claimDueForRefresh(claim.network(), NOW, NOW.plus(lead), NOW.minus(age))).thenReturn(Optional.of(claim));
    }

    @Test
    void aThreadsTokenInsideItsTenDayWindowIsExchangedForANewOne() {
        due(threadsClaim, THREADS_LEAD, THREADS_AGE);
        SocialAccountGrant renewed = new SocialAccountGrant("th-1", null, "new-access", NOW.plus(Duration.ofDays(60)), null, null);
        when(threads.refresh(threadsClaim)).thenReturn(renewed);
        when(store.markRefreshed(threadsClaim, renewed, NOW)).thenReturn(true);

        assertThat(service.refreshDue()).isEqualTo(1);

        verify(store).markRefreshed(threadsClaim, renewed, NOW);
        verifyNoInteractions(notices);
    }

    @Test
    void aTikTokRefreshStoresTheRotatedRefreshToken() {
        due(tiktokClaim, TIKTOK_LEAD, Duration.ZERO);
        SocialAccountGrant rotated = new SocialAccountGrant("open-1", null, "new-access", NOW.plusSeconds(86_400), "new-refresh",
                NOW.plus(Duration.ofDays(365)));
        when(tiktok.refresh(tiktokClaim)).thenReturn(rotated);
        when(store.markRefreshed(tiktokClaim, rotated, NOW)).thenReturn(true);

        assertThat(service.refreshDue()).isEqualTo(1);

        verify(store).markRefreshed(tiktokClaim, rotated, NOW);
    }

    @Test
    void accountsThatAreNotDueOrWhoseAppIsNotConfiguredAreLeftAlone() {
        when(store.claimDueForRefresh(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(tiktok.configured()).thenReturn(false);

        assertThat(service.refreshDue()).isZero();

        verify(store).claimDueForRefresh(SocialNetwork.THREADS, NOW, NOW.plus(THREADS_LEAD), NOW.minus(THREADS_AGE));
        verify(store, never()).claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plus(TIKTOK_LEAD), NOW);
        verify(threads, never()).refresh(any());
    }

    @Test
    void aRejectedRefreshMarksTheAccountAndTellsTheAdminsOnce() {
        due(tiktokClaim, TIKTOK_LEAD, Duration.ZERO);
        when(tiktok.refresh(tiktokClaim)).thenThrow(new SocialAccountOAuthProvider.Failure(true, "invalid_grant"));
        when(store.markRefreshFailed(tiktokClaim, SocialAccountOAuthProvider.Failure.REJECTED)).thenReturn(true, false);

        assertThat(service.refreshDue()).isZero();
        assertThat(service.refreshDue()).isZero();

        verify(notices).accountNeedsReconnect(SocialNetwork.TIKTOK);
    }

    @Test
    void aTransientFailureKeepsTheAccountConnectedForTheNextRun() {
        due(threadsClaim, THREADS_LEAD, THREADS_AGE);
        when(threads.refresh(threadsClaim)).thenThrow(new SocialAccountOAuthProvider.Failure(false, "503"));

        assertThat(service.refreshDue()).isZero();

        verify(store).releaseClaim(threadsClaim, SocialAccountOAuthProvider.Failure.UNAVAILABLE);
        verify(store, never()).markRefreshFailed(any(), any());
        verifyNoInteractions(notices);
    }

    @Test
    void anExpiredThreadsTokenCannotBeRefreshedAndAsksForAReconnect() {
        SocialAccountRefreshClaim expired = new SocialAccountRefreshClaim(SocialNetwork.THREADS, lease, "th-1", "old-access",
                NOW.minusSeconds(1), null, null);
        due(expired, THREADS_LEAD, THREADS_AGE);
        when(store.markRefreshFailed(expired, SocialAccountRefreshService.TOKEN_EXPIRED)).thenReturn(true);

        assertThat(service.refreshDue()).isZero();

        verify(threads, never()).refresh(any());
        verify(notices).accountNeedsReconnect(SocialNetwork.THREADS);
    }

    @Test
    void aRefreshWhoseLeaseWasLostIsNotCounted() {
        due(threadsClaim, THREADS_LEAD, THREADS_AGE);
        SocialAccountGrant renewed = new SocialAccountGrant("th-1", null, "new-access", NOW.plus(Duration.ofDays(60)), null, null);
        when(threads.refresh(threadsClaim)).thenReturn(renewed);
        when(store.markRefreshed(threadsClaim, renewed, NOW)).thenReturn(false);

        assertThat(service.refreshDue()).isZero();
    }

    @Test
    void theSpringConstructorUsesTheSystemClock() {
        assertThat(new SocialAccountRefreshService(store, List.of(), notices).refreshDue()).isZero();
    }

    @Test
    void anUnreadableTokenAsksForAReconnectOnceAndTheOtherNetworkIsStillRefreshed() {
        when(store.claimDueForRefresh(SocialNetwork.THREADS, NOW, NOW.plus(THREADS_LEAD), NOW.minus(THREADS_AGE)))
                .thenThrow(new UnreadableSocialAccountException(SocialNetwork.THREADS, true));
        due(tiktokClaim, TIKTOK_LEAD, Duration.ZERO);
        SocialAccountGrant rotated = new SocialAccountGrant("open-1", null, "new-access", NOW.plusSeconds(86_400), "new-refresh", null);
        when(tiktok.refresh(tiktokClaim)).thenReturn(rotated);
        when(store.markRefreshed(tiktokClaim, rotated, NOW)).thenReturn(true);

        assertThat(service.refreshDue()).isEqualTo(1);

        verify(notices).accountNeedsReconnect(SocialNetwork.THREADS);
        verify(threads, never()).refresh(any());
        verify(store).markRefreshed(tiktokClaim, rotated, NOW);
    }

    @Test
    void anUnreadableTokenAlreadyReportedIsNotReportedAgain() {
        when(store.claimDueForRefresh(SocialNetwork.THREADS, NOW, NOW.plus(THREADS_LEAD), NOW.minus(THREADS_AGE)))
                .thenThrow(new UnreadableSocialAccountException(SocialNetwork.THREADS, false));
        when(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plus(TIKTOK_LEAD), NOW)).thenReturn(Optional.empty());

        assertThat(service.refreshDue()).isZero();

        verifyNoInteractions(notices);
    }
}
