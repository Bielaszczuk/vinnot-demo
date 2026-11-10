package com.vinnot.region.infrastructure.persistence.repository;

import com.vinnot.region.domain.model.Country;
import com.vinnot.region.domain.repository.CountryRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.region.infrastructure.persistence.entity.CountryJpaEntity;

@Component
@RequiredArgsConstructor
public class CountryRepositoryAdapter implements CountryRepository {

    private final CountryJpaRepository jpaRepository;

    @Override
    public List<Country> findAll() {
        return jpaRepository.findAll().stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<Country> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<Country> findByCode(String code) {
        return jpaRepository.findByCode(code).map(this::toDomain);
    }

    private Country toDomain(
            CountryJpaEntity entity) {
        return new Country(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getCreatedAt()
        );
    }
}

