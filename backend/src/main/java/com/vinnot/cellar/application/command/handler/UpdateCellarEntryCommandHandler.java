package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.command.model.UpdateCellarEntryCommand;
import com.vinnot.cellar.application.port.in.UpdateCellarEntryUseCase;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UpdateCellarEntryCommandHandler implements UpdateCellarEntryUseCase {

    private final CellarWineRepositoryPort cellarWineRepository;

    @Override
    @Transactional
    public void execute(UpdateCellarEntryCommand command) {
        CellarWine cellarWine = cellarWineRepository.findById(command.cellarWineId())
                .orElseThrow(() -> new EntityNotFoundException("CellarWine", command.cellarWineId()));

        if (!cellarWine.getUserId().equals(command.requestingUserId())) {
            throw new BusinessRuleViolationException(
                    "CELLAR_ENTRY_OWNERSHIP",
                    "You can only update wines in your own cellar");
        }

        cellarWine.updateRating(command.rating());
        cellarWine.updatePurchasePrice(command.purchasePrice());
        cellarWine.updateNotes(command.notes());
        // Older app versions never send the vintage: omitting it keeps the stored one, only clearVintage removes it.
        if (command.clearVintage()) {
            cellarWine.updateVintage(null);
        } else if (Objects.nonNull(command.vintage())) {
            cellarWine.updateVintage(command.vintage());
        }

        cellarWineRepository.save(cellarWine);
    }
}
