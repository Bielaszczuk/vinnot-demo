package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.command.model.ToggleWineFeaturedCommand;
import com.vinnot.wine.application.port.in.ToggleWineFeaturedUseCase;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.vinnot.wine.application.service.RecommendWineService;
import java.time.Instant;

/**
 * Handler for ToggleWineFeaturedCommand.
 * Implements {@link ToggleWineFeaturedUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class ToggleWineFeaturedCommandHandler implements ToggleWineFeaturedUseCase {

    private final WineRepositoryPort wineRepository;
    private final RecommendWineService recommendations;

    @Override
    @Transactional
    public void execute(ToggleWineFeaturedCommand command) {
        Wine wine = wineRepository.findById(command.wineId())
                .orElseThrow(() -> new EntityNotFoundException("Wine", command.wineId()));

        wine.toggleFeatured();
        Wine saved = wineRepository.save(wine);
        if (saved.isFeatured()) {
            recommendations.recommend(saved, Instant.now());
        }
    }
}

