package com.vinnot.event.infrastructure.web.controller;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase;
import com.vinnot.event.application.port.in.ManageEventAreaUseCase.AreaView;
import com.vinnot.event.domain.valueobject.EventArea;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
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

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EventAreaControllerTest {
    private final UUID user = UUID.randomUUID();
    private final ManageEventAreaUseCase useCase = mock(ManageEventAreaUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new EventAreaController(useCase))
            .setCustomArgumentResolvers(principal())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void showsTheRegionOrThatAnApproximateLocationIsUsedButNeverTheLocation() throws Exception {
        UUID region = UUID.randomUUID();
        when(useCase.find(user)).thenReturn(Optional.of(new AreaView(AreaView.Kind.REGION, region, "Mendoza")));
        mvc.perform(get("/users/me/event-area")).andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("REGION")).andExpect(jsonPath("$.regionName").value("Mendoza"))
                .andExpect(jsonPath("$.regionId").value(region.toString()));

        when(useCase.find(user)).thenReturn(Optional.of(new AreaView(AreaView.Kind.APPROXIMATE, null, null)));
        mvc.perform(get("/users/me/event-area")).andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("APPROXIMATE")).andExpect(jsonPath("$.latitude").doesNotExist());

        when(useCase.find(user)).thenReturn(Optional.empty());
        mvc.perform(get("/users/me/event-area")).andExpect(status().isNoContent());
    }

    @Test
    void storesARegionOrAnApproximateLocation() throws Exception {
        UUID region = UUID.randomUUID();
        mvc.perform(put("/users/me/event-area").contentType(MediaType.APPLICATION_JSON)
                .content("{\"regionId\":\"" + region + "\"}")).andExpect(status().isNoContent());
        verify(useCase).set(user, EventArea.region(region));

        mvc.perform(put("/users/me/event-area").contentType(MediaType.APPLICATION_JSON)
                .content("{\"latitude\":-32.889,\"longitude\":-68.845}")).andExpect(status().isNoContent());
        verify(useCase).set(user, EventArea.approximate(-32.9, -68.8));
    }

    @Test
    void refusesBothNeitherOrHalfALocationAndOutOfRangeValues() throws Exception {
        for (String body : new String[] {"{}", "{\"latitude\":-32.9}",
                "{\"regionId\":\"" + UUID.randomUUID() + "\",\"latitude\":1,\"longitude\":1}",
                "{\"latitude\":95,\"longitude\":1}"}) {
            mvc.perform(put("/users/me/event-area").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(useCase);
    }

    @Test
    void anUnknownRegionIsNotFoundAndClearingStopsTheArea() throws Exception {
        doThrow(new EntityNotFoundException("Region", "x")).when(useCase).set(any(), any());
        mvc.perform(put("/users/me/event-area").contentType(MediaType.APPLICATION_JSON)
                .content("{\"regionId\":\"" + UUID.randomUUID() + "\"}")).andExpect(status().isNotFound());

        mvc.perform(delete("/users/me/event-area")).andExpect(status().isNoContent());
        verify(useCase).clear(user);
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
