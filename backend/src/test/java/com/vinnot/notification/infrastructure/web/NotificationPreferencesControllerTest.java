package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.ManageNotificationPreferencesUseCase;
import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationPreferences.Choice;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.vinnot.notification.domain.model.NotificationCategory.ACCOUNT;
import static com.vinnot.notification.domain.model.NotificationCategory.COMMUNITY;
import static com.vinnot.notification.domain.model.NotificationCategory.EVENTS_NEARBY;
import static com.vinnot.notification.domain.model.NotificationCategory.NEWSLETTER;
import static com.vinnot.notification.domain.model.NotificationCategory.REMINDERS;
import static com.vinnot.notification.domain.model.NotificationChannel.EMAIL;
import static com.vinnot.notification.domain.model.NotificationChannel.PUSH;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NotificationPreferencesControllerTest {

    private final UUID user = UUID.randomUUID();
    private final ManageNotificationPreferencesUseCase useCase = mock(ManageNotificationPreferencesUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new NotificationPreferencesController(useCase))
            .setCustomArgumentResolvers(principal())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void listsTransactionalCategoriesAsAlwaysOnAndOptionalOnesWithTheirState() throws Exception {
        when(useCase.get(user)).thenReturn(new NotificationPreferences(
                Map.of(new Choice(COMMUNITY, EMAIL), false),
                new MarketingConsent(true, Instant.parse("2026-10-19T12:00:00Z"), ConsentSource.WEB)));
        when(useCase.availableChannels()).thenReturn(Map.of(
                ACCOUNT, Set.of(EMAIL, PUSH), COMMUNITY, Set.of(EMAIL, PUSH), EVENTS_NEARBY, Set.of(PUSH)));

        mvc.perform(get("/users/me/notification-preferences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.marketingConsent.granted").value(true))
                .andExpect(jsonPath("$.data.marketingConsent.source").value("WEB"))
                .andExpect(jsonPath("$.data.categories[0].category").value("ACCOUNT"))
                .andExpect(jsonPath("$.data.categories[0].kind").value("TRANSACTIONAL"))
                .andExpect(jsonPath("$.data.categories[0].email").value(true))
                .andExpect(jsonPath("$.data.categories[0].editable").value(false))
                .andExpect(jsonPath("$.data.categories[0].emailAvailable").value(true))
                .andExpect(jsonPath("$.data.categories[0].pushAvailable").value(true))
                .andExpect(jsonPath("$.data.categories[4].category").value("EVENTS_NEARBY"))
                .andExpect(jsonPath("$.data.categories[4].email").value(true))
                .andExpect(jsonPath("$.data.categories[4].emailAvailable").value(false))
                .andExpect(jsonPath("$.data.categories[4].pushAvailable").value(true))
                .andExpect(jsonPath("$.data.categories[2].category").value("PAYMENTS"))
                .andExpect(jsonPath("$.data.categories[6].category").value("COMMUNITY"))
                .andExpect(jsonPath("$.data.categories[6].email").value(false))
                .andExpect(jsonPath("$.data.categories[6].push").value(true))
                .andExpect(jsonPath("$.data.categories[6].editable").value(true))
                .andExpect(jsonPath("$.data.categories[7].category").value("REMINDERS"))
                .andExpect(jsonPath("$.data.categories[7].kind").value("OPTIONAL"))
                .andExpect(jsonPath("$.data.categories[7].push").value(true))
                .andExpect(jsonPath("$.data.categories[7].editable").value(true))
                .andExpect(jsonPath("$.data.categories[8].category").value("NEWSLETTER"))
                .andExpect(jsonPath("$.data.categories.length()").value(9));
    }

    @Test
    void passesPerChannelChoicesAndTheConsentDecisionWithItsSource() throws Exception {
        when(useCase.update(eq(user), any(), eq(true), eq(ConsentSource.MOBILE)))
                .thenReturn(NotificationPreferences.defaults());

        mvc.perform(put("/users/me/notification-preferences").contentType(MediaType.APPLICATION_JSON).content("""
                        {"marketingConsent":true,"source":"MOBILE",
                         "categories":[{"category":"NEWSLETTER","email":true},{"category":"COMMUNITY","push":false},
                                       {"category":"REMINDERS","push":false}]}
                        """))
                .andExpect(status().isOk());

        verify(useCase).update(user, Map.of(new Choice(NEWSLETTER, EMAIL), true, new Choice(COMMUNITY, PUSH), false,
                new Choice(REMINDERS, PUSH), false), true, ConsentSource.MOBILE);
    }

    @Test
    void rejectsUnknownCategoriesAndSourcesBeforeReachingTheUseCase() throws Exception {
        mvc.perform(put("/users/me/notification-preferences").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"source\":\"WEB\",\"categories\":[{\"category\":\"SUPPORT\",\"email\":false}]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/users/me/notification-preferences").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"source\":\"EMAIL_UNSUBSCRIBE\",\"marketingConsent\":false}"))
                .andExpect(status().isBadRequest());

        verify(useCase, never()).update(any(), any(), any(), any());
    }

    @Test
    void reportsBusinessRulesAsBadRequests() throws Exception {
        when(useCase.update(any(), any(), any(), any())).thenThrow(
                new DomainException("MARKETING_CONSENT_REQUIRED", "Promotional notifications need marketing consent"));

        mvc.perform(put("/users/me/notification-preferences").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"source\":\"WEB\",\"categories\":[{\"category\":\"NEWSLETTER\",\"email\":true}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MARKETING_CONSENT_REQUIRED"));
    }

    private HandlerMethodArgumentResolver principal() {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                    NativeWebRequest request, WebDataBinderFactory binderFactory) {
                return user.toString();
            }
        };
    }
}
