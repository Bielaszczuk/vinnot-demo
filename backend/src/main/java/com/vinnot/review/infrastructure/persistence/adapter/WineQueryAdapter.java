package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.WineQueryPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("reviewWineQueryAdapter")
@RequiredArgsConstructor
public class WineQueryAdapter implements WineQueryPort {

    private final WineRepositoryPort wineRepository;

    @Override
    public Optional<WineData> findById(UUID wineId) {
        return wineRepository.findById(wineId)
                .map(wine -> new WineData(wine.getId(), wine.getName(), wine.getVintage()));
    }
}

