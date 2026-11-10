package com.vinnot.wine.infrastructure.web.controller;

import com.vinnot.wine.application.port.in.GetAllGrapeTypesUseCase;
import com.vinnot.wine.application.query.model.GetAllGrapeTypesQuery;
import com.vinnot.wine.application.query.response.GrapeTypeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/grape-types")
@Tag(name = "Grape Types", description = "Reference data for grape varieties")
@RequiredArgsConstructor
public class GrapeTypeController {

    private final GetAllGrapeTypesUseCase getAllGrapeTypesUseCase;

    @GetMapping
    @Operation(summary = "Get all active grape types")
    public ResponseEntity<List<GrapeTypeResponse>> getAll() {
        List<GrapeTypeResponse> grapeTypes =
                getAllGrapeTypesUseCase.execute(new GetAllGrapeTypesQuery());
        return ResponseEntity.ok(grapeTypes);
    }
}
