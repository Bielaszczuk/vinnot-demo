package com.vinnot.notification.infrastructure.web;

import com.vinnot.admin.infrastructure.web.AdminSensitiveActionConfiguration;
import com.vinnot.admin.infrastructure.web.AdminSensitiveActionInterceptor;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.notification.application.model.AnnouncementPreview;
import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.model.AnnouncementStats;
import com.vinnot.notification.application.port.in.ComposeAnnouncementUseCase;
import com.vinnot.notification.application.port.in.SendAnnouncementUseCase;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnnouncementController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, AdminSensitiveActionConfiguration.class,
        AdminSensitiveActionInterceptor.class})
class AnnouncementControllerTest {
    private static final String ANNOUNCEMENT = """
            {"kind":"SERVICE","es":{"title":"Mantenimiento","body":"Domingo de 2 a 4."},
             "audience":{"email":true,"push":true,"language":"es","role":"PARTNER"},"destination":"EVENTS"}
            """;
    private static final String DRAFT = "{\"kind\":\"NEWS\",\"locale\":\"en\",\"title\":\"Harvest\",\"body\":\"Tastings **all month**.\"}";
    @Autowired private MockMvc mvc;
    @MockitoBean private ComposeAnnouncementUseCase announcements;
    @MockitoBean private SendAnnouncementUseCase sending;
    @MockitoBean private ReauthenticationProofPort proofs;
    @MockitoBean private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;
    private final UUID adminId = UUID.randomUUID();

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
        when(proofs.permits(any(), any(), any())).thenReturn(false);
    }

    @Test
    void aPreviewNeedsNoReauthenticationAndRendersForTheAuthenticatedAdministrator() throws Exception {
        when(announcements.preview(eq(AnnouncementKind.NEWS), eq(NotificationLocale.EN),
                eq(new AnnouncementContent("Harvest", "Tastings **all month**.")), eq(adminId)))
                .thenReturn(new AnnouncementPreview("Harvest", "<html>", "text", "Harvest", "Tastings all month."));
        mvc.perform(post("/admin/notifications/announcements/preview").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/preview").header("Authorization", "Bearer test")
                        .contentType(MediaType.APPLICATION_JSON).content(DRAFT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.html").value("<html>"))
                .andExpect(jsonPath("$.data.pushBody").value("Tastings all month."));
    }

    @Test
    void moderatorsCannotComposeAndInvalidContentIsRefused() throws Exception {
        mvc.perform(post("/admin/notifications/announcements/preview").with(authentication(token(adminId, "ROLE_MODERATOR")))
                        .contentType(MediaType.APPLICATION_JSON).content(DRAFT))
                .andExpect(status().isForbidden());
        mvc.perform(post("/admin/notifications/announcements/preview").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/preview").header("Authorization", "Bearer test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"NEWS\",\"locale\":\"es\",\"title\":\"x\",\"body\":\"[a](javascript:x)\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ANNOUNCEMENT_LINK"));
        mvc.perform(post("/admin/notifications/announcements/preview").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/preview").header("Authorization", "Bearer test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"PROMO\",\"locale\":\"es\",\"title\":\"x\",\"body\":\"y\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(announcements);
    }

    @Test
    void theReachAndTheHistoryNeedNoReauthentication() throws Exception {
        UUID region = UUID.randomUUID();
        UUID country = UUID.randomUUID();
        when(sending.reach(AnnouncementKind.NEWS, new AnnouncementAudience(true, false, "en", region, null, null)))
                .thenReturn(new AnnouncementReach(7, 0, 7));
        when(sending.reach(AnnouncementKind.NEWS, new AnnouncementAudience(true, false, null, null, country, null)))
                .thenReturn(new AnnouncementReach(9, 0, 9));
        when(sending.history()).thenReturn(List.of(new AnnouncementRecord(adminId, AnnouncementKind.SERVICE, true,
                new AnnouncementAudience(true, false, null, null, country, null), AnnouncementDestination.HOME, "Mantenimiento", 1,
                "admin@vinnot.test", Instant.parse("2026-10-20T12:00:00Z"), null)));

        mvc.perform(get("/admin/notifications/announcements/reach").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/reach")
                        .param("kind", "NEWS").param("email", "true").param("push", "false").param("language", "en")
                        .param("regionId", region.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(7))
                .andExpect(jsonPath("$.data.accounts").value(7));
        mvc.perform(get("/admin/notifications/announcements/reach").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/reach")
                        .param("kind", "NEWS").param("email", "true").param("push", "false")
                        .param("countryId", country.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accounts").value(9));
        mvc.perform(get("/admin/notifications/announcements/reach").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .param("kind", "PROMO").param("email", "true").param("push", "false"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ANNOUNCEMENT_KIND"));
        mvc.perform(get("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Mantenimiento"))
                .andExpect(jsonPath("$.data[0].sentBy").value("admin@vinnot.test"))
                .andExpect(jsonPath("$.data[0].kind").value("SERVICE"))
                .andExpect(jsonPath("$.data[0].email").value(true))
                .andExpect(jsonPath("$.data[0].countryId").value(country.toString()))
                .andExpect(jsonPath("$.data[0].test").value(true));
    }

    @Test
    void theHistoryKeepsEveryPreviousFieldAndAddsTheDeliveryStats() throws Exception {
        UUID id = UUID.randomUUID();
        UUID region = UUID.randomUUID();
        when(sending.history()).thenReturn(List.of(new AnnouncementRecord(id, AnnouncementKind.NEWS, false,
                new AnnouncementAudience(true, true, "es", region, null, "PARTNER"), AnnouncementDestination.WINES, "Vendimia",
                40, "admin@vinnot.test", Instant.parse("2026-10-20T12:00:00Z"), Instant.parse("2026-10-20T12:05:00Z"),
                new AnnouncementStats(30, 2, 25, 4, 9))));

        mvc.perform(get("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(id.toString()))
                .andExpect(jsonPath("$.data[0].kind").value("NEWS"))
                .andExpect(jsonPath("$.data[0].test").value(false))
                .andExpect(jsonPath("$.data[0].email").value(true))
                .andExpect(jsonPath("$.data[0].push").value(true))
                .andExpect(jsonPath("$.data[0].language").value("es"))
                .andExpect(jsonPath("$.data[0].regionId").value(region.toString()))
                .andExpect(jsonPath("$.data[0].countryId").doesNotExist())
                .andExpect(jsonPath("$.data[0].role").value("PARTNER"))
                .andExpect(jsonPath("$.data[0].destination").value("WINES"))
                .andExpect(jsonPath("$.data[0].title").value("Vendimia"))
                .andExpect(jsonPath("$.data[0].recipients").value(40))
                .andExpect(jsonPath("$.data[0].sentBy").value("admin@vinnot.test"))
                .andExpect(jsonPath("$.data[0].createdAt").value("2026-10-20T12:00:00Z"))
                .andExpect(jsonPath("$.data[0].completedAt").value("2026-10-20T12:05:00Z"))
                .andExpect(jsonPath("$.data[0].stats.emailsSent").value(30))
                .andExpect(jsonPath("$.data[0].stats.emailsFailed").value(2))
                .andExpect(jsonPath("$.data[0].stats.pushesSent").value(25))
                .andExpect(jsonPath("$.data[0].stats.pushesFailed").value(4))
                .andExpect(jsonPath("$.data[0].stats.pushesOpened").value(9));
    }

    @Test
    void anAdministratorReadsOneAnnouncementWithItsStatsWithoutReauthenticating() throws Exception {
        UUID id = UUID.randomUUID();
        when(sending.find(id)).thenReturn(new AnnouncementRecord(id, AnnouncementKind.SERVICE, false,
                new AnnouncementAudience(true, true, null, null, null, null), AnnouncementDestination.HOME, "Mantenimiento",
                12, "admin@vinnot.test", Instant.parse("2026-10-20T12:00:00Z"), null, new AnnouncementStats(11, 1, 7, 0, 3)));

        mvc.perform(get("/admin/notifications/announcements/" + id).with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id.toString()))
                .andExpect(jsonPath("$.data.recipients").value(12))
                .andExpect(jsonPath("$.data.completedAt").doesNotExist())
                .andExpect(jsonPath("$.data.stats.emailsSent").value(11))
                .andExpect(jsonPath("$.data.stats.emailsFailed").value(1))
                .andExpect(jsonPath("$.data.stats.pushesSent").value(7))
                .andExpect(jsonPath("$.data.stats.pushesFailed").value(0))
                .andExpect(jsonPath("$.data.stats.pushesOpened").value(3));
    }

    @Test
    void onlyAdministratorsReadOneAnnouncementAndAnUnknownIdIsNotFound() throws Exception {
        UUID unknown = UUID.randomUUID();
        when(sending.find(unknown)).thenThrow(new EntityNotFoundException("Announcement", unknown));

        mvc.perform(get("/admin/notifications/announcements/" + unknown).with(authentication(token(adminId, "ROLE_MODERATOR")))
                        .servletPath("/admin/notifications/announcements/" + unknown))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/notifications/announcements/" + unknown).with(authentication(token(adminId, "ROLE_PARTNER")))
                        .servletPath("/admin/notifications/announcements/" + unknown))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/notifications/announcements/" + unknown).with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/" + unknown))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void testingAndSendingNeedAFreshReauthentication() throws Exception {
        mvc.perform(post("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements").header("Authorization", "Bearer test")
                        .contentType(MediaType.APPLICATION_JSON).content(ANNOUNCEMENT))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("REAUTHENTICATION_REQUIRED"));
        mvc.perform(post("/admin/notifications/announcements/test").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/test").header("Authorization", "Bearer test")
                        .contentType(MediaType.APPLICATION_JSON).content(ANNOUNCEMENT))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("REAUTHENTICATION_REQUIRED"));
        verifyNoInteractions(announcements, sending);
    }

    @Test
    void aReauthenticatedAdministratorTestsAndSendsTheAnnouncementTheyWrote() throws Exception {
        when(proofs.permits(eq("proof"), eq(adminId), any())).thenReturn(true);
        Announcement expected = new Announcement(AnnouncementKind.SERVICE, Map.of(NotificationLocale.ES,
                new AnnouncementContent("Mantenimiento", "Domingo de 2 a 4.")),
                new AnnouncementAudience(true, true, "es", null, null, "PARTNER"), AnnouncementDestination.EVENTS);
        when(announcements.sendTest(expected, adminId)).thenReturn(new AnnouncementReach(1, 0, 1));
        UUID sent = UUID.randomUUID();
        when(sending.send(expected, adminId, null)).thenReturn(new AnnouncementRecord(sent, AnnouncementKind.SERVICE, false,
                expected.audience(), AnnouncementDestination.EVENTS, "Mantenimiento", 42, "admin@vinnot.test",
                Instant.parse("2026-10-20T12:00:00Z"), null));

        mvc.perform(post("/admin/notifications/announcements/test").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements/test").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof")
                        .contentType(MediaType.APPLICATION_JSON).content(ANNOUNCEMENT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(1))
                .andExpect(jsonPath("$.data.push").value(0));
        mvc.perform(post("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof")
                        .contentType(MediaType.APPLICATION_JSON).content(ANNOUNCEMENT))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.id").value(sent.toString()))
                .andExpect(jsonPath("$.data.recipients").value(42));
        UUID requestId = UUID.randomUUID();
        UUID country = UUID.randomUUID();
        Announcement inCountry = new Announcement(expected.kind(), expected.versions(),
                new AnnouncementAudience(true, true, "es", null, country, "PARTNER"), expected.destination());
        when(sending.send(inCountry, adminId, requestId)).thenReturn(new AnnouncementRecord(requestId, AnnouncementKind.SERVICE,
                false, inCountry.audience(), AnnouncementDestination.EVENTS, "Mantenimiento", 5, "admin@vinnot.test",
                Instant.parse("2026-10-20T12:00:00Z"), null));
        mvc.perform(post("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof").contentType(MediaType.APPLICATION_JSON)
                        .content(ANNOUNCEMENT.replace("\"kind\":\"SERVICE\"", "\"requestId\":\"" + requestId + "\",\"kind\":\"SERVICE\"")
                                .replace("\"role\"", "\"countryId\":\"" + country + "\",\"role\"")))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.id").value(requestId.toString()))
                .andExpect(jsonPath("$.data.countryId").value(country.toString()));
        mvc.perform(post("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"NEWS\",\"audience\":{\"email\":true,\"push\":false},\"destination\":\"HOME\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ANNOUNCEMENT_CONTENT_REQUIRED"));
        mvc.perform(post("/admin/notifications/announcements").with(authentication(token(adminId, "ROLE_ADMIN")))
                        .servletPath("/admin/notifications/announcements").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof").contentType(MediaType.APPLICATION_JSON)
                        .content(ANNOUNCEMENT.replace("EVENTS", "SETTINGS")))
                .andExpect(status().isBadRequest());
    }

    private static UsernamePasswordAuthenticationToken token(UUID id, String role) {
        return new UsernamePasswordAuthenticationToken(id.toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }
}
