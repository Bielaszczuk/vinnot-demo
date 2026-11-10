package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckWineReadAccessQueryHandler implements CheckWineReadAccessUseCase {
    private final WineRepositoryPort wines;

    @Override
    @Transactional(readOnly = true)
    public void check(UUID wineId, ResourceReader reader) {
        wines.findById(wineId)
                .filter(wine -> reader.mayRead(wine.isActive(), wine.getCreatedBy()))
                .orElseThrow(() -> new EntityNotFoundException("Wine", wineId));
    }
}
