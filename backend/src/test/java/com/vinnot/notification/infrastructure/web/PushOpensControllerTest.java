package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.PushOpenUseCase;
import com.vinnot.notification.domain.model.NotificationType;
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

import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PushOpensControllerTest {
    private final UUID user = UUID.randomUUID();
    private final PushOpenUseCase useCase = mock(PushOpenUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new PushOpensController(useCase))
            .setCustomArgumentResolvers(principal())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void recordsTheOpenedPushForTheSignedInUser() throws Exception {
        mvc.perform(post("/users/me/push-opens").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ref\":\"event-nearby:abc\",\"type\":\"EVENT_NEARBY\"}"))
                .andExpect(status().isNoContent());

        verify(useCase).record(user, "event-nearby:abc", NotificationType.EVENT_NEARBY);
    }

    @Test
    void rejectsAMissingOrTooLongRefAndAnUnknownTypeBeforeReachingTheUseCase() throws Exception {
        for (String body : new String[]{
                "{\"type\":\"EVENT_NEARBY\"}",
                "{\"ref\":\"\",\"type\":\"EVENT_NEARBY\"}",
                "{\"ref\":\"" + "x".repeat(181) + "\",\"type\":\"EVENT_NEARBY\"}",
                "{\"ref\":\"a\"}",
                "{\"ref\":\"a\",\"type\":\"NOT_A_TYPE\"}",
                "{\"ref\":\"a\",\"type\":\"event_nearby\"}"}) {
            mvc.perform(post("/users/me/push-opens").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(useCase);
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
