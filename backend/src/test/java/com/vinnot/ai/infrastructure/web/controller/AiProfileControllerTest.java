package com.vinnot.ai.infrastructure.web.controller;

import com.vinnot.ai.application.port.in.GenerateAiProfileUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileStatusUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileUseCase;
import com.vinnot.ai.application.port.in.UpdateAiProfileUseCase;
import com.vinnot.ai.infrastructure.web.request.GenerateProfileRequest;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;

class AiProfileControllerTest {

    private GetAiProfileUseCase getProfileUseCase;
    private GenerateAiProfileUseCase generateProfileUseCase;
    private GetAiProfileStatusUseCase getStatusUseCase;
    private UpdateAiProfileUseCase updateProfileUseCase;
    private AiProfileController controller;

    @BeforeEach
    void setUp() {
        getProfileUseCase = mock(GetAiProfileUseCase.class);
        generateProfileUseCase = mock(GenerateAiProfileUseCase.class);
        getStatusUseCase = mock(GetAiProfileStatusUseCase.class);
        updateProfileUseCase = mock(UpdateAiProfileUseCase.class);
        controller = new AiProfileController(
                getProfileUseCase, generateProfileUseCase,
                getStatusUseCase, updateProfileUseCase, mock(CheckWineReadAccessUseCase.class));
    }

    @Test
    void usesTheLanguageDeclaredByTheGenerationCommand() {
        UUID wineId = UUID.randomUUID();

        controller.generateProfile(
                wineId,
                "es",
                new GenerateProfileRequest("en"),
                null);

        verify(generateProfileUseCase).generate(wineId, "en", false);
    }

    @Test
    void keepsProfileReadsPureAndReturnsNotFoundForAMissingLanguage() {
        UUID wineId = UUID.randomUUID();
        when(getProfileUseCase.get(wineId, "en")).thenReturn(Optional.empty());

        var response = controller.getProfile(wineId, "en", null);

        assertThat(response.getStatusCode().value())
                .isEqualTo(404);
        verify(getProfileUseCase).get(wineId, "en");
        verify(generateProfileUseCase, never()).generate(
                any(),
                any(),
                anyBoolean());
    }

    @Test
    void forcesRegenerationOnlyThroughThePermissionProtectedOperation() {
        UUID wineId = UUID.randomUUID();

        controller.forceRegenerate(wineId, "en");

        verify(generateProfileUseCase).generate(wineId, "en", true);
    }
}
