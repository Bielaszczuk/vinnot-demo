package com.vinnot.ai.infrastructure.web.controller;

import com.vinnot.ai.application.dto.WineComparisonResponse;
import com.vinnot.ai.application.port.in.CompareWinesUseCase;
import com.vinnot.ai.infrastructure.web.request.CompareWinesRequest;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wines/compare")
@Tag(name = "Wine Comparison", description = "AI-powered wine comparison endpoints")
@RequiredArgsConstructor
public class WineComparisonController {

    private final CompareWinesUseCase compareWinesUseCase;
    private final CheckWineReadAccessUseCase wineAccess;

    /**
     * Compares two wines using AI.
     *
     * @param request the comparison request
     * @return the comparison result
     */
    @PostMapping
    @Operation(summary = "Compare two wines using AI")
    public ResponseEntity<WineComparisonResponse> compare(@Valid @RequestBody CompareWinesRequest request,
                                                         Authentication authentication) {
        var reader = AuthorizationUtils.resourceReader(authentication);
        wineAccess.check(request.wineAId(), reader);
        wineAccess.check(request.wineBId(), reader);
        WineComparisonResponse response = compareWinesUseCase.compare(
                request.wineAId(),
                request.wineBId(),
                request.getLanguageOrDefault()
        );
        return ResponseEntity.ok(response);
    }
}
