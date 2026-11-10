package com.vinnot.user.application.command.handler;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.LogoutCommand;
import com.vinnot.user.application.command.model.RefreshTokenCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AuthSessionResponseFactory;
import com.vinnot.user.application.service.RefreshTokenHasher;
import com.vinnot.user.application.service.RefreshTokenReuseResponder;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;
import java.util.Optional;
import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@ExtendWith(MockitoExtension.class)
class SessionCommandHandlersTest {
    private final ManagePushDevicesUseCase pushDevices = mock(ManagePushDevicesUseCase.class);

    private static final String RAW_REFRESH_TOKEN = "raw-refresh-token";
    private static final long REFRESH_EXPIRATION_MILLIS = 604_800_000L;

    @Mock
    private RefreshTokenRepositoryPort refreshTokenRepository;
    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private TokenService tokenService;
    @Mock
    private AuthSessionResponseFactory responseFactory;
    @Mock
    private RefreshTokenReuseResponder reuse;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.create(
                "session-user",
                Email.of("session@vinnot.com"),
                Password.fromHash("password-hash"),
                "Session",
                "User");
        user.verifyEmail();
    }

    @Test
    void refreshRotatesTokenAndPreservesRolesAndPermissions() {
        String oldHash = sha256(RAW_REFRESH_TOKEN);
        String newHash = sha256("new-refresh-token");
        when(refreshTokenRepository.findByTokenHash(oldHash))
                .thenReturn(Optional.of(storedToken(oldHash, true)));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(tokenService.generateRefreshToken()).thenReturn("new-refresh-token");
        when(tokenService.getRefreshTokenExpiration()).thenReturn(REFRESH_EXPIRATION_MILLIS);
        when(responseFactory.create(user, "new-refresh-token"))
                .thenReturn(new AuthSessionResponse(
                        "new-access-token", "new-refresh-token", "Bearer", 900_000L, null));
        RefreshTokenCommandHandler handler = refreshHandler();

        AuthSessionResponse response = handler.execute(
                new RefreshTokenCommand(RAW_REFRESH_TOKEN));

        assertThat(response.accessToken()).isEqualTo("new-access-token");
        assertThat(response.refreshToken()).isEqualTo("new-refresh-token");
        verify(refreshTokenRepository).revoke(oldHash, "rotated", newHash);
        verify(refreshTokenRepository).save(
                eq(user.getId()), eq(newHash), any(Instant.class), eq(0L));
    }

    @Test
    void refreshRejectsAnExpiredOrRevokedTokenWithoutSideEffects() {
        String tokenHash = sha256(RAW_REFRESH_TOKEN);
        when(refreshTokenRepository.findByTokenHash(tokenHash))
                .thenReturn(Optional.of(storedToken(tokenHash, false)));
        RefreshTokenCommandHandler handler = refreshHandler();

        assertThatThrownBy(() -> handler.execute(
                new RefreshTokenCommand(RAW_REFRESH_TOKEN)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("INVALID_TOKEN");

        verify(userRepository, never()).findById(any());
        verify(refreshTokenRepository, never()).revoke(any(), any(), any());
        verify(tokenService, never()).generateRefreshToken();
    }

    @Test
    void refreshRejectsAnAccountLockedAfterTheSessionWasIssued() {
        String tokenHash = sha256(RAW_REFRESH_TOKEN);
        user.lock("Security review");
        when(refreshTokenRepository.findByTokenHash(tokenHash))
                .thenReturn(Optional.of(storedToken(tokenHash, true)));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        RefreshTokenCommandHandler handler = refreshHandler();

        assertThatThrownBy(() -> handler.execute(
                new RefreshTokenCommand(RAW_REFRESH_TOKEN)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("ACCOUNT_LOCKED");

        verify(refreshTokenRepository, never()).revoke(any(), any(), any());
        verify(tokenService, never()).generateRefreshToken();
    }

    @Test
    void refreshRejectsAnAccountDeactivatedAfterTheSessionWasIssued() {
        String tokenHash = sha256(RAW_REFRESH_TOKEN);
        user.deactivate();
        when(refreshTokenRepository.findByTokenHash(tokenHash))
                .thenReturn(Optional.of(storedToken(tokenHash, true)));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        RefreshTokenCommandHandler handler = refreshHandler();

        assertThatThrownBy(() -> handler.execute(
                new RefreshTokenCommand(RAW_REFRESH_TOKEN)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("ACCOUNT_DEACTIVATED");

        verify(refreshTokenRepository, never()).revoke(any(), any(), any());
        verify(tokenService, never()).generateRefreshToken();
    }

    @Test
    void refreshRejectsAnAccountWhoseEmailBecameUnverified() {
        String tokenHash = RefreshTokenHasher.hash(RAW_REFRESH_TOKEN);
        User unverified = User.create(
                "pending-user",
                Email.of("pending@vinnot.com"),
                Password.fromHash("password-hash"),
                "Pending", "User");
        when(refreshTokenRepository.findByTokenHash(tokenHash))
                .thenReturn(Optional.of(storedToken(tokenHash, true)));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(unverified));

        assertThatThrownBy(() -> refreshHandler().execute(
                new RefreshTokenCommand(RAW_REFRESH_TOKEN)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("EMAIL_NOT_VERIFIED");
    }

    @Test
    void logoutWithoutRefreshTokenHasNoSideEffects() {
        new LogoutCommandHandler(refreshTokenRepository, pushDevices).execute(new LogoutCommand(null));

        verify(refreshTokenRepository, never()).revoke(any(), any(), any());
    }

    @Test
    void logoutRevokesThePresentedRefreshToken() {
        LogoutCommandHandler handler = new LogoutCommandHandler(refreshTokenRepository, pushDevices);

        handler.execute(new LogoutCommand(RAW_REFRESH_TOKEN));

        verify(refreshTokenRepository).revoke(
                sha256(RAW_REFRESH_TOKEN), "logout", null);
    }

    @Test
    void logoutForgetsThisDevicesPushTokenForTheSessionAccountOnly() {
        String hash = sha256(RAW_REFRESH_TOKEN);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(storedToken(hash, true)));

        new LogoutCommandHandler(refreshTokenRepository, pushDevices).execute(new LogoutCommand(RAW_REFRESH_TOKEN, "ExpoPushToken[abc]"));

        verify(pushDevices).unregister(user.getId(), "ExpoPushToken[abc]");
        verify(refreshTokenRepository).revoke(hash, "logout", null);
    }

    @Test
    void logoutWithAnExpiredOrRevokedSessionStillForgetsThisDeviceForThatAccount() {
        String hash = sha256(RAW_REFRESH_TOKEN);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(storedToken(hash, false)));

        new LogoutCommandHandler(refreshTokenRepository, pushDevices).execute(new LogoutCommand(RAW_REFRESH_TOKEN, "ExpoPushToken[abc]"));

        verify(pushDevices).unregister(user.getId(), "ExpoPushToken[abc]");
        verifyNoMoreInteractions(pushDevices);
    }

    @Test
    void logoutWithAnUnknownSessionForgetsOnlyThePresentedToken() {
        String hash = sha256(RAW_REFRESH_TOKEN);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.empty());

        new LogoutCommandHandler(refreshTokenRepository, pushDevices).execute(new LogoutCommand(RAW_REFRESH_TOKEN, "ExpoPushToken[abc]"));

        verify(pushDevices).forgetToken("ExpoPushToken[abc]");
        verifyNoMoreInteractions(pushDevices);
        verify(refreshTokenRepository).revoke(hash, "logout", null);
    }

    @Test
    void logoutWithOnlyAPushTokenForgetsThatTokenAndRevokesNothing() {
        new LogoutCommandHandler(refreshTokenRepository, pushDevices).execute(new LogoutCommand(null, "ExpoPushToken[abc]"));

        verify(pushDevices).forgetToken("ExpoPushToken[abc]");
        verifyNoMoreInteractions(pushDevices);
        verify(refreshTokenRepository, never()).revoke(any(), any(), any());
    }

    @Test
    void rotationWithAnOperationIdIssuesTheDerivedSuccessor() {
        var operation = UUID.randomUUID();
        String oldHash = sha256(RAW_REFRESH_TOKEN);
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(storedToken(oldHash, true)));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(tokenService.deriveRefreshToken(RAW_REFRESH_TOKEN, operation)).thenReturn("derived");
        when(tokenService.getRefreshTokenExpiration()).thenReturn(REFRESH_EXPIRATION_MILLIS);
        refreshHandler().execute(new RefreshTokenCommand(RAW_REFRESH_TOKEN, operation));
        verify(refreshTokenRepository).revoke(oldHash, "rotated", sha256("derived"));
        verify(responseFactory).create(user, "derived");
        verify(tokenService, never()).generateRefreshToken();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "success", "wrong-operation", "expired-parent", "logout", "missing-successor",
            "revoked-successor", "different-user", "different-version", "account-version",
            "missing-user", "locked-user", "inactive-user", "unverified-user"})
    void recoveryOnlyReturnsTheSameLiveSuccessor(String scenario) {
        var operation = UUID.randomUUID();
        String oldHash = sha256(RAW_REFRESH_TOKEN);
        String nextHash = sha256("derived");
        var previous = new RefreshTokenRepositoryPort.RefreshTokenData(user.getId(), oldHash,
                Instant.now().plusSeconds(scenario.equals("expired-parent") ? -1 : 300),
                Instant.now(), scenario.equals("logout") ? "logout" : "rotated", false, 0, nextHash);
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(previous));
        if (!scenario.equals("expired-parent") && !scenario.equals("logout")) {
            when(tokenService.deriveRefreshToken(RAW_REFRESH_TOKEN, operation))
                    .thenReturn(scenario.equals("wrong-operation") ? "other" : "derived");
            if (!scenario.equals("wrong-operation")) {
                var next = new RefreshTokenRepositoryPort.RefreshTokenData(
                        scenario.equals("different-user") ? UUID.randomUUID() : user.getId(),
                        nextHash, Instant.now().plusSeconds(300), null, null,
                        !scenario.equals("revoked-successor"), scenario.equals("different-version") ? 1 : 0);
                when(refreshTokenRepository.findByTokenHash(nextHash))
                        .thenReturn(scenario.equals("missing-successor") ? Optional.empty() : Optional.of(next));
                if (!Set.of("missing-successor", "revoked-successor", "different-user", "different-version").contains(scenario)) {
                    if (scenario.equals("locked-user")) user.lock("test");
                    if (scenario.equals("inactive-user")) user.deactivate();
                    if (scenario.equals("account-version")) user.changePassword(Password.fromHash("changed"));
                    if (scenario.equals("unverified-user")) user = User.create("new-user", Email.of("new@example.com"),
                            Password.fromHash("hash"), "New", "User");
                    when(userRepository.findById(next.userId()))
                            .thenReturn(scenario.equals("missing-user") ? Optional.empty() : Optional.of(user));
                }
            }
        }
        if (scenario.equals("success")) {
            when(responseFactory.create(user, "derived")).thenReturn(
                    new AuthSessionResponse("access", "derived", "Bearer", 900_000L, null));
            assertThat(refreshHandler().execute(new RefreshTokenCommand(RAW_REFRESH_TOKEN, operation)).refreshToken())
                    .isEqualTo("derived");
        } else {
            assertThatThrownBy(() -> refreshHandler().execute(new RefreshTokenCommand(RAW_REFRESH_TOKEN, operation)))
                    .isInstanceOf(BusinessRuleViolationException.class);
        }
        verify(refreshTokenRepository, never()).save(any(), any(), any(), anyLong());
        verify(refreshTokenRepository, never()).revoke(any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"no-operation", "other-operation"})
    void aRotatedTokenReplayedOutsideTheRecoveryIsReportedAsReuseAndStillRefused(String scenario) {
        String oldHash = sha256(RAW_REFRESH_TOKEN);
        var rotated = new RefreshTokenRepositoryPort.RefreshTokenData(user.getId(), oldHash, Instant.now().plusSeconds(300),
                Instant.now().minusSeconds(600), "rotated", false, 0, sha256("derived"));
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(rotated));
        UUID operation = scenario.equals("no-operation") ? null : UUID.randomUUID();
        if (Objects.nonNull(operation)) {
            when(tokenService.deriveRefreshToken(RAW_REFRESH_TOKEN, operation)).thenReturn("other");
        }

        assertThatThrownBy(() -> refreshHandler().execute(new RefreshTokenCommand(RAW_REFRESH_TOKEN, operation)))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("INVALID_TOKEN");

        verify(reuse).replayed(rotated);
        verify(refreshTokenRepository, never()).save(any(), any(), any(), anyLong());
        verify(responseFactory, never()).create(any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"logout", "expired"})
    void aTokenEndedByLogoutOrExpiryIsRefusedWithoutReuseResponse(String scenario) {
        String oldHash = sha256(RAW_REFRESH_TOKEN);
        var ended = new RefreshTokenRepositoryPort.RefreshTokenData(user.getId(), oldHash,
                Instant.now().plusSeconds(scenario.equals("expired") ? -1 : 300), Instant.now().minusSeconds(600),
                scenario.equals("logout") ? "logout" : "rotated", false, 0, sha256("derived"));
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(ended));

        assertThatThrownBy(() -> refreshHandler().execute(new RefreshTokenCommand(RAW_REFRESH_TOKEN)))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("INVALID_TOKEN");

        verify(reuse, never()).replayed(any());
    }

    private RefreshTokenCommandHandler refreshHandler() {
        return new RefreshTokenCommandHandler(
                refreshTokenRepository, userRepository, tokenService, responseFactory, reuse);
    }

    private RefreshTokenRepositoryPort.RefreshTokenData storedToken(
            String tokenHash, boolean valid) {
        return new RefreshTokenRepositoryPort.RefreshTokenData(
                user.getId(), tokenHash, Instant.now().plusSeconds(300),
                valid ? null : Instant.now(), valid ? null : "expired", valid);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 not available", exception);
        }
    }
}
