package com.vinnot.user.infrastructure.web.error;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.user.application.port.in.LoginUserUseCase;
import com.vinnot.user.application.port.in.LogoutUserUseCase;
import com.vinnot.user.application.port.in.RefreshTokenUseCase;
import com.vinnot.user.application.port.in.SocialLoginUseCase;
import com.vinnot.user.domain.exception.LoginTemporarilyLockedException;
import com.vinnot.user.infrastructure.web.controller.BrowserAuthController;
import com.vinnot.user.infrastructure.web.session.BrowserSessionPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LoginLockoutExceptionHandlerTest {
    private static final Instant NOW = Instant.parse("2026-10-29T12:00:00Z");
    private final LoginUserUseCase login = mock(LoginUserUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new BrowserAuthController(login, mock(SocialLoginUseCase.class),
                    mock(RefreshTokenUseCase.class), mock(LogoutUserUseCase.class),
                    new BrowserSessionPolicy("https://vinnot.com", true, 604800000)))
            .setControllerAdvice(new GlobalExceptionHandler(), new LoginLockoutExceptionHandler()).build();

    @Test
    void aTemporaryLockAnswers423WithRetryAfterAndNoHintAboutThePassword() {
        var handler = new LoginLockoutExceptionHandler(Clock.fixed(NOW, ZoneOffset.UTC));
        var response = handler.handleTemporaryLock(new LoginTemporarilyLockedException(NOW.plusSeconds(899).plusMillis(10)),
                new MockHttpServletRequest("POST", "/auth/login"));

        assertThat(response.getStatusCode().value()).isEqualTo(423);
        assertThat(response.getHeaders().getFirst("Retry-After")).isEqualTo("900");
        assertThat(response.getBody().code()).isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
        assertThat(response.getBody().status()).isEqualTo(423);
        assertThat(response.getBody().path()).isEqualTo("/auth/login");
        assertThat(response.getBody().message()).isEqualTo("Too many failed sign-in attempts. Try again later");
    }

    @Test
    void theWebSignInGetsTheLockWithItsRetryAfterAheadOfTheGlobalHandler() throws Exception {
        when(login.execute(any())).thenThrow(new LoginTemporarilyLockedException(Instant.now().plusSeconds(600)));

        mvc.perform(webLogin()).andExpect(status().isLocked())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("ACCOUNT_TEMPORARILY_LOCKED"));
    }

    @Test
    void aWrongPasswordIsStill401() throws Exception {
        when(login.execute(any())).thenThrow(new BusinessRuleViolationException("AUTH_FAILED", "Invalid credentials"));

        mvc.perform(webLogin()).andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Retry-After"))
                .andExpect(jsonPath("$.code").value("AUTH_FAILED"));
    }

    @Test
    void theProductionConstructorUsesTheSystemClock() {
        var response = new LoginLockoutExceptionHandler().handleTemporaryLock(
                new LoginTemporarilyLockedException(Instant.now().plusSeconds(60)), new MockHttpServletRequest("POST", "/auth/reauthenticate"));

        assertThat(Long.parseLong(response.getHeaders().getFirst("Retry-After"))).isBetween(1L, 61L);
    }

    private static org.springframework.test.web.servlet.RequestBuilder webLogin() {
        return post("/auth/web/login").header("Origin", "https://vinnot.com").header("X-Vinnot-Web-Session", "1")
                .contentType(MediaType.APPLICATION_JSON).content("{\"usernameOrEmail\":\"user\",\"password\":\"password\"}");
    }
}
