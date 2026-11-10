package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.model.SocialAccountDisconnectResult;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountMetaSettings;
import com.vinnot.marketing.application.model.SocialAccountResponse;
import com.vinnot.marketing.application.model.SocialAccountSummary;
import com.vinnot.marketing.application.port.out.SocialAccountConnectStates;
import com.vinnot.marketing.application.port.out.SocialAccountOAuthProvider;
import com.vinnot.marketing.application.port.out.SocialAccountStore;
import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** #510 S5 C5: the admin lists each network's connection, connects Threads and TikTok with OAuth and removes them. */
class SocialAccountAdminServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00Z");
    private static final String STATE = "state-123";
    private final SocialAccountStore store = mock(SocialAccountStore.class);
    private final SocialAccountConnectStates states = mock(SocialAccountConnectStates.class);
    private final SocialAccountOAuthProvider threads = mock(SocialAccountOAuthProvider.class);
    private final SocialAccountOAuthProvider tiktok = mock(SocialAccountOAuthProvider.class);
    private final UUID admin = UUID.randomUUID();
    private SocialAccountAdminService service;

    @BeforeEach
    void setUp() {
        when(threads.network()).thenReturn(SocialNetwork.THREADS);
        when(tiktok.network()).thenReturn(SocialNetwork.TIKTOK);
        when(threads.configured()).thenReturn(true);
        when(tiktok.configured()).thenReturn(true);
        when(store.encryptionReady()).thenReturn(true);
        service = service(new SocialAccountMetaSettings("1784", "1020", true));
    }

    private SocialAccountAdminService service(SocialAccountMetaSettings meta) {
        return new SocialAccountAdminService(store, List.of(tiktok, threads), states, meta, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void listsTheFourNetworksWithTheirModeAndConnectionAndNeverATokenField() {
        Instant threadsEnd = NOW.plus(Duration.ofDays(50));
        Instant tiktokRefreshEnd = NOW.plus(Duration.ofDays(170));
        when(store.summaries()).thenReturn(List.of(
                new SocialAccountSummary(SocialNetwork.THREADS, "th-1", "vinnot", SocialAccountStatus.CONNECTED, threadsEnd, null, null, NOW),
                new SocialAccountSummary(SocialNetwork.TIKTOK, "open-1", "Vinnot", SocialAccountStatus.REFRESH_FAILED, NOW.minusSeconds(60),
                        tiktokRefreshEnd, "PROVIDER_REJECTED", NOW)));

        List<SocialAccountResponse> accounts = service.list();

        assertThat(accounts).extracting(SocialAccountResponse::network).containsExactly(SocialNetwork.values());
        assertThat(accounts.get(0)).isEqualTo(new SocialAccountResponse(SocialNetwork.INSTAGRAM, SocialAccountResponse.Mode.CONFIG, true,
                true, "1784", null, SocialAccountStatus.CONNECTED, null, null));
        assertThat(accounts.get(1)).isEqualTo(new SocialAccountResponse(SocialNetwork.FACEBOOK, SocialAccountResponse.Mode.CONFIG, true,
                true, "1020", null, SocialAccountStatus.CONNECTED, null, null));
        assertThat(accounts.get(2)).isEqualTo(new SocialAccountResponse(SocialNetwork.THREADS, SocialAccountResponse.Mode.OAUTH, true,
                true, "th-1", "vinnot", SocialAccountStatus.CONNECTED, threadsEnd, null));
        assertThat(accounts.get(3)).isEqualTo(new SocialAccountResponse(SocialNetwork.TIKTOK, SocialAccountResponse.Mode.OAUTH, true,
                false, "open-1", "Vinnot", SocialAccountStatus.REFRESH_FAILED, tiktokRefreshEnd, "PROVIDER_REJECTED"));
        assertThat(SocialAccountResponse.class.getRecordComponents()).extracting(component -> component.getName().toLowerCase())
                .noneMatch(name -> name.contains("token"));
    }

    @Test
    void unconfiguredOrExpiredNetworksAreNotConnected() {
        when(tiktok.configured()).thenReturn(false);
        when(store.summaries()).thenReturn(List.of(new SocialAccountSummary(SocialNetwork.THREADS, "th-1", null,
                SocialAccountStatus.CONNECTED, NOW, null, null, NOW)));

        List<SocialAccountResponse> accounts = service(new SocialAccountMetaSettings(" ", null, true)).list();

        assertThat(accounts.get(0).configured()).isFalse();
        assertThat(accounts.get(0).connected()).isFalse();
        assertThat(accounts.get(0).status()).isNull();
        assertThat(accounts.get(1).connected()).isFalse();
        assertThat(accounts.get(2).connected()).isFalse();
        assertThat(accounts.get(2).status()).isEqualTo(SocialAccountStatus.CONNECTED);
        assertThat(accounts.get(3)).isEqualTo(new SocialAccountResponse(SocialNetwork.TIKTOK, SocialAccountResponse.Mode.OAUTH, false,
                false, null, null, null, null, null));
    }

    @Test
    void metaIsNotConfiguredWithoutAToken() {
        when(store.summaries()).thenReturn(List.of());

        List<SocialAccountResponse> accounts = service(new SocialAccountMetaSettings("1784", "1020", false)).list();

        assertThat(accounts.get(0).configured()).isFalse();
        assertThat(accounts.get(1).configured()).isFalse();
    }

    @Test
    void connectingReturnsTheConsentUrlWithAStateBoundToTheAdminAndTheNetwork() {
        when(states.issue(admin, SocialNetwork.THREADS, NOW)).thenReturn(STATE);
        when(threads.authorizeUrl(STATE)).thenReturn("https://threads.com/oauth/authorize?state=" + STATE);

        assertThat(service.connectUrl(SocialNetwork.THREADS, admin)).isEqualTo("https://threads.com/oauth/authorize?state=" + STATE);
    }

    @Test
    void metaCannotBeConnectedWithOAuth() {
        assertThatThrownBy(() -> service.connectUrl(SocialNetwork.INSTAGRAM, admin))
                .isInstanceOfSatisfying(BusinessRuleViolationException.class,
                        error -> assertThat(error.getCode()).isEqualTo(SocialAccountAdminService.NOT_OAUTH));
        verifyNoInteractions(states);
    }

    @Test
    void anUnconfiguredNetworkCannotBeConnected() {
        when(tiktok.configured()).thenReturn(false);

        assertThatThrownBy(() -> service.connectUrl(SocialNetwork.TIKTOK, admin))
                .isInstanceOfSatisfying(BusinessRuleViolationException.class,
                        error -> assertThat(error.getCode()).isEqualTo(SocialAccountAdminService.NOT_CONFIGURED));
        verifyNoInteractions(states);
    }

    @Test
    void nothingCanBeConnectedWithoutTheEncryptionKey() {
        when(store.encryptionReady()).thenReturn(false);

        assertThatThrownBy(() -> service.connectUrl(SocialNetwork.TIKTOK, admin))
                .isInstanceOfSatisfying(BusinessRuleViolationException.class,
                        error -> assertThat(error.getCode()).isEqualTo(SocialAccountAdminService.ENCRYPTION_KEY_MISSING));
        verifyNoInteractions(states);
    }

    @Test
    void theCallbackExchangesTheCodeAndStoresTheAccountAsTheAdminWhoStartedIt() {
        SocialAccountGrant grant = new SocialAccountGrant("open-1", "Vinnot", "access", NOW.plusSeconds(7200), "refresh", NOW.plusSeconds(9000));
        when(states.consume(STATE, SocialNetwork.TIKTOK, NOW)).thenReturn(Optional.of(admin));
        when(tiktok.exchange("code-1")).thenReturn(grant);

        assertThat(service.completeConnection(SocialNetwork.TIKTOK, "code-1", STATE, null)).isTrue();

        verify(store).connect(SocialNetwork.TIKTOK, grant, admin, NOW);
    }

    @Test
    void aBadOrUsedStateFailsWithoutExchangingTheCode() {
        when(states.consume(STATE, SocialNetwork.TIKTOK, NOW)).thenReturn(Optional.empty());

        assertThat(service.completeConnection(SocialNetwork.TIKTOK, "code-1", STATE, null)).isFalse();

        verify(tiktok, never()).exchange(any());
        verify(store, never()).connect(any(), any(), any(), any());
    }

    @Test
    void theNetworksErrorOrAMissingCodeFailsAndStillUsesTheStateUp() {
        when(states.consume(STATE, SocialNetwork.THREADS, NOW)).thenReturn(Optional.of(admin));

        assertThat(service.completeConnection(SocialNetwork.THREADS, "code-1", STATE, "access_denied")).isFalse();
        assertThat(service.completeConnection(SocialNetwork.THREADS, " ", STATE, null)).isFalse();
        assertThat(service.completeConnection(SocialNetwork.THREADS, null, STATE, null)).isFalse();

        verify(threads, never()).exchange(any());
    }

    @Test
    void aFailedExchangeStoresNothing() {
        when(states.consume(STATE, SocialNetwork.THREADS, NOW)).thenReturn(Optional.of(admin));
        when(threads.exchange("code-1")).thenThrow(new SocialAccountOAuthProvider.Failure(true, "exchange refused"));

        assertThat(service.completeConnection(SocialNetwork.THREADS, "code-1", STATE, null)).isFalse();

        verify(store, never()).connect(any(), any(), any(), any());
    }

    @Test
    void aStorageFailureFailsTheCallback() {
        SocialAccountGrant grant = new SocialAccountGrant("th-1", null, "access", NOW.plusSeconds(60), null, null);
        when(states.consume(STATE, SocialNetwork.THREADS, NOW)).thenReturn(Optional.of(admin));
        when(threads.exchange("code-1")).thenReturn(grant);
        doThrow(new IllegalStateException("no key")).when(store).connect(SocialNetwork.THREADS, grant, admin, NOW);

        assertThat(service.completeConnection(SocialNetwork.THREADS, "code-1", STATE, null)).isFalse();
    }

    @Test
    void aNetworkWithoutOAuthOrConfigurationFailsTheCallback() {
        when(states.consume(STATE, SocialNetwork.FACEBOOK, NOW)).thenReturn(Optional.of(admin));
        when(states.consume(STATE, SocialNetwork.TIKTOK, NOW)).thenReturn(Optional.of(admin));
        when(tiktok.configured()).thenReturn(false);

        assertThat(service.completeConnection(SocialNetwork.FACEBOOK, "code-1", STATE, null)).isFalse();
        assertThat(service.completeConnection(SocialNetwork.TIKTOK, "code-1", STATE, null)).isFalse();

        verify(tiktok, never()).exchange(any());
    }

    @Test
    void metaCannotBeRemovedAndOAuthAccountsAre() {
        when(store.delete(SocialNetwork.THREADS)).thenReturn(true);
        when(store.delete(SocialNetwork.TIKTOK)).thenReturn(false);

        assertThat(service.disconnect(SocialNetwork.FACEBOOK)).isEqualTo(SocialAccountDisconnectResult.CONFIGURED_BY_SECRETS);
        assertThat(service.disconnect(SocialNetwork.INSTAGRAM)).isEqualTo(SocialAccountDisconnectResult.CONFIGURED_BY_SECRETS);
        assertThat(service.disconnect(SocialNetwork.THREADS)).isEqualTo(SocialAccountDisconnectResult.REMOVED);
        assertThat(service.disconnect(SocialNetwork.TIKTOK)).isEqualTo(SocialAccountDisconnectResult.NOT_CONNECTED);
        verify(store, never()).delete(SocialNetwork.FACEBOOK);
    }

    @Test
    void theSpringConstructorUsesTheSystemClock() {
        assertThat(new SocialAccountAdminService(store, List.of(), states, new SocialAccountMetaSettings(null, null, false)).list())
                .hasSize(SocialNetwork.values().length);
    }
}
