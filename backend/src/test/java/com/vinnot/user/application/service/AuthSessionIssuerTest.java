package com.vinnot.user.application.service;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
class AuthSessionIssuerTest {

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private RefreshTokenRepositoryPort refreshTokenRepository;
    @Mock
    private TokenService tokenService;
    @Mock
    private AuthSessionResponseFactory responseFactory;
    @InjectMocks
    private AuthSessionIssuer issuer;

    @Test
    void recordsLoginPersistsOnlyTheRefreshHashAndReturnsTheRawTokenToTheClient() {
        User user = User.create(
                "wine-user", Email.of("user@example.com"),
                Password.fromHash("hash"), "Wine", "User");
        AuthSessionResponse expected = new AuthSessionResponse(
                "access", "raw-refresh", "Bearer", 1000, null);
        when(userRepository.save(user)).thenReturn(user);
        when(tokenService.generateRefreshToken()).thenReturn("raw-refresh");
        when(tokenService.getRefreshTokenExpiration()).thenReturn(60000L);
        when(responseFactory.create(user, "raw-refresh")).thenReturn(expected);

        AuthSessionResponse result = issuer.issue(user);

        assertThat(result).isSameAs(expected);
        assertThat(user.getLastLoginAt()).isNotNull();
        ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Instant> expirationCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(refreshTokenRepository).save(
                eq(user.getId()),
                hashCaptor.capture(), expirationCaptor.capture(), eq(0L));
        assertThat(hashCaptor.getValue())
                .isEqualTo(RefreshTokenHasher.hash("raw-refresh"))
                .doesNotContain("raw-refresh");
        assertThat(expirationCaptor.getValue()).isAfter(Instant.now());
    }
}
