package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.command.model.ToggleWineActiveCommand;
import com.vinnot.wine.application.port.in.ToggleWineActiveUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for ToggleWineActiveCommand.
 * Toggles the active/inactive status of a wine through the domain model.
 * Implements {@link ToggleWineActiveUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class ToggleWineActiveCommandHandler implements ToggleWineActiveUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional
    public void execute(ToggleWineActiveCommand command) {
        Wine wine = wineRepository.findById(command.wineId())
                .orElseThrow(() -> new EntityNotFoundException("Wine", command.wineId()));

        wine.toggleActive();
        wineRepository.save(wine);
    }
}

