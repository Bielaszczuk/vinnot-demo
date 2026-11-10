package com.vinnot.ai.infrastructure.web.controller;

import com.vinnot.ai.application.dto.AiProfileResponse;
import com.vinnot.ai.application.dto.AiProfileStatusResponse;
import com.vinnot.ai.application.port.in.GenerateAiProfileUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileStatusUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileUseCase;
import com.vinnot.ai.application.port.in.UpdateAiProfileUseCase;
import com.vinnot.ai.infrastructure.web.request.GenerateProfileRequest;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.Objects;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/wines/{wineId}/ai-profile")
@Tag(name = "AI Profile", description = "AI-generated wine analysis endpoints")
@RequiredArgsConstructor
public class AiProfileController {

    private final GetAiProfileUseCase getProfileUseCase;
    private final GenerateAiProfileUseCase generateProfileUseCase;
    private final GetAiProfileStatusUseCase getProfileStatusUseCase;
    private final UpdateAiProfileUseCase updateProfileUseCase;
    private final CheckWineReadAccessUseCase wineAccess;

    /**
     * Gets an already generated AI profile for a wine.
     *
     * @param wineId   the wine ID
     * @param language the language code (default: es)
     * @return the AI profile
     */
    @GetMapping
    @Operation(summary = "Get AI profile for a wine")
    public ResponseEntity<AiProfileResponse> getProfile(
            @PathVariable UUID wineId,
            @RequestParam(defaultValue = "es") String language,
            Authentication authentication) {

        requireReadable(wineId, authentication);
        return ResponseEntity.of(getProfileUseCase.get(wineId, language));
    }

    /**
     * Ensures that the complete localized AI profile bundle exists.
     *
     * @param wineId   the wine ID
     * @param language the language code (default: es)
     * @return the AI profile
     */
    @PostMapping
    @Operation(summary = "Generate AI profile for a wine")
    public ResponseEntity<AiProfileResponse> generateProfile(
            @PathVariable UUID wineId,
            @RequestParam(defaultValue = "es") String language,
            @Valid @RequestBody(required = false) GenerateProfileRequest request,
            Authentication authentication) {

        requireReadable(wineId, authentication);
        String requestedLanguage = Objects.nonNull(request)
                && Objects.nonNull(request.language())
                ? request.language()
                : language;
        AiProfileResponse response = generateProfileUseCase.generate(
                wineId, requestedLanguage, false);
        return ResponseEntity.ok(response);
    }

    /**
     * Forces regeneration of an AI profile.
     *
     * @param wineId   the wine ID
     * @param language the language code (default: es)
     * @return the new AI profile
     */
    @PostMapping("/generate")
    @PreAuthorize("hasAuthority('WINE_UPDATE')")
    @Operation(summary = "Force regenerate AI profile for a wine")
    public ResponseEntity<AiProfileResponse> forceRegenerate(
            @PathVariable UUID wineId,
            @RequestParam(defaultValue = "es") String language) {

        AiProfileResponse response = generateProfileUseCase.generate(
                wineId, language, true);
        return ResponseEntity.ok(response);
    }

    /**
     * Updates an AI profile's content (admin manual edit).
     *
     * @param wineId   the wine ID
     * @param language the language code (default: es)
     * @param profileContent the updated profile JSON content
     * @return the updated AI profile
     */
    @PatchMapping
    @PreAuthorize("hasAuthority('WINE_UPDATE')")
    @Operation(summary = "Update AI profile content (admin edit)")
    public ResponseEntity<AiProfileResponse> updateProfile(
            @PathVariable UUID wineId,
            @RequestParam(defaultValue = "es") String language,
            @RequestBody Map<String, Object> profileContent) {

        AiProfileResponse response = updateProfileUseCase.update(
                wineId, language, profileContent);
        return ResponseEntity.ok(response);
    }

    /**
     * Gets the status of an AI profile.
     *
     * @param wineId   the wine ID
     * @param language the language code (default: es)
     * @return the profile status
     */
    @GetMapping("/status")
    @Operation(summary = "Get AI profile status for a wine")
    public ResponseEntity<AiProfileStatusResponse> getStatus(
            @PathVariable UUID wineId,
            @RequestParam(defaultValue = "es") String language,
            Authentication authentication) {

        requireReadable(wineId, authentication);
        AiProfileStatusResponse response = getProfileStatusUseCase.getStatus(
                wineId, language);
        return ResponseEntity.ok(response);
    }

    /**
     * Profiles describe a wine, so they follow the wine's visibility, as comparisons do: an inactive wine the
     * caller neither owns nor moderates answers like a missing one, before any profile is read or generated.
     */
    private void requireReadable(UUID wineId, Authentication authentication) {
        wineAccess.check(wineId, AuthorizationUtils.resourceReader(authentication));
    }
}
