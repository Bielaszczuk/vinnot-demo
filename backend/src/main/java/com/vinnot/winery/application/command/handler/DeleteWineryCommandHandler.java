package com.vinnot.winery.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.winery.application.command.model.DeleteWineryCommand;
import com.vinnot.winery.application.port.in.DeleteWineryUseCase;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for DeleteWineryCommand.
 * Implements {@link DeleteWineryUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class DeleteWineryCommandHandler implements DeleteWineryUseCase {

    private final WineryRepositoryPort wineryRepository;

    @Override
    @Transactional
    public void execute(DeleteWineryCommand command) {
        Winery winery = wineryRepository.findById(command.wineryId())
                .orElseThrow(() -> new EntityNotFoundException("Winery", command.wineryId()));

        wineryRepository.delete(winery);
    }
}

