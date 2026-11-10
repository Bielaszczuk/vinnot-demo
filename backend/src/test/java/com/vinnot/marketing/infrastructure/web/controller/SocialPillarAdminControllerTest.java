package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.marketing.application.port.in.ManageContentPillarsUseCase;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** #510 S8, S10 and S13: the admin turns a pillar's auto-approval or the pillar itself on and off; administrators only. */
@WebMvcTest(SocialPillarAdminController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class SocialPillarAdminControllerTest {
    private static final String ON = "{\"enabled\": true}";
    private static final String OFF = "{\"enabled\": false}";
    @Autowired private MockMvc mvc;
    @MockitoBean private ManageContentPillarsUseCase pillars;
    @MockitoBean private ReauthenticationProofPort proofs;
    @MockitoBean private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;
    private final UsernamePasswordAuthenticationToken admin = token("ROLE_ADMIN");

    @BeforeEach
    void passThroughFilters() throws Exception {
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwt).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(limiter).doFilter(any(), any(), any());
    }

    @Test
    void turningAutoApprovalOnReturnsTheUpdatedPillarWithItsPerformance() throws Exception {
        when(pillars.setAutoApprove("CURIOUS_FACT", true)).thenReturn(new ContentPillarResponse("CURIOUS_FACT", "Dato curioso",
                "Curious fact", 2, true, true, new ContentPillarResponse.Performance(4, 2000, 150, 0.75)));

        mvc.perform(put("/admin/social-posts/pillars/{code}/auto-approve", "CURIOUS_FACT").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(ON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("CURIOUS_FACT"))
                .andExpect(jsonPath("$.nameEn").value("Curious fact"))
                .andExpect(jsonPath("$.weight").value(2))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.autoApprove").value(true))
                .andExpect(jsonPath("$.performance.measuredPosts").value(4))
                .andExpect(jsonPath("$.performance.views").value(2000))
                .andExpect(jsonPath("$.performance.interactions").value(150))
                .andExpect(jsonPath("$.performance.factor").value(0.75));
        verify(pillars).setAutoApprove("CURIOUS_FACT", true);
    }

    @Test
    void switchingAPillarOffReturnsTheUpdatedPillar() throws Exception {
        when(pillars.setActive("HUMOR", false)).thenReturn(new ContentPillarResponse("HUMOR", "Humor", "Humor", 1, false, false,
                new ContentPillarResponse.Performance(0, 0, 0, 1.0)));

        mvc.perform(put("/admin/social-posts/pillars/{code}/active", "HUMOR").with(authentication(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(OFF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.performance.factor").value(1.0));
        verify(pillars).setActive("HUMOR", false);
    }

    @Test
    void anUnknownPillarIsNotFound() throws Exception {
        when(pillars.setActive("NOPE", true)).thenThrow(new EntityNotFoundException("ContentPillar", "NOPE"));
        when(pillars.setAutoApprove("NOPE", false)).thenThrow(new EntityNotFoundException("ContentPillar", "NOPE"));

        mvc.perform(put("/admin/social-posts/pillars/{code}/active", "NOPE").with(authentication(admin))
                .contentType(MediaType.APPLICATION_JSON).content(ON)).andExpect(status().isNotFound());
        mvc.perform(put("/admin/social-posts/pillars/{code}/auto-approve", "NOPE").with(authentication(admin))
                .contentType(MediaType.APPLICATION_JSON).content(OFF)).andExpect(status().isNotFound());
    }

    @Test
    void theSwitchIsRequired() throws Exception {
        mvc.perform(put("/admin/social-posts/pillars/{code}/active", "HUMOR").with(authentication(admin))
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        verify(pillars, never()).setActive(any(), anyBoolean());
    }

    @Test
    void onlyAdministratorsMayChangeAPillar() throws Exception {
        for (String role : List.of("ROLE_USER", "ROLE_MODERATOR")) {
            mvc.perform(put("/admin/social-posts/pillars/{code}/auto-approve", "CURIOUS_FACT").with(authentication(token(role)))
                    .contentType(MediaType.APPLICATION_JSON).content(ON)).andExpect(status().isForbidden());
            mvc.perform(put("/admin/social-posts/pillars/{code}/active", "CURIOUS_FACT").with(authentication(token(role)))
                    .contentType(MediaType.APPLICATION_JSON).content(OFF)).andExpect(status().isForbidden());
        }
        mvc.perform(put("/admin/social-posts/pillars/{code}/active", "CURIOUS_FACT").contentType(MediaType.APPLICATION_JSON).content(OFF))
                .andExpect(status().isUnauthorized());
        verify(pillars, never()).setAutoApprove(any(), anyBoolean());
        verify(pillars, never()).setActive(any(), anyBoolean());
    }

    private static UsernamePasswordAuthenticationToken token(String role) {
        return new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }
}
