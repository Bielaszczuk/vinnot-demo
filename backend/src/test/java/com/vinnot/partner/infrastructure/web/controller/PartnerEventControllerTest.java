package com.vinnot.partner.infrastructure.web.controller;

import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.GetMyEventsUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.query.model.GetMyEventsQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PartnerEventControllerTest {

    private final UUID partner = UUID.randomUUID();
    private final UpdateEventUseCase updates = mock(UpdateEventUseCase.class);
    private final GetMyEventsUseCase myEvents = mock(GetMyEventsUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new PartnerEventController(
                    mock(CreateEventUseCase.class), updates, mock(CancelEventUseCase.class), myEvents))
            .setCustomArgumentResolvers(principal())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void forwardsTheFieldsThePartnerClearedLikeTheAdminEndpoint() throws Exception {
        UUID eventId = UUID.randomUUID();

        mvc.perform(put("/partner/events/{id}", eventId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Cata\",\"clearFields\":[\"contactPhone\",\"websiteUrl\"]}"))
                .andExpect(status().isOk());

        ArgumentCaptor<UpdateEventCommand> command = ArgumentCaptor.forClass(UpdateEventCommand.class);
        verify(updates).execute(command.capture());
        assertThat(command.getValue().eventId()).isEqualTo(eventId);
        assertThat(command.getValue().requestingUserId()).isEqualTo(partner);
        assertThat(command.getValue().isAdmin()).isFalse();
        assertThat(command.getValue().title()).isEqualTo("Cata");
        assertThat(command.getValue().clearFields()).containsExactlyInAnyOrder("contactPhone", "websiteUrl");
    }

    @Test
    void anUpdateWithoutClearedFieldsKeepsEveryOptionalValue() throws Exception {
        mvc.perform(put("/partner/events/{id}", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contactPhone\":\"+54 261 555\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<UpdateEventCommand> command = ArgumentCaptor.forClass(UpdateEventCommand.class);
        verify(updates).execute(command.capture());
        assertThat(command.getValue().contactPhone()).isEqualTo("+54 261 555");
        assertThat(command.getValue().clearFields()).isNullOrEmpty();
    }

    @Test
    void passesTheSearchForTheSignedInOrganizersEvents() throws Exception {
        when(myEvents.execute(any())).thenReturn(PageResult.of(List.of(), 2, 5, 0));

        mvc.perform(get("/partner/events").param("search", " Malbec ").param("page", "2").param("size", "5"))
                .andExpect(status().isOk());

        assertThat(sentQuery()).isEqualTo(new GetMyEventsQuery(partner, " Malbec ", 2, 5));
    }

    @Test
    void withoutASearchTheListIsTheSameAsBefore() throws Exception {
        when(myEvents.execute(any())).thenReturn(PageResult.of(List.of(), 0, 20, 0));

        mvc.perform(get("/partner/events")).andExpect(status().isOk());

        assertThat(sentQuery()).isEqualTo(new GetMyEventsQuery(partner, 0, 20));
        assertThat(sentQuery().searchTerm()).isNull();
    }

    private GetMyEventsQuery sentQuery() {
        ArgumentCaptor<GetMyEventsQuery> query = ArgumentCaptor.forClass(GetMyEventsQuery.class);
        verify(myEvents).execute(query.capture());
        return query.getValue();
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
                return partner.toString();
            }
        };
    }
}
