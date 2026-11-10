package com.vinnot.user.application.service;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.in.LoadUserPermissionsUseCase;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthSessionResponseFactoryTest {

    @Mock
    private SocialIdentityRepositoryPort socialIdentityRepository;
    @Mock
    private TokenService tokenService;
    @Mock
    private LoadUserPermissionsUseCase loadPermissions;

    @Test
    void createsTheCanonicalSessionContractUsingAccessTokenExpiration() {
        User user = User.create(
                "session-user",
                Email.of("session@vinnot.com"),
                Password.fromHash("password-hash"),
                "Session",
                "User");
        user.verifyEmail();
        when(loadPermissions.execute(user.getId())).thenReturn(Set.of("WINE_READ", "EVENT_READ"));
        when(tokenService.generateAccessToken(
                user.getId(),
                user.getEmail().getValue(),
                List.of("ROLE_USER"),
                List.of("EVENT_READ", "WINE_READ"), 0))
                .thenReturn("access-token");
        when(tokenService.getAccessTokenExpiration()).thenReturn(900_000L);
        when(socialIdentityRepository.findByUserId(user.getId())).thenReturn(List.of(
                SocialIdentity.create(user.getId(), SocialProvider.GOOGLE, "google-subject", "session@vinnot.com")));

        AuthSessionResponse response = new AuthSessionResponseFactory(
                socialIdentityRepository, tokenService, loadPermissions)
                .create(user, "refresh-token");

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(900_000L);
        assertThat(response.user().firstName()).isEqualTo("Session");
        assertThat(response.user().lastName()).isEqualTo("User");
        assertThat(response.user().roles()).containsExactly("ROLE_USER");
        assertThat(response.user().permissions()).containsExactly("EVENT_READ", "WINE_READ");
        assertThat(response.user().hasSocialIdentity()).isTrue();
        assertThat(response.user().hasPassword()).as("a local account linked to Google keeps its password").isTrue();
        assertThat(response.user().socialProviders()).containsExactly("GOOGLE");
    }

    @Test
    void anAccountCreatedBySocialSignInReportsThatItHasNoPassword() {
        User user = User.createSocial("vinnoter-abc12345", Email.of("social@vinnot.com"),
                Password.fromHash("unusable"), "So", "Cial");
        when(loadPermissions.execute(user.getId())).thenReturn(Set.of());
        when(socialIdentityRepository.findByUserId(user.getId())).thenReturn(List.of(
                SocialIdentity.create(user.getId(), SocialProvider.APPLE, "apple-subject", "social@vinnot.com")));

        AuthSessionResponse response = new AuthSessionResponseFactory(
                socialIdentityRepository, tokenService, loadPermissions)
                .create(user, "refresh-token");

        assertThat(response.user().hasSocialIdentity()).isTrue();
        assertThat(response.user().hasPassword()).isFalse();
    }
}
