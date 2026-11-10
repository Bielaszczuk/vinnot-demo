package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.GetAdminReviewByIdUseCase;
import com.vinnot.admin.application.port.in.GetAdminStatsUseCase;
import com.vinnot.admin.application.port.in.SearchAdminEventsUseCase;
import com.vinnot.admin.application.port.in.SearchAdminReviewsUseCase;
import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.event.domain.valueobject.EventCancellationReason;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.GetEventByIdUseCase;
import com.vinnot.event.application.port.in.PublishEventUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.review.application.port.in.DeleteReviewUseCase;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import com.vinnot.wine.application.port.in.CreateWineUseCase;
import com.vinnot.wine.application.port.in.DeleteWineUseCase;
import com.vinnot.wine.application.port.in.GetWineByIdUseCase;
import com.vinnot.wine.application.port.in.GetWineSubmissionImageUseCase;
import com.vinnot.wine.application.port.in.GetWineSubmissionUseCase;
import com.vinnot.wine.application.port.in.ReviewWineSubmissionUseCase;
import com.vinnot.wine.application.port.in.SearchWineSubmissionsUseCase;
import com.vinnot.wine.application.port.in.SearchWinesUseCase;
import com.vinnot.wine.application.port.in.ToggleWineActiveUseCase;
import com.vinnot.wine.application.port.in.ToggleWineFeaturedUseCase;
import com.vinnot.wine.application.port.in.UpdateWineUseCase;
import com.vinnot.wine.infrastructure.web.controller.WineSubmissionAdminController;
import com.vinnot.wineroute.application.port.in.AddRouteStopUseCase;
import com.vinnot.wineroute.application.port.in.ArchiveWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.CreateWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.DeleteWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.GetWineRouteByIdUseCase;
import com.vinnot.wineroute.application.port.in.PublishWineRouteUseCase;
import com.vinnot.wineroute.application.port.in.SearchAllWineRoutesUseCase;
import com.vinnot.wineroute.application.port.in.UpdateWineRouteUseCase;
import com.vinnot.winery.application.port.in.CreateWineryUseCase;
import com.vinnot.winery.application.port.in.DeleteWineryUseCase;
import com.vinnot.winery.application.port.in.GetWineryByIdUseCase;
import com.vinnot.winery.application.port.in.SearchWineriesUseCase;
import com.vinnot.winery.application.port.in.UpdateWineryUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({WineAdminController.class, WineryAdminController.class, WineRouteAdminController.class, EventAdminController.class, ReviewAdminController.class, AdminDashboardController.class, WineSubmissionAdminController.class})
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@MockitoBean(types = {CreateWineUseCase.class, UpdateWineUseCase.class, DeleteWineUseCase.class, ToggleWineFeaturedUseCase.class, ToggleWineActiveUseCase.class, GetWineByIdUseCase.class, SearchWinesUseCase.class, CreateWineryUseCase.class, UpdateWineryUseCase.class, DeleteWineryUseCase.class, GetWineryByIdUseCase.class, SearchWineriesUseCase.class, CreateWineRouteUseCase.class, UpdateWineRouteUseCase.class, AddRouteStopUseCase.class, PublishWineRouteUseCase.class, ArchiveWineRouteUseCase.class, DeleteWineRouteUseCase.class, GetWineRouteByIdUseCase.class, SearchAllWineRoutesUseCase.class, CreateEventUseCase.class, UpdateEventUseCase.class, PublishEventUseCase.class, CancelEventUseCase.class, GetEventByIdUseCase.class, SearchAdminEventsUseCase.class, SearchAdminReviewsUseCase.class, GetAdminReviewByIdUseCase.class, DeleteReviewUseCase.class, GetAdminStatsUseCase.class, SearchWineSubmissionsUseCase.class, GetWineSubmissionUseCase.class, GetWineSubmissionImageUseCase.class, ReviewWineSubmissionUseCase.class})
class AdminRoleAccessTest {
    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @Autowired private MockMvc mvc;
    @Autowired private CreateWineUseCase createWine;
    @Autowired private UpdateWineUseCase updateWine;
    @Autowired private DeleteWineUseCase deleteWine;
    @Autowired private DeleteReviewUseCase deleteReview;
    @Autowired private ReviewWineSubmissionUseCase reviewSubmission;
    @Autowired private CancelEventUseCase cancelEvent;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;

    @BeforeEach
    void passThroughFilters() throws Exception {
        when(reauthenticationProofs.permits(any(), any(), any())).thenReturn(true);
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwt).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(limiter).doFilter(any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"wines", "wineries", "events", "routes", "reviews", "wine-submissions", "stats"})
    void catalogAndModerationReadsAllowModeratorAndAdminButNotPartnerOrUser(String section) throws Exception {
        for (String role : List.of("MODERATOR", "ADMIN")) {
            mvc.perform(get("/admin/" + section).with(as(role))).andExpect(status().isOk());
        }
        for (String role : List.of("PARTNER", "USER")) {
            mvc.perform(get("/admin/" + section).with(as(role))).andExpect(status().isForbidden());
        }
        mvc.perform(get("/admin/" + section)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"wines", "wineries", "events", "routes"})
    void catalogDeletesRemainAdministratorOnly(String section) throws Exception {
        for (String role : List.of("MODERATOR", "PARTNER", "USER")) {
            mvc.perform(delete("/admin/" + section + "/" + UUID.randomUUID()).with(as(role)))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(delete("/admin/" + section + "/" + UUID.randomUUID()).with(as("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void moderatorCanCreateAndEditWineButCannotDeleteIt() throws Exception {
        when(createWine.execute(any())).thenReturn(UUID.randomUUID());
        mvc.perform(post("/admin/wines").with(as("MODERATOR")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Malbec\",\"wineType\":\"RED\",\"wineryId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(patch("/admin/wines/{id}", UUID.randomUUID()).with(as("MODERATOR"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Malbec Reserva\"}"))
                .andExpect(status().isOk());
        verify(createWine).execute(any());
        verify(updateWine).execute(any());
        verifyNoInteractions(deleteWine);
    }

    @Test
    void moderatorCanDecideSubmissionsButPartnerCannot() throws Exception {
        UUID id = UUID.randomUUID();
        String body = "{\"decision\":\"REJECT\",\"reason\":\"The submitted label is not a wine\"}";
        mvc.perform(patch("/admin/wine-submissions/{id}/decision", id).with(as("MODERATOR"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        verify(reviewSubmission).execute(any());
        mvc.perform(patch("/admin/wine-submissions/{id}/decision", id).with(as("PARTNER"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        verifyNoMoreInteractions(reviewSubmission);
    }

    @Test
    void moderatorCanRemoveAReviewAsModerationButCannotManageUsers() throws Exception {
        mvc.perform(delete("/admin/reviews/{id}", UUID.randomUUID()).with(as("MODERATOR")))
                .andExpect(status().isOk());
        verify(deleteReview).execute(any());
        mvc.perform(get("/admin/users").with(as("MODERATOR"))).andExpect(status().isForbidden());
        mvc.perform(put("/admin/users/{id}/role", UUID.randomUUID()).with(as("MODERATOR"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void cancellingAnEventCarriesTheChosenReasonOrTheDefault() throws Exception {
        UUID id = UUID.randomUUID();
        mvc.perform(patch("/admin/events/{id}/cancel", id).with(as("MODERATOR"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"OTHER\",\"note\":\" Obra en el salón \"}"))
                .andExpect(status().isOk());
        verify(cancelEvent).execute(new CancelEventCommand(id, null, true,
                new EventCancellation(EventCancellationReason.OTHER, "Obra en el salón")));
        mvc.perform(delete("/admin/events/{id}", id).with(as("ADMIN"))).andExpect(status().isOk());
        verify(cancelEvent).execute(new CancelEventCommand(id, null, true, EventCancellation.unspecified()));
        mvc.perform(patch("/admin/events/{id}/cancel", id).with(as("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"" + "x".repeat(EventCancellation.MAXIMUM_NOTE_LENGTH + 1) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    private RequestPostProcessor as(String role) {
        return request -> {
            request.setServletPath(request.getRequestURI());
            request.addHeader("Authorization", "Bearer test");
            request.addHeader("X-Admin-Reauthentication", "proof");
            return authentication(new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role)))).postProcessRequest(request);
        };
    }
}
