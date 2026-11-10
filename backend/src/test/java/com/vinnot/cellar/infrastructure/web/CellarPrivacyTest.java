package com.vinnot.cellar.infrastructure.web;

import com.vinnot.cellar.application.port.in.*;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.application.port.out.WineQueryPort;
import com.vinnot.cellar.application.query.handler.GetUserCellarQueryHandler;
import com.vinnot.cellar.infrastructure.web.controller.CellarController;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.stubbing.Answer;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;
import com.vinnot.cellar.application.port.out.ReviewQueryPort;
import jakarta.annotation.Resource;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CellarController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class CellarPrivacyTest {
    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter rate;
    @MockitoBean private AddWineToCellarUseCase add;
    @MockitoBean private RemoveWineFromCellarUseCase remove;
    @MockitoBean private UpdateCellarEntryUseCase update;
    @MockitoBean private GetUserCellarUseCase cellar;
    @MockitoBean private GetCellarStatsUseCase stats;
    @Resource private MockMvc mvc;

    @BeforeEach
    void filters() throws Exception {
        Answer<Void> continueChain = invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        };
        doAnswer(continueChain).when(jwt).doFilter(any(), any(), any());
        doAnswer(continueChain).when(rate).doFilter(any(), any(), any());
    }

    @Test
    void rejectsOtherUsersForBothPrivateReadRoutesBeforeCallingTheApplication() throws Exception {
        String owner = UUID.randomUUID().toString();
        for (String role : List.of("ROLE_USER", "ROLE_MODERATOR", "ROLE_PARTNER")) {
            for (String suffix : List.of("", "/stats")) {
                mvc.perform(get("/cellar/user/" + owner + suffix).with(user(UUID.randomUUID().toString())
                                .authorities(new SimpleGrantedAuthority(role),
                                        new SimpleGrantedAuthority("CELLAR_MANAGE_OWN"))))
                        .andExpect(status().isForbidden());
            }
        }
        verifyNoInteractions(cellar, stats);
    }

    @Test
    void allowsOwnerAndAdministrator() throws Exception {
        String owner = UUID.randomUUID().toString();
        when(cellar.execute(any())).thenReturn(PageResult.of(List.of(), 0, 1000, 0));
        for (String suffix : List.of("", "/stats")) {
            mvc.perform(get("/cellar/user/" + owner + suffix).with(user(owner)
                            .authorities(new SimpleGrantedAuthority("CELLAR_MANAGE_OWN"))))
                    .andExpect(status().isOk());
            mvc.perform(get("/cellar/user/" + owner + suffix).with(user(UUID.randomUUID().toString()).roles("ADMIN")))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void defaultHttpWindowWorksWithTheRealApplicationPaginationBoundary() throws Exception {
        UUID owner = UUID.randomUUID();
        CellarWineRepositoryPort repository = mock(CellarWineRepositoryPort.class);
        WineQueryPort wines = mock(WineQueryPort.class);
        var handler = new GetUserCellarQueryHandler(repository, wines, mock(ReviewQueryPort.class));
        when(repository.findByUserId(eq(owner), any()))
                .thenReturn(PageResult.of(List.of(), 0, 200, 0));
        when(cellar.execute(any())).thenAnswer(invocation -> handler.execute(invocation.getArgument(0)));
        mvc.perform(get("/cellar").with(authentication(UsernamePasswordAuthenticationToken.authenticated(
                        owner.toString(), null, List.of(new SimpleGrantedAuthority("CELLAR_MANAGE_OWN"))))))
                .andExpect(status().isOk());
        verify(repository).findByUserId(owner, PageQuery.of(0, 200, "id", PageQuery.SortDirection.ASC));
    }
}
