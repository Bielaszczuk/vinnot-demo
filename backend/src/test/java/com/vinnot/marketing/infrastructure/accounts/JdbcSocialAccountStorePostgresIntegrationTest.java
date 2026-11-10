package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.exception.UnreadableSocialAccountException;
import com.vinnot.marketing.application.model.SocialAccountGrant;
import com.vinnot.marketing.application.model.SocialAccountRefreshClaim;
import com.vinnot.marketing.domain.model.SocialAccount;
import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S5 (V82 social_accounts): encrypted connect upsert, exclusive refresh leases, refreshed and failed marks, delete. */
@Testcontainers(disabledWithoutDocker = true)
class JdbcSocialAccountStorePostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-04T12:00:00.123456Z");
    private static JdbcTemplate jdbc;
    private static JdbcSocialAccountStore store;
    private final UUID admin = UUID.randomUUID();

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        store = new JdbcSocialAccountStore(jdbc, new SocialAccountCipher(SocialAccountCipherTest.KEY));
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM social_accounts");
    }

    private SocialAccountGrant tiktok(String access, String refresh, Instant accessEnd) {
        return new SocialAccountGrant("open-1", "Vinnot", access, accessEnd, refresh, NOW.plus(Duration.ofDays(365)));
    }

    @Test
    void connectingStoresTheTokensEncryptedAndReadsThemBack() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(7200)), admin, NOW);

        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM social_accounts WHERE network = 'TIKTOK'");
        assertThat(row.get("access_token_ciphertext").toString()).startsWith("v1:").doesNotContain("access-1");
        assertThat(row.get("refresh_token_ciphertext").toString()).startsWith("v1:").doesNotContain("refresh-1");
        SocialAccount account = store.find(SocialNetwork.TIKTOK).orElseThrow();
        assertThat(account.accessToken()).isEqualTo("access-1");
        assertThat(account.refreshToken()).isEqualTo("refresh-1");
        assertThat(account.accountId()).isEqualTo("open-1");
        assertThat(account.displayName()).isEqualTo("Vinnot");
        assertThat(account.status()).isEqualTo(SocialAccountStatus.CONNECTED);
        assertThat(account.connectedBy()).isEqualTo(admin);
        assertThat(account.accessExpiresAt()).isEqualTo(NOW.plusSeconds(7200));
        assertThat(account.connectedAt()).isEqualTo(NOW);
        assertThat(account.updatedAt()).isEqualTo(NOW);
        assertThat(store.encryptionReady()).isTrue();
        assertThat(store.find(SocialNetwork.THREADS)).isEmpty();
    }

    @Test
    void ciphertextCannotBeMovedToAnotherNetwork() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(7200)), admin, NOW);
        store.connect(SocialNetwork.THREADS, new SocialAccountGrant("th-1", null, "threads-access", NOW.plusSeconds(60), null, null), admin, NOW);
        jdbc.update("UPDATE social_accounts SET access_token_ciphertext = (SELECT access_token_ciphertext FROM social_accounts WHERE network = 'TIKTOK')"
                + " WHERE network = 'THREADS'");

        assertThatThrownBy(() -> store.find(SocialNetwork.THREADS)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void reconnectingReplacesTheAccountAndClearsAFailure() {
        store.connect(SocialNetwork.THREADS, new SocialAccountGrant("th-1", "old", "access-1", NOW.plusSeconds(60), null, null), admin, NOW);
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.THREADS, NOW, NOW.plusSeconds(120), NOW).orElseThrow();
        store.markRefreshFailed(claim, "PROVIDER_REJECTED");
        UUID other = UUID.randomUUID();

        store.connect(SocialNetwork.THREADS, new SocialAccountGrant("th-2", "new", "access-2", NOW.plus(Duration.ofDays(60)), null, null), other,
                NOW.plusSeconds(10));

        SocialAccount account = store.find(SocialNetwork.THREADS).orElseThrow();
        assertThat(account.accountId()).isEqualTo("th-2");
        assertThat(account.accessToken()).isEqualTo("access-2");
        assertThat(account.refreshToken()).isNull();
        assertThat(account.status()).isEqualTo(SocialAccountStatus.CONNECTED);
        assertThat(account.lastError()).isNull();
        assertThat(account.connectedBy()).isEqualTo(other);
        assertThat(store.summaries()).hasSize(1);
    }

    @Test
    void onlyDueAccountsAreClaimedAndOnlyOnceWhileTheLeaseLasts() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(600)), admin, NOW);

        assertThat(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(599), NOW)).isEmpty();
        assertThat(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW.minusSeconds(1))).isEmpty();
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW).orElseThrow();
        assertThat(claim.accessToken()).isEqualTo("access-1");
        assertThat(claim.refreshToken()).isEqualTo("refresh-1");
        assertThat(claim.accountId()).isEqualTo("open-1");
        assertThat(claim.claimedUntil()).isEqualTo(NOW.plus(JdbcSocialAccountStore.LEASE));
        assertThat(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW.plusSeconds(1), NOW.plusSeconds(600), NOW)).isEmpty();
        assertThat(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW.plus(JdbcSocialAccountStore.LEASE), NOW.plusSeconds(600), NOW)).isPresent();
    }

    @Test
    void concurrentRefreshersGetOneLease() throws Exception {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(600)), admin, NOW);
        int workers = 8;
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Optional<SocialAccountRefreshClaim>>> claims = new ArrayList<>();
        try {
            for (int index = 0; index < workers; index++) {
                Callable<Optional<SocialAccountRefreshClaim>> claim = () -> {
                    start.await();
                    return store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW);
                };
                claims.add(pool.submit(claim));
            }
            start.countDown();
            int won = 0;
            for (Future<Optional<SocialAccountRefreshClaim>> claim : claims) {
                won += claim.get(30, TimeUnit.SECONDS).isPresent() ? 1 : 0;
            }
            assertThat(won).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void aRefreshStoresTheRotatedRefreshTokenAndEndsTheLease() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(600)), admin, NOW);
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW).orElseThrow();
        Instant later = NOW.plusSeconds(5);

        assertThat(store.markRefreshed(claim, new SocialAccountGrant("open-1", null, "access-2", later.plusSeconds(86_400), "refresh-2",
                later.plus(Duration.ofDays(365))), later)).isTrue();

        SocialAccount account = store.find(SocialNetwork.TIKTOK).orElseThrow();
        assertThat(account.accessToken()).isEqualTo("access-2");
        assertThat(account.refreshToken()).isEqualTo("refresh-2");
        assertThat(account.accessExpiresAt()).isEqualTo(later.plusSeconds(86_400));
        assertThat(account.refreshExpiresAt()).isEqualTo(later.plus(Duration.ofDays(365)));
        assertThat(account.displayName()).isEqualTo("Vinnot");
        assertThat(account.updatedAt()).isEqualTo(later);
        assertThat(jdbc.queryForObject("SELECT refresh_claimed_until FROM social_accounts", Object.class)).isNull();
        assertThat(store.markRefreshed(claim, tiktok("access-3", "refresh-3", later), later)).isFalse();
    }

    @Test
    void aThreadsRefreshKeepsItsMissingRefreshToken() {
        store.connect(SocialNetwork.THREADS, new SocialAccountGrant("th-1", "vinnot", "access-1", NOW.plus(Duration.ofDays(5)), null, null), admin,
                NOW.minus(Duration.ofDays(55)));
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.THREADS, NOW, NOW.plus(Duration.ofDays(10)),
                NOW.minus(Duration.ofHours(24))).orElseThrow();

        assertThat(store.markRefreshed(claim, new SocialAccountGrant("th-1", null, "access-2", NOW.plus(Duration.ofDays(60)), null, null), NOW))
                .isTrue();

        SocialAccount account = store.find(SocialNetwork.THREADS).orElseThrow();
        assertThat(account.accessToken()).isEqualTo("access-2");
        assertThat(account.refreshToken()).isNull();
        assertThat(account.refreshExpiresAt()).isNull();
    }

    @Test
    void aTokenWrittenLessThanADayAgoIsNotClaimed() {
        store.connect(SocialNetwork.THREADS, new SocialAccountGrant("th-1", null, "access-1", NOW.plus(Duration.ofDays(5)), null, null), admin,
                NOW.minus(Duration.ofHours(23)));

        assertThat(store.claimDueForRefresh(SocialNetwork.THREADS, NOW, NOW.plus(Duration.ofDays(10)), NOW.minus(Duration.ofHours(24)))).isEmpty();
    }

    @Test
    void aFailedRefreshIsMarkedOnceAndTheAccountIsNoLongerClaimed() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(600)), admin, NOW);
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW).orElseThrow();

        assertThat(store.markRefreshFailed(claim, "PROVIDER_REJECTED")).isTrue();
        assertThat(store.markRefreshFailed(claim, "PROVIDER_REJECTED")).isFalse();

        SocialAccount account = store.find(SocialNetwork.TIKTOK).orElseThrow();
        assertThat(account.status()).isEqualTo(SocialAccountStatus.REFRESH_FAILED);
        assertThat(account.lastError()).isEqualTo("PROVIDER_REJECTED");
        assertThat(account.updatedAt()).isEqualTo(NOW);
        assertThat(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW.plus(Duration.ofHours(1)), NOW.plus(Duration.ofDays(1)), NOW)).isEmpty();
        assertThat(store.summaries()).singleElement().satisfies(summary -> {
            assertThat(summary.status()).isEqualTo(SocialAccountStatus.REFRESH_FAILED);
            assertThat(summary.lastError()).isEqualTo("PROVIDER_REJECTED");
            assertThat(summary.refreshExpiresAt()).isEqualTo(NOW.plus(Duration.ofDays(365)));
        });
    }

    @Test
    void aReleasedClaimStaysConnectedAndIsClaimedAgain() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(600)), admin, NOW);
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW).orElseThrow();

        store.releaseClaim(claim, "PROVIDER_UNAVAILABLE");

        SocialAccount account = store.find(SocialNetwork.TIKTOK).orElseThrow();
        assertThat(account.status()).isEqualTo(SocialAccountStatus.CONNECTED);
        assertThat(account.lastError()).isEqualTo("PROVIDER_UNAVAILABLE");
        assertThat(store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW)).isPresent();
    }

    @Test
    void aLeaseIsLostWhenTheAccountIsReconnectedMeanwhile() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(600)), admin, NOW);
        SocialAccountRefreshClaim claim = store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW).orElseThrow();
        store.connect(SocialNetwork.TIKTOK, tiktok("access-new", "refresh-new", NOW.plusSeconds(7200)), admin, NOW.plusSeconds(1));

        assertThat(store.markRefreshed(claim, tiktok("access-2", "refresh-2", NOW.plusSeconds(9000)), NOW.plusSeconds(2))).isFalse();
        assertThat(store.markRefreshFailed(claim, "PROVIDER_REJECTED")).isFalse();
        assertThat(store.find(SocialNetwork.TIKTOK).orElseThrow().accessToken()).isEqualTo("access-new");
    }

    @Test
    void deletingRemovesTheAccount() {
        store.connect(SocialNetwork.THREADS, new SocialAccountGrant("th-1", null, "access-1", NOW.plusSeconds(60), null, null), admin, NOW);

        assertThat(store.delete(SocialNetwork.THREADS)).isTrue();
        assertThat(store.delete(SocialNetwork.THREADS)).isFalse();
        assertThat(store.find(SocialNetwork.THREADS)).isEmpty();
    }

    @Test
    void withoutAKeyNothingIsConnected() {
        JdbcSocialAccountStore keyless = new JdbcSocialAccountStore(jdbc, new SocialAccountCipher(""));

        assertThat(keyless.encryptionReady()).isFalse();
        assertThatThrownBy(() -> keyless.connect(SocialNetwork.THREADS,
                new SocialAccountGrant("th-1", null, "access-1", NOW, null, null), admin, NOW)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM social_accounts", Integer.class)).isZero();
    }

    @Test
    void aTokenThatCannotBeDecryptedMarksTheAccountFailedOnceWithoutItsMessage() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(60)), admin, NOW);
        byte[] rotated = new byte[32];
        Arrays.fill(rotated, (byte) 7);
        JdbcSocialAccountStore rotatedKey = new JdbcSocialAccountStore(jdbc, new SocialAccountCipher(Base64.getEncoder().encodeToString(rotated)));

        assertThatThrownBy(() -> rotatedKey.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW))
                .isInstanceOfSatisfying(UnreadableSocialAccountException.class, unreadable -> {
                    assertThat(unreadable.network()).isEqualTo(SocialNetwork.TIKTOK);
                    assertThat(unreadable.newlyFailed()).isTrue();
                });

        Map<String, Object> row = jdbc.queryForMap("SELECT status, last_error, refresh_claimed_until FROM social_accounts WHERE network = 'TIKTOK'");
        assertThat(row.get("status")).isEqualTo("REFRESH_FAILED");
        assertThat(row.get("last_error")).isEqualTo(UnreadableSocialAccountException.CODE);
        assertThat(row.get("refresh_claimed_until")).as("the lease is released").isNull();
        assertThat(rotatedKey.claimDueForRefresh(SocialNetwork.TIKTOK, NOW.plus(JdbcSocialAccountStore.LEASE), NOW.plusSeconds(600), NOW))
                .as("a failed account is not claimed again").isEmpty();
    }

    @Test
    void aMalformedRefreshTokenIsUnreadableToo() {
        store.connect(SocialNetwork.TIKTOK, tiktok("access-1", "refresh-1", NOW.plusSeconds(60)), admin, NOW);
        jdbc.update("UPDATE social_accounts SET refresh_token_ciphertext = 'garbage' WHERE network = 'TIKTOK'");

        assertThatThrownBy(() -> store.claimDueForRefresh(SocialNetwork.TIKTOK, NOW, NOW.plusSeconds(600), NOW))
                .isInstanceOf(UnreadableSocialAccountException.class).hasMessageNotContaining("garbage");
        assertThat(jdbc.queryForObject("SELECT last_error FROM social_accounts WHERE network = 'TIKTOK'", String.class))
                .isEqualTo(UnreadableSocialAccountException.CODE);
    }
}
