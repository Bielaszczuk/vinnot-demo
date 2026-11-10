package com.vinnot.activity.infrastructure.web;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;
import com.vinnot.activity.application.command.model.RecordContentViewCommand;
import com.vinnot.activity.application.port.in.RecordAppOpenUseCase;
import com.vinnot.activity.application.port.in.RecordContentViewUseCase;
import com.vinnot.activity.domain.model.ContentKind;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ActivityControllerTest {
    private final UUID user = UUID.randomUUID();
    private final RecordContentViewUseCase views = mock(RecordContentViewUseCase.class);
    private final RecordAppOpenUseCase opens = mock(RecordAppOpenUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ActivityController(views, opens))
            .setCustomArgumentResolvers(principal())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void recordsAViewOfEachKindOfDetailForTheSignedInUser() throws Exception {
        for (ContentKind kind : ContentKind.values()) {
            UUID id = UUID.randomUUID();
            mvc.perform(post("/users/me/activity/views").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"kind\":\"" + kind.name() + "\",\"id\":\"" + id + "\"}"))
                    .andExpect(status().isNoContent());

            verify(views).execute(new RecordContentViewCommand(user, kind, id));
        }
    }

    @Test
    void rejectsAnUnknownKindOrAMissingOrMalformedIdBeforeReachingTheUseCase() throws Exception {
        String id = UUID.randomUUID().toString();
        for (String body : new String[]{
                "{\"kind\":\"REVIEW\",\"id\":\"" + id + "\"}",
                "{\"kind\":\"wine\",\"id\":\"" + id + "\"}",
                "{\"id\":\"" + id + "\"}",
                "{\"kind\":\"WINE\"}",
                "{\"kind\":\"WINE\",\"id\":\"42\"}"}) {
            mvc.perform(post("/users/me/activity/views").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(views);
    }

    @Test
    void anAppOpenIsAcceptedWhetherItWasRecordedOrThrottled() throws Exception {
        when(opens.execute(any())).thenReturn(true, false);

        mvc.perform(post("/users/me/activity/app-open").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/users/me/activity/app-open"))
                .andExpect(status().isNoContent());

        verify(opens, times(2)).execute(new RecordAppOpenCommand(user));
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
