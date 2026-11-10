package com.vinnot.shared.infrastructure.config;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.application.port.ApiDocumentationAccessPort;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.annotation.Resource;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApiDocumentationProbeController.class)
@Import({
        ApiDocumentationProbeController.class,
        SecurityConfig.class,
        ApiDocumentationSecurityConfig.class,
        RestAuthenticationEntryPoint.class
})
class ApiDocumentationSecurityConfigTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "correct-horse";

    @MockitoBean
    private ApiDocumentationAccessPort access;
    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;

    @Resource
    private MockMvc mvc;

    @BeforeEach
    void letMockedFiltersContinueTheChain() throws Exception {
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(
                    invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(
                    invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(rateLimitingFilter).doFilter(any(), any(), any());
        when(access.allows(ADMIN_EMAIL, ADMIN_PASSWORD)).thenReturn(true);
    }

    @Test
    void asksForAUsernameAndPasswordInsteadOfServingTheDocsPublicly() throws Exception {
        for (String path : new String[] {"/swagger-ui.html", "/swagger-ui/index.html", "/api-docs", "/api-docs/swagger-config", "/api-docs.yaml", "/webjars/swagger-ui/index.html"}) {
            mvc.perform(get(path))
                    .andExpect(status().isUnauthorized())
                    .andExpect(header().string("WWW-Authenticate", startsWith("Basic realm=\"Vinnot API documentation\"")));
        }
    }

    @Test
    void servesTheDocsToAnAdministratorWithValidCredentials() throws Exception {
        mvc.perform(get("/api-docs").with(httpBasic(ADMIN_EMAIL, ADMIN_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(content().string("spec"));
        mvc.perform(get("/swagger-ui/index.html").with(httpBasic(ADMIN_EMAIL, ADMIN_PASSWORD)))
                .andExpect(status().isOk());
        mvc.perform(get("/api-docs.yaml").with(httpBasic(ADMIN_EMAIL, ADMIN_PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsWrongCredentialsAndNonAdministrators() throws Exception {
        mvc.perform(get("/api-docs").with(httpBasic(ADMIN_EMAIL, "wrong")))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api-docs").with(httpBasic("user@example.com", ADMIN_PASSWORD)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rateLimitsDocumentationRequestsBeforeCheckingCredentials() throws Exception {
        doAnswer(invocation -> null).when(rateLimitingFilter).doFilter(any(), any(), any());

        mvc.perform(get("/api-docs").with(httpBasic(ADMIN_EMAIL, ADMIN_PASSWORD)));

        verify(access, never()).allows(any(), any());
    }

    @Test
    void leavesTheRestOfTheApiOnItsJwtChain() throws Exception {
        mvc.perform(get("/wines").with(httpBasic(ADMIN_EMAIL, ADMIN_PASSWORD)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/health")).andExpect(status().isOk());
    }
}

@TestComponent
@RestController
class ApiDocumentationProbeController {
    @GetMapping({"/api-docs", "/api-docs/swagger-config", "/api-docs.yaml"})
    String spec() { return "spec"; }

    @GetMapping({"/swagger-ui.html", "/swagger-ui/index.html", "/webjars/swagger-ui/index.html"})
    String ui() { return "ui"; }

    @GetMapping("/wines")
    String wines() { return "wines"; }

    @GetMapping("/health")
    String health() { return "ok"; }
}
