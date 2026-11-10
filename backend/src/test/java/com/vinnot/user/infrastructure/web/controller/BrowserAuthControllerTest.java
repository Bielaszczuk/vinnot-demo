package com.vinnot.user.infrastructure.web.controller;

import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.user.application.command.model.*;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.in.*;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.infrastructure.web.session.BrowserSessionPolicy;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.hamcrest.Matchers;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BrowserAuthControllerTest {
    private final LoginUserUseCase login = mock(LoginUserUseCase.class);
    private final SocialLoginUseCase social = mock(SocialLoginUseCase.class);
    private final RefreshTokenUseCase refresh = mock(RefreshTokenUseCase.class);
    private final LogoutUserUseCase logout = mock(LogoutUserUseCase.class);
    private final AuthSessionResponse session = new AuthSessionResponse("access", "refresh-secret", "Bearer", 900, null);
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new BrowserAuthController(login, social, refresh, logout,
                new BrowserSessionPolicy("https://vinnot.com", true, 604800000)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void loginExchangesCredentialsForCookieWithoutReturningRefreshToken() throws Exception {
        when(login.execute(any())).thenReturn(session);
        mvc.perform(post("/auth/web/login").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").contentType(MediaType.APPLICATION_JSON)
                .content("{\"usernameOrEmail\":\"user\",\"password\":\"password\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").value("access"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(cookie().httpOnly("__Host-vinnot-refresh", true))
                .andExpect(cookie().secure("__Host-vinnot-refresh", true))
                .andExpect(header().string("Cache-Control", "no-store"));
        verify(login).execute(new LoginCommand("user", "password", false));
    }

    @Test
    void socialLoginUsesTheSameProtectedCookieTransport() throws Exception {
        when(social.execute(any())).thenReturn(session);
        mvc.perform(post("/auth/web/social").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"GOOGLE\",\"token\":\"provider-token\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.refreshToken").doesNotExist());
        verify(social).execute(new SocialLoginCommand(SocialProvider.GOOGLE, "provider-token", null, null, null, false));
    }

    @Test
    void refreshPrioritizesCookieAndAllowsOneTimeLegacyMigration() throws Exception {
        when(refresh.execute(any())).thenReturn(session);
        mvc.perform(post("/auth/web/refresh").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").cookie(new Cookie("__Host-vinnot-refresh", "cookie"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"legacy\"}"))
                .andExpect(status().isOk());
        verify(refresh).execute(new RefreshTokenCommand("cookie"));
        mvc.perform(post("/auth/web/refresh").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"legacy\"}"))
                .andExpect(status().isOk());
        verify(refresh).execute(new RefreshTokenCommand("legacy"));
        mvc.perform(post("/auth/web/refresh").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").cookie(new Cookie("__Host-vinnot-refresh", "cookie")))
                .andExpect(status().isOk());
    }

    @Test
    void unsupportedBodiesAreClientErrorsAndNeverInvokeSessionUseCases() throws Exception {
        for (MediaType type : new MediaType[]{MediaType.TEXT_PLAIN, MediaType.APPLICATION_FORM_URLENCODED,
                MediaType.APPLICATION_OCTET_STREAM}) {
            mvc.perform(post("/auth/web/refresh").header("Origin", "https://vinnot.com")
                    .header("X-Vinnot-Web-Session", "1").contentType(type).content("refreshToken=private-fixture"))
                    .andExpect(status().isUnsupportedMediaType())
                    .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"))
                    .andExpect(content().string(Matchers.not(Matchers.containsString("private-fixture"))))
                    .andExpect(header().doesNotExist("Set-Cookie"));
        }
        verifyNoInteractions(login, social, refresh, logout);
    }

    @Test
    void absentSessionIsAnonymousWithoutCallingRefreshOrClearingAnotherSessionCookie() throws Exception {
        mvc.perform(post("/auth/web/refresh").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1"))
                .andExpect(status().isNoContent()).andExpect(content().string(""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().doesNotExist("Set-Cookie"));
        verifyNoInteractions(refresh);
    }

    @Test
    void crossOriginRequestsCannotMutateSessions() throws Exception {
        mvc.perform(post("/auth/web/logout").header("Origin", "https://evil.test")
                .header("X-Vinnot-Web-Session", "1")).andExpect(status().isForbidden());
        mvc.perform(post("/auth/web/logout").header("Origin", "https://vinnot.com"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(logout);
    }

    @Test
    void logoutRevokesCookieAndExpiresItIncludingAnAlreadyAbsentSession() throws Exception {
        mvc.perform(post("/auth/web/logout").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").cookie(new Cookie("__Host-vinnot-refresh", "cookie")))
                .andExpect(status().isNoContent()).andExpect(cookie().maxAge("__Host-vinnot-refresh", 0));
        verify(logout).execute(new LogoutCommand("cookie"));
        mvc.perform(post("/auth/web/logout").header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1")).andExpect(status().isNoContent());
        verify(logout).execute(new LogoutCommand(null));
    }
}
