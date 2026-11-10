package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushPlatform;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PushDevicesControllerTest {
    private final UUID user = UUID.randomUUID();
    private final ManagePushDevicesUseCase useCase = mock(ManagePushDevicesUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new PushDevicesController(useCase))
            .setCustomArgumentResolvers(principal())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void registersTheDeviceForTheSignedInUser() throws Exception {
        mvc.perform(put("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"ExponentPushToken[abc]\",\"platform\":\"ANDROID\",\"locale\":\"en\"}"))
                .andExpect(status().isNoContent());

        verify(useCase).register(user, "ExponentPushToken[abc]", PushPlatform.ANDROID, NotificationLocale.EN, false);
    }

    @Test
    void aDeviceWithTheCategoryChannelsSaysSo() throws Exception {
        mvc.perform(put("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"ExponentPushToken[abc]","platform":"ANDROID","locale":"es","channels":true}"""))
                .andExpect(status().isNoContent());
        mvc.perform(put("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"ExponentPushToken[old]","platform":"ANDROID","locale":"es","channels":false}"""))
                .andExpect(status().isNoContent());

        verify(useCase).register(user, "ExponentPushToken[abc]", PushPlatform.ANDROID, NotificationLocale.ES, true);
        verify(useCase).register(user, "ExponentPushToken[old]", PushPlatform.ANDROID, NotificationLocale.ES, false);
    }

    @Test
    void rejectsAnUnknownPlatformOrLocaleBeforeReachingTheUseCase() throws Exception {
        mvc.perform(put("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"ExponentPushToken[abc]\",\"platform\":\"WEB\",\"locale\":\"en\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"ExponentPushToken[abc]\",\"platform\":\"IOS\",\"locale\":\"fr\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(useCase);
    }

    @Test
    void aMalformedTokenIsABadRequest() throws Exception {
        doThrow(new DomainException("INVALID_PUSH_TOKEN", "invalid")).when(useCase).register(any(), any(), any(), any(), anyBoolean());

        mvc.perform(put("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"nope\",\"platform\":\"IOS\",\"locale\":\"es\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unregistersTheDevice() throws Exception {
        mvc.perform(delete("/users/me/push-devices").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"ExpoPushToken[abc]\"}"))
                .andExpect(status().isNoContent());

        verify(useCase).unregister(user, "ExpoPushToken[abc]");
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
