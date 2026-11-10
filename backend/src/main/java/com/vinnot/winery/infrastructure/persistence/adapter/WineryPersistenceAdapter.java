package com.vinnot.winery.infrastructure.persistence.adapter;

import java.util.stream.Collectors;
import java.util.Map;
import com.vinnot.region.infrastructure.persistence.entity.CountryJpaEntity;
import com.vinnot.region.infrastructure.persistence.entity.RegionJpaEntity;
import com.vinnot.region.infrastructure.persistence.repository.CountryJpaRepository;
import com.vinnot.region.infrastructure.persistence.repository.RegionJpaRepository;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.infrastructure.persistence.entity.WineryJpaEntity;
import com.vinnot.winery.infrastructure.persistence.jpa.WineryJpaRepository;
import com.vinnot.winery.infrastructure.persistence.mapper.WineryPersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * Implementation of WineryRepositoryPort using JPA.
 */
@Component
@RequiredArgsConstructor
public class WineryPersistenceAdapter implements WineryRepositoryPort {

    private final WineryJpaRepository jpaRepository;
    private final CountryJpaRepository countryJpaRepository;
    private final RegionJpaRepository regionJpaRepository;

    @Override
    public Optional<Winery> findById(UUID id) {
        return jpaRepository.findById(id)
                .map(WineryPersistenceMapper::toDomain);
    }

    @Override
    public List<Winery> findAllByIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findAllById(ids)
                .stream()
                .map(WineryPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<Winery> findActiveByExactNames(List<String> names) {
        List<String> normalized = names.stream()
                .filter(Objects::nonNull)
                .filter(name -> !name.isBlank())
                .map(name -> name.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findActiveByExactNames(normalized).stream()
                .map(WineryPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<Winery> findBySlug(String slug) {
        return jpaRepository.findBySlug(slug)
                .map(WineryPersistenceMapper::toDomain);
    }

    @Override
    public PageResult<Winery> findAll(PageQuery pageQuery, boolean includeInactive) {
        if (includeInactive) {
            return PageMapper.toPageResult(
                    jpaRepository.findAll(PageMapper.toPageable(pageQuery))
                            .map(WineryPersistenceMapper::toDomain));
        }
        return PageMapper.toPageResult(
                jpaRepository.findByActiveTrueOrderByNameAsc(PageMapper.toPageable(pageQuery))
                        .map(WineryPersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Winery> search(String searchTerm, String country,
                               String region, PageQuery pageQuery) {
        String normalizedSearchTerm = Objects.nonNull(searchTerm) && !searchTerm.isBlank()
                ? searchTerm.trim()
                : null;

        if (Objects.isNull(normalizedSearchTerm)) {
            return PageMapper.toPageResult(
                    jpaRepository.searchWithoutTerm(country, region, PageMapper.toPageable(pageQuery))
                            .map(WineryPersistenceMapper::toDomain));
        }

        return PageMapper.toPageResult(
                jpaRepository.search(normalizedSearchTerm, country, region, PageMapper.toPageable(pageQuery))
                        .map(WineryPersistenceMapper::toDomain));
    }

    @Override
    public List<Winery> findByCountry(String countryCode) {
        return jpaRepository.findByCountryEntityCodeAndActiveTrue(countryCode)
                .stream()
                .map(WineryPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<Winery> findByRegion(String regionName) {
        return jpaRepository.findByRegionEntityNameAndActiveTrue(regionName)
                .stream()
                .map(WineryPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Winery save(Winery winery) {
        WineryJpaEntity entity = WineryPersistenceMapper.toEntity(winery);

        // Resolve FK entity references
        if (Objects.nonNull(winery.getCountryId())) {
            CountryJpaEntity countryRef = countryJpaRepository
                    .getReferenceById(winery.getCountryId());
            entity.setCountryEntity(countryRef);
        }
        if (Objects.nonNull(winery.getRegionId())) {
            RegionJpaEntity regionRef = regionJpaRepository
                    .getReferenceById(winery.getRegionId());
            entity.setRegionEntity(regionRef);
        }

        WineryJpaEntity saved = jpaRepository.save(entity);
        return WineryPersistenceMapper.toDomain(saved);
    }

    @Override
    public void delete(Winery winery) {
        jpaRepository.deleteById(winery.getId());
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaRepository.existsBySlug(slug);
    }

    @Override
    public Map<UUID, Integer> countActiveWinesByWineryIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return jpaRepository.countActiveWinesByWineryIds(ids).stream()
                .collect(Collectors.toMap(
                        WineryJpaRepository.WineCount::getWineryId,
                        row -> Math.toIntExact(row.getWinesCount())));
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }
}
