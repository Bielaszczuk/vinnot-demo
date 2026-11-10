package com.vinnot.wine.application.query.handler;

import com.vinnot.wine.application.query.model.GetAllGrapeTypesQuery;
import com.vinnot.wine.application.query.response.GrapeTypeResponse;
import com.vinnot.wine.application.port.in.GetAllGrapeTypesUseCase;
import com.vinnot.wine.application.port.out.GrapeTypeRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetAllGrapeTypesQuery.
 * Implements {@link GetAllGrapeTypesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetAllGrapeTypesQueryHandler
        implements GetAllGrapeTypesUseCase {

    private final GrapeTypeRepositoryPort grapeTypeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<GrapeTypeResponse> execute(GetAllGrapeTypesQuery query) {
        return grapeTypeRepository.findAllActive().stream()
                .map(GrapeTypeResponse::fromData)
                .toList();
    }
}

