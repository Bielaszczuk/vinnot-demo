package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.WineQueryPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("adminWineQueryAdapter")
@RequiredArgsConstructor
public class WineQueryAdapter implements WineQueryPort {

    private final WineRepositoryPort wineRepository;

    @Override
    public long count() {
        return wineRepository.count();
    }

    @Override
    public Optional<WineData> findById(UUID id) {
        return wineRepository.findById(id).map(this::toWineData);
    }

    @Override
    public List<WineData> findAllByIds(Collection<UUID> ids) {
        return wineRepository.findAllByIds(ids).stream()
                .map(this::toWineData)
                .toList();
    }

    private WineData toWineData(Wine wine) {
        return new WineData(
                wine.getId(),
                wine.getName(),
                wine.getVintage()
        );
    }
}

