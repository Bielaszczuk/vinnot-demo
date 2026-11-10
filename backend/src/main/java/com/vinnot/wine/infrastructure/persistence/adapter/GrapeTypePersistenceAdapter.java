package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.GrapeTypeRepositoryPort;
import com.vinnot.wine.infrastructure.persistence.jpa.GrapeTypeJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import lombok.RequiredArgsConstructor;

/**
 * Driven adapter: implements {@link GrapeTypeRepositoryPort} using JPA.
 * Translates between the port contract and {@link GrapeTypeJpaRepository}.
 */
@Component
@RequiredArgsConstructor
public class GrapeTypePersistenceAdapter implements GrapeTypeRepositoryPort {

    private final GrapeTypeJpaRepository jpaRepository;

    @Override
    public List<GrapeTypeData> findAllActive() {
        return jpaRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(entity -> new GrapeTypeData(
                        entity.getId(),
                        entity.getName(),
                        entity.getNameEs(),
                        entity.getCategory()
                ))
                .toList();
    }
}

