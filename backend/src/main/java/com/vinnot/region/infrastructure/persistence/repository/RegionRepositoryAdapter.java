package com.vinnot.region.infrastructure.persistence.repository;

import com.vinnot.region.domain.model.Region;
import com.vinnot.region.domain.repository.RegionRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.region.infrastructure.persistence.entity.RegionJpaEntity;

@Component
@RequiredArgsConstructor
public class RegionRepositoryAdapter implements RegionRepository {

    private final RegionJpaRepository jpaRepository;

    @Override
    public List<Region> findAll() {
        return jpaRepository.findAll().stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<Region> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Region> findByCountryId(UUID countryId) {
        return jpaRepository.findByCountryId(countryId).stream()
                .map(this::toDomain)
                .toList();
    }

    private Region toDomain(RegionJpaEntity entity) {
        return new Region(
                entity.getId(),
                entity.getName(),
                entity.getCountry().getId(),
                entity.getCountry().getCode(),
                entity.getCountry().getName(),
                entity.getCreatedAt()
        );
    }
}

