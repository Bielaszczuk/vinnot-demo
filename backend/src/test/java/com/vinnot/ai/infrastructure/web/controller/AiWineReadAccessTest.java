package com.vinnot.ai.infrastructure.web.controller;

import com.vinnot.ai.application.port.in.CompareWinesUseCase;
import com.vinnot.ai.application.port.in.GenerateAiProfileUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileStatusUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileUseCase;
import com.vinnot.ai.application.port.in.UpdateAiProfileUseCase;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** AI profiles and comparisons only exist for wines the reader may see (#345 B23). */
class AiWineReadAccessTest {

    private final UUID member = UUID.randomUUID();
    private final UUID hiddenWine = UUID.randomUUID();
    private final UUID visibleWine = UUID.randomUUID();
    private final ResourceReader reader = new ResourceReader(member, false);
    private final UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
            member.toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

    private final GetAiProfileUseCase profiles = mock(GetAiProfileUseCase.class);
    private final GenerateAiProfileUseCase generation = mock(GenerateAiProfileUseCase.class);
    private final GetAiProfileStatusUseCase statuses = mock(GetAiProfileStatusUseCase.class);
    private final CompareWinesUseCase comparisons = mock(CompareWinesUseCase.class);
    private final CheckWineReadAccessUseCase wineAccess = mock(CheckWineReadAccessUseCase.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
                    new AiProfileController(profiles, generation, statuses, mock(UpdateAiProfileUseCase.class), wineAccess),
                    new WineComparisonController(comparisons, wineAccess))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

    {
        doThrow(new EntityNotFoundException("Wine", hiddenWine)).when(wineAccess).check(hiddenWine, reader);
    }

    @Test
    void aWineTheReaderCannotSeeHasNoProfileStatusOrGeneration() throws Exception {
        mvc.perform(get("/wines/{id}/ai-profile", hiddenWine).principal(authentication))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(post("/wines/{id}/ai-profile", hiddenWine).principal(authentication))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(get("/wines/{id}/ai-profile/status", hiddenWine).principal(authentication))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        verifyNoInteractions(profiles, statuses);
        verify(generation, never()).generate(any(), anyString(), anyBoolean());
    }

    @Test
    void aVisibleWineIsCheckedWithTheCallerAndThenServed() throws Exception {
        when(profiles.get(visibleWine, "es")).thenReturn(Optional.empty());

        mvc.perform(get("/wines/{id}/ai-profile", visibleWine).principal(authentication))
                .andExpect(status().isNotFound());
        mvc.perform(post("/wines/{id}/ai-profile", visibleWine).principal(authentication))
                .andExpect(status().isOk());
        mvc.perform(get("/wines/{id}/ai-profile/status", visibleWine).principal(authentication))
                .andExpect(status().isOk());

        verify(wineAccess, times(3)).check(visibleWine, reader);
        verify(profiles).get(visibleWine, "es");
        verify(generation).generate(visibleWine, "es", false);
        verify(statuses).getStatus(visibleWine, "es");
    }

    @Test
    void comparisonsStillAnswerNotFoundForAWineTheReaderCannotSee() throws Exception {
        mvc.perform(post("/wines/compare").principal(authentication).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"wineAId\":\"%s\",\"wineBId\":\"%s\"}".formatted(visibleWine, hiddenWine)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        verifyNoInteractions(comparisons);
    }
}
