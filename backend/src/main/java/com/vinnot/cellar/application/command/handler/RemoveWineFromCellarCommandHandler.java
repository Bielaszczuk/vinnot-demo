package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.command.model.RemoveWineFromCellarCommand;
import com.vinnot.cellar.application.port.in.RemoveWineFromCellarUseCase;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RemoveWineFromCellarCommandHandler implements RemoveWineFromCellarUseCase {

    private final CellarWineRepositoryPort cellarWineRepository;

    @Override
    @Transactional
    public void execute(RemoveWineFromCellarCommand command) {
        CellarWine cellarWine = cellarWineRepository.findById(command.cellarWineId())
                .orElseThrow(() -> new EntityNotFoundException("CellarWine", command.cellarWineId()));

        if (!cellarWine.getUserId().equals(command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "CELLAR_ENTRY_OWNERSHIP",
                    "You can only remove wines from your own cellar");
        }

        cellarWineRepository.delete(cellarWine);
    }
}
