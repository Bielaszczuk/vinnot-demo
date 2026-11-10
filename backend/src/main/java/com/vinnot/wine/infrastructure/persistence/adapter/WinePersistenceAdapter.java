package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.region.infrastructure.persistence.entity.CountryJpaEntity;
import com.vinnot.region.infrastructure.persistence.entity.RegionJpaEntity;
import com.vinnot.region.infrastructure.persistence.repository.CountryJpaRepository;
import com.vinnot.region.infrastructure.persistence.repository.RegionJpaRepository;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineLabelSearchCriteria;
import com.vinnot.wine.application.exception.WineLabelCatalogSearchTimeoutException;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.valueobject.WineType;
import com.vinnot.wine.infrastructure.persistence.entity.WineJpaEntity;
import com.vinnot.wine.infrastructure.persistence.jpa.WineJpaRepository;
import com.vinnot.wine.infrastructure.persistence.mapper.WinePersistenceMapper;
import com.vinnot.wine.infrastructure.persistence.search.WineSearchNativeRepository;
import org.springframework.stereotype.Component;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;

/**
 * Driven adapter: implements {@link WineRepositoryPort} using JPA.
 * Delegates complex native-SQL searches to {@link WineSearchNativeRepository}.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WinePersistenceAdapter implements WineRepositoryPort {

    private final WineJpaRepository jpaRepository;
    private final CountryJpaRepository countryJpaRepository;
    private final RegionJpaRepository regionJpaRepository;
    private final WineSearchNativeRepository searchRepository;

    @Override
    public Optional<Wine> findById(UUID id) {
        return jpaRepository.findById(id).map(WinePersistenceMapper::toDomain);
    }

    @Override
    @Transactional
    public Optional<Wine> findByIdForUpdate(UUID id) {
        return jpaRepository.findByIdForUpdate(id).map(WinePersistenceMapper::toDomain);
    }

    @Override
    public PageResult<Wine> findAll(PageQuery pageQuery, boolean includeInactive) {
        var pageable = PageMapper.toPageable(pageQuery);
        if (includeInactive) {
            return PageMapper.toPageResult(jpaRepository.findAll(pageable).map(WinePersistenceMapper::toDomain));
        }
        return PageMapper.toPageResult(
                jpaRepository.findByActiveTrueOrderByNameAsc(pageable).map(WinePersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Wine> findFeatured(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findByFeaturedTrueAndActiveTrue(PageMapper.toPageable(pageQuery))
                        .map(WinePersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Wine> findTopRated(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findTopRated(PageMapper.toPageable(pageQuery)).map(WinePersistenceMapper::toDomain));
    }

    @Override
    public List<Wine> findHighlights(int limit) {
        return jpaRepository.findHighlights(PageRequest.of(0, limit)).stream()
                .map(WinePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public PageResult<Wine> findRecent(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findRecent(PageMapper.toPageable(pageQuery)).map(WinePersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Wine> searchAdvanced(String searchTerm, String wineType, UUID wineryId,
                                           String country, String region,
                                           String grapeVariety, PageQuery pageQuery,
                                           boolean includeInactive) {
        return searchRepository.searchAdvanced(
                searchTerm, wineType, wineryId, country, region, grapeVariety,
                PageMapper.toPageable(pageQuery), includeInactive);
    }

    @Override
    public List<Wine> findByWineryId(UUID wineryId) {
        return jpaRepository.findByWineryIdAndActiveTrue(wineryId).stream()
                .map(WinePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public Wine save(Wine wine) {
        WineJpaEntity entity = WinePersistenceMapper.toEntity(wine);
        if (Objects.nonNull(wine.getCountryId())) {
            CountryJpaEntity countryRef = countryJpaRepository.getReferenceById(wine.getCountryId());
            entity.setCountryEntity(countryRef);
        }
        if (Objects.nonNull(wine.getRegionId())) {
            RegionJpaEntity regionRef = regionJpaRepository.getReferenceById(wine.getRegionId());
            entity.setRegionEntity(regionRef);
        }
        return WinePersistenceMapper.toDomain(jpaRepository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void delete(Wine wine) {
        jpaRepository.deleteById(wine.getId());
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public List<Wine> findSimilar(WineType wineType, UUID excludeId, int limit) {
        return jpaRepository.findSimilar(WineJpaEntity.WineTypeEnum.valueOf(wineType.name()), excludeId, limit)
                .stream().map(WinePersistenceMapper::toDomain).toList();
    }

    @Override
    public PageResult<Wine> findPopular(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findPopular(PageMapper.toPageable(pageQuery)).map(WinePersistenceMapper::toDomain));
    }

    @Override
    public PageResult<Wine> findRecommended(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findRecommended(PageMapper.toPageable(pageQuery)).map(WinePersistenceMapper::toDomain));
    }

    @Override
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public List<Wine> findByFuzzyMatch(WineLabelSearchCriteria criteria) {
        try {
            return searchRepository.findByFuzzyMatch(
                    criteria.identityTerms(),
                    criteria.vintage(),
                    criteria.grapeVariety(),
                    criteria.wineType(),
                    criteria.limit());
        } catch (QueryTimeoutException exception) {
            throw new WineLabelCatalogSearchTimeoutException(exception);
        }
    }

    @Override
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public List<Wine> findByIndexedIdentity(WineLabelSearchCriteria criteria) {
        try {
            return searchRepository.findByIndexedIdentity(
                    criteria.identityTerms(), criteria.limit());
        } catch (QueryTimeoutException exception) {
            throw new WineLabelCatalogSearchTimeoutException(exception);
        }
    }

    @Override
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public List<Wine> findByCommercialIdentity(WineLabelSearchCriteria criteria) {
        try {
            return searchRepository.findByCommercialIdentity(
                    criteria.identityTerms(), criteria.vintage(),
                    criteria.grapeVariety(), criteria.wineType(), criteria.limit());
        } catch (QueryTimeoutException exception) {
            throw new WineLabelCatalogSearchTimeoutException(exception);
        }
    }

    @Override
    public List<Wine> findAllByIds(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jpaRepository.findAllById(ids).stream().map(WinePersistenceMapper::toDomain).toList();
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

}
