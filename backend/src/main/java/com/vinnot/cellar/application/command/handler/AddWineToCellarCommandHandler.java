package com.vinnot.cellar.application.command.handler;

import com.vinnot.cellar.application.command.model.AddWineToCellarCommand;
import com.vinnot.cellar.application.port.in.AddWineToCellarUseCase;
import com.vinnot.cellar.application.port.out.CellarPointsPort;
import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AddWineToCellarCommandHandler implements AddWineToCellarUseCase {

    private final CellarWineRepositoryPort cellarWineRepository;
    private final CellarPointsPort points;

    @Override
    @Transactional
    public UUID execute(AddWineToCellarCommand command) {
        if (cellarWineRepository.existsByUserIdAndWineId(command.userId(), command.wineId())) {
            throw new BusinessRuleViolationException("Wine already exists in cellar");
        }

        CellarWine cellarWine = CellarWine.create(command.userId(), command.wineId());
        cellarWine.updateRating(command.rating());
        cellarWine.updatePurchasePrice(command.purchasePrice());
        cellarWine.updateNotes(command.notes());
        cellarWine.updateVintage(command.vintage());

        CellarWine saved = cellarWineRepository.save(cellarWine);
        // Only a manual add earns points; the entry a review creates goes through the review module.
        points.wineAddedByHand(command.userId(), command.wineId());
        return saved.getId();
    }
}

