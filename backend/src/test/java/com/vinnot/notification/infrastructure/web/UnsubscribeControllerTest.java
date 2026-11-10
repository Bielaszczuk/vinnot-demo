package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.UnsubscribeUseCase;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UnsubscribeControllerTest {
    private final UnsubscribeUseCase useCase = mock(UnsubscribeUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new UnsubscribeController(useCase))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    @Test
    void acceptsTheRfc8058OneClickPostFromAMailProvider() throws Exception {
        when(useCase.unsubscribe("token")).thenReturn(NotificationCategory.NEWSLETTER);

        mvc.perform(post("/notifications/unsubscribe").param("token", "token")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED).content("List-Unsubscribe=One-Click"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.category").value("NEWSLETTER"));
    }

    @Test
    void reportsAnInvalidLinkAndNeverChangesAnythingOnGet() throws Exception {
        when(useCase.unsubscribe("bad")).thenThrow(
                new DomainException("INVALID_UNSUBSCRIBE_LINK", "This unsubscribe link is not valid"));

        mvc.perform(post("/notifications/unsubscribe").param("token", "bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_UNSUBSCRIBE_LINK"));
        mvc.perform(get("/notifications/unsubscribe").param("token", "token"))
                .andExpect(status().isMethodNotAllowed());
    }
}
