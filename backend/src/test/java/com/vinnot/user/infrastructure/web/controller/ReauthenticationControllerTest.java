package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.user.application.command.model.ReauthenticateCommand;
import com.vinnot.user.application.port.in.ReauthenticateUseCase;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.infrastructure.security.SignedReauthenticationProofAdapter;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ReauthenticationControllerTest {
    @Test
    void bindsProofToAuthenticatedPrincipalAndAuthorizationWithoutCachingIt() {
        var useCase = mock(ReauthenticateUseCase.class);
        var user = UUID.randomUUID();
        var command = new ReauthenticateCommand(user,
                SignedReauthenticationProofAdapter.sessionBinding("Bearer access"), "password");
        when(useCase.execute(command)).thenReturn("proof");
        var response = new ReauthenticationController(useCase).confirm(user.toString(), "Bearer access",
                new ReauthenticationController.ConfirmationRequest("password"));
        assertThat(response.getBody()).isEqualTo(Map.of("proof", "proof"));
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        verify(useCase).execute(command);
    }

    @Test
    void forwardsAProviderCredentialWithTheSameSessionBinding() {
        var useCase = mock(ReauthenticateUseCase.class);
        var user = UUID.randomUUID();
        var command = ReauthenticateCommand.withProvider(user,
                SignedReauthenticationProofAdapter.sessionBinding("Bearer access"), SocialProvider.APPLE, "token", "nonce");
        when(useCase.execute(command)).thenReturn("proof");
        var response = new ReauthenticationController(useCase).confirm(user.toString(), "Bearer access",
                new ReauthenticationController.ConfirmationRequest(null, SocialProvider.APPLE, "token", "nonce"));
        assertThat(response.getBody()).isEqualTo(Map.of("proof", "proof"));
        verify(useCase).execute(command);
    }

    @Test
    void acceptsExactlyOneCredentialShape() {
        assertThat(new ReauthenticationController.ConfirmationRequest("password").isSingleCredential()).isTrue();
        assertThat(new ReauthenticationController.ConfirmationRequest(null, SocialProvider.GOOGLE, "token", null)
                .isSingleCredential()).isTrue();
        assertThat(new ReauthenticationController.ConfirmationRequest("password", SocialProvider.GOOGLE, "token", null)
                .isSingleCredential()).isFalse();
        assertThat(new ReauthenticationController.ConfirmationRequest(null, null, null, null).isSingleCredential()).isFalse();
        assertThat(new ReauthenticationController.ConfirmationRequest(null, SocialProvider.GOOGLE, " ", null)
                .isSingleCredential()).isFalse();
        assertThat(new ReauthenticationController.ConfirmationRequest(null, null, "token", null).isSingleCredential()).isFalse();
    }
}
