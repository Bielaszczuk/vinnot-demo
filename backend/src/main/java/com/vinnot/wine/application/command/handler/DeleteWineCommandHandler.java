package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.command.model.DeleteWineCommand;
import com.vinnot.wine.application.port.in.DeleteWineUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for DeleteWineCommand.
 * Implements {@link DeleteWineUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class DeleteWineCommandHandler implements DeleteWineUseCase {

    private final WineRepositoryPort wineRepository;

    @Override
    @Transactional
    public void execute(DeleteWineCommand command) {
        Wine wine = wineRepository.findById(command.wineId())
                .orElseThrow(() -> new EntityNotFoundException("Wine", command.wineId()));

        wineRepository.delete(wine);
    }
}

