package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.port.in.*;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.in.*;
import com.vinnot.user.application.command.model.BanUserCommand;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import com.vinnot.wine.infrastructure.web.WineLabelUploadValidator;
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({UserAdminController.class, CatalogImageAdminController.class})
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, WineLabelUploadValidator.class})
class AdminMutationContractTest {
    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @Autowired private MockMvc mvc;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;
    @MockitoBean private SearchAdminUsersUseCase search;
    @MockitoBean private GetAdminUserByIdUseCase detail;
    @MockitoBean private UpdateUserAdminUseCase update;
    @MockitoBean private BanUserUseCase ban;
    @MockitoBean private UnbanUserUseCase unban;
    @MockitoBean private AssignRoleUseCase assign;
    @MockitoBean private DeleteUserAdminUseCase delete;
    @MockitoBean private StoreCatalogImageUseCase images;

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

    @Test
    void sensitiveMutationRejectsMissingOrInvalidConfirmationBeforeChangingRoles() throws Exception {
        when(reauthenticationProofs.permits(any(), any(), any())).thenReturn(false);
        var admin = new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        UUID target = UUID.randomUUID();
        mvc.perform(put("/admin/users/{id}/role", target).with(authentication(admin))
                .servletPath("/admin/users/" + target + "/role").header("Authorization", "Bearer test")
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ROLE_PARTNER\"}"))
                .andExpect(status().isForbidden())
                .andExpect(MockMvcResultMatchers.jsonPath("$.code")
                        .value("REAUTHENTICATION_REQUIRED"));
        verifyNoInteractions(assign);
    }

    @Test
    void additiveAssignmentUsesAuthenticatedActorWithoutReplacingRoles() throws Exception {
        UUID actor = UUID.randomUUID();
        UUID target = UUID.randomUUID();
        var admin = new UsernamePasswordAuthenticationToken(actor.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        mvc.perform(post("/admin/users/{id}/assign-role", target).with(authentication(admin))
                .servletPath("/admin/users/" + target + "/assign-role").header("Authorization", "Bearer test").header("X-Admin-Reauthentication", "proof")
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ROLE_PARTNER\"}"))
                .andExpect(status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Role assigned successfully"));
        verify(assign).execute(argThat(command -> !command.replace() && actor.equals(command.actorId())
                && target.equals(command.userId()) && "ROLE_PARTNER".equals(command.role())));
    }

    @Test
    void replacementUsesAuthenticatedActorAndRejectsBlankRoles() throws Exception {
        UUID actor = UUID.randomUUID();
        UUID target = UUID.randomUUID();
        var admin = new UsernamePasswordAuthenticationToken(actor.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        mvc.perform(put("/admin/users/{id}/role", target).with(authentication(admin))
                .servletPath("/admin/users/" + target + "/role").header("Authorization", "Bearer test").header("X-Admin-Reauthentication", "proof")
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ROLE_PARTNER\"}"))
                .andExpect(status().isOk());
        verify(assign).execute(argThat(command -> command.replace() && actor.equals(command.actorId())
                && target.equals(command.userId()) && "ROLE_PARTNER".equals(command.role())));
        mvc.perform(put("/admin/users/{id}/role", target).with(authentication(admin))
                .servletPath("/admin/users/" + target + "/role").header("Authorization", "Bearer test").header("X-Admin-Reauthentication", "proof")
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aBanCarriesThePresetReasonAndRejectsUnknownOnes() throws Exception {
        UUID actor = UUID.randomUUID();
        UUID target = UUID.randomUUID();
        var admin = new UsernamePasswordAuthenticationToken(actor.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        mvc.perform(post("/admin/users/{id}/ban", target).with(authentication(admin))
                .servletPath("/admin/users/" + target + "/ban").header("Authorization", "Bearer test").header("X-Admin-Reauthentication", "proof")
                .contentType(MediaType.APPLICATION_JSON).content("{\"reasonCode\":\"spam\",\"reason\":\"Repeated ads\"}"))
                .andExpect(status().isOk());
        verify(ban).execute(new BanUserCommand(target, SuspensionReason.SPAM, "Repeated ads", actor));
        mvc.perform(post("/admin/users/{id}/ban", target).with(authentication(admin))
                .servletPath("/admin/users/" + target + "/ban").header("Authorization", "Bearer test").header("X-Admin-Reauthentication", "proof")
                .contentType(MediaType.APPLICATION_JSON).content("{\"reasonCode\":\"RUDE\"}"))
                .andExpect(status().is4xxClientError());
        verify(ban, times(1)).execute(any());
    }

    @Test
    void newMutationEndpointsRemainAdministratorOnly() throws Exception {
        var ordinary = new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        mvc.perform(post("/admin/catalog-images").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/admin/catalog-images").with(authentication(ordinary))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/admin/users/{id}/role", UUID.randomUUID()).with(authentication(ordinary))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(images, assign);
    }
}
