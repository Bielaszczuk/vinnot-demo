package com.vinnot.wineroute.infrastructure.persistence.adapter;

import com.vinnot.wineroute.application.port.out.WineRouteRepositoryPort;
import com.vinnot.wineroute.domain.model.WineRoute;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import com.vinnot.wineroute.infrastructure.persistence.entity.RouteStopJpaEntity;
import com.vinnot.wineroute.infrastructure.persistence.entity.WineRouteJpaEntity;
import com.vinnot.wineroute.infrastructure.persistence.jpa.RouteStopJpaRepository;
import com.vinnot.wineroute.infrastructure.persistence.jpa.WineRouteJpaRepository;
import com.vinnot.wineroute.infrastructure.persistence.mapper.WineRoutePersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Implementation of WineRouteRepositoryPort using JPA.
 */
@Component
@RequiredArgsConstructor
public class WineRoutePersistenceAdapter implements WineRouteRepositoryPort {

    private final WineRouteJpaRepository jpaRepository;
    private final RouteStopJpaRepository stopJpaRepository;
    private final EntityManager entityManager;

    @Override
    public Map<UUID, StopCounts> getStopCounts(List<UUID> routeIds) {
        if (routeIds.isEmpty()) {
            return Map.of();
        }
        return stopJpaRepository.countForRoutes(routeIds).stream().collect(Collectors.toMap(
                RouteStopJpaRepository.StopCountRow::getRouteId, row -> new StopCounts(row.getStops(), row.getWineries())));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<WineRoute> findById(UUID id) {
        return jpaRepository.findByIdWithStops(id).map(WineRoutePersistenceMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineRoute> findAll(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findAll(PageMapper.toPageable(pageQuery)).map(WineRoutePersistenceMapper::toDomainSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineRoute> findPublished(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findByStatus(WineRouteJpaEntity.StatusEnum.PUBLISHED, PageMapper.toPageable(pageQuery))
                        .map(WineRoutePersistenceMapper::toDomainSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineRoute> search(String searchTerm, String country, String region, RouteDifficulty difficulty,
            PageQuery pageQuery) {
        WineRouteJpaEntity.DifficultyEnum difficultyEnum = Objects.isNull(difficulty)
                ? null : WineRouteJpaEntity.DifficultyEnum.valueOf(difficulty.name());
        return PageMapper.toPageResult(
                jpaRepository.search(searchTerm, country, region, difficultyEnum, WineRouteJpaEntity.StatusEnum.PUBLISHED,
                                PageMapper.toPageable(pageQuery))
                        .map(WineRoutePersistenceMapper::toDomainSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<WineRoute> searchAll(String searchTerm, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.searchAll(searchTerm, PageMapper.toPageable(pageQuery))
                        .map(WineRoutePersistenceMapper::toDomainSummary));
    }

    @Override
    @Transactional(readOnly = true)
    public List<WineRoute> findByCreator(UUID creatorId) {
        return jpaRepository.findByCreatedBy(creatorId).stream()
                .map(WineRoutePersistenceMapper::toDomainSummary)
                .toList();
    }

    @Override
    @Transactional
    public WineRoute save(WineRoute route) {
        boolean exists = jpaRepository.existsById(route.getId());

        if (exists) {
            // For updates: delete old stops first (direct SQL), then detach managed entity
            stopJpaRepository.deleteByWineRouteId(route.getId());
            entityManager.flush();

            // Detach any managed entity to avoid cascade conflicts
            Optional<WineRouteJpaEntity> managedOpt = jpaRepository.findById(route.getId());
            managedOpt.ifPresent(entityManager::detach);
        }

        // Build a fresh entity from domain model
        WineRouteJpaEntity entity = WineRoutePersistenceMapper.toEntity(route);
        // Ensure stops list is mutable
        entity.setStops(new ArrayList<>(entity.getStops()));

        // Persist the route entity first without stops to avoid cascade issues
        List<RouteStopJpaEntity> stopsToSave = new ArrayList<>(entity.getStops());
        entity.getStops().clear();
        WineRouteJpaEntity saved = entityManager.merge(entity);
        entityManager.flush();

        // Now save stops individually
        for (RouteStopJpaEntity stop : stopsToSave) {
            stop.setWineRouteId(saved.getId());
            entityManager.persist(stop);
        }
        entityManager.flush();

        // Reload full entity with stops
        WineRouteJpaEntity reloaded = jpaRepository.findByIdWithStops(saved.getId()).orElse(saved);
        return WineRoutePersistenceMapper.toDomain(reloaded);
    }

    @Override
    public void delete(WineRoute route) {
        jpaRepository.deleteById(route.getId());
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public long countPublished() {
        return jpaRepository.countByStatus(WineRouteJpaEntity.StatusEnum.PUBLISHED);
    }

    @Override
    public List<String> findDistinctCountries() {
        return jpaRepository.findDistinctCountries();
    }

    @Override
    public List<String> findDistinctRegionsByCountry(String country) {
        return jpaRepository.findDistinctRegionsByCountry(country);
    }

    @Override
    public List<String> findDistinctSubregionsByCountryAndRegion(String country, String region) {
        return jpaRepository.findDistinctSubregionsByCountryAndRegion(country, region);
    }
}
