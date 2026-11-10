package com.vinnot.ai.infrastructure.persistence.repository;

import com.vinnot.ai.domain.model.WineComparison;
import com.vinnot.ai.domain.repository.WineComparisonRepository;
import com.vinnot.ai.domain.valueobject.CanonicalWinePair;
import com.vinnot.ai.infrastructure.persistence.entity.WineComparisonJpaEntity;
import com.vinnot.ai.infrastructure.persistence.mapper.WineComparisonMapper;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class WineComparisonRepositoryAdapter implements WineComparisonRepository {

    private final WineComparisonJpaRepository jpaRepository;
    private final EntityManager entityManager;
    private final WineComparisonMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Optional<WineComparison> findByWineIdsAndLanguage(UUID wineAId, UUID wineBId, String language) {
        CanonicalWinePair pair = CanonicalWinePair.of(wineAId, wineBId);

        return jpaRepository.findByWineIdsAndLanguage(
                        pair.wineAId(), pair.wineBId(), language)
                .map(mapper::toDomain);
    }

    @Override
    @Transactional
    public WineComparison save(WineComparison comparison) {
        WineComparisonJpaEntity entity = upsert(comparison);
        entityManager.flush();
        return mapper.toDomain(entity);
    }

    @Override
    @Transactional
    public List<WineComparison> saveBundle(List<WineComparison> comparisons) {
        List<WineComparisonJpaEntity> entities = new ArrayList<>();
        comparisons.forEach(comparison -> entities.add(upsert(comparison)));
        entityManager.flush();
        return entities.stream().map(mapper::toDomain).toList();
    }

    private WineComparisonJpaEntity upsert(WineComparison comparison) {
        var existing = jpaRepository.findByWineIdsAndLanguage(
                comparison.getWineAId(), comparison.getWineBId(), comparison.getLanguage());

        WineComparisonJpaEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setComparisonJson(comparison.getComparisonJson());
            entity.setUpdatedAt(Instant.now());
        } else {
            entity = mapper.toEntity(comparison);
            entityManager.persist(entity);
        }

        return entity;
    }

    @Override
    @Transactional
    public void deleteByWineIdsAndLanguage(UUID wineAId, UUID wineBId, String language) {
        CanonicalWinePair pair = CanonicalWinePair.of(wineAId, wineBId);

        jpaRepository.deleteByWineIdsAndLanguage(
                pair.wineAId(), pair.wineBId(), language);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByWineIdsAndLanguage(UUID wineAId, UUID wineBId, String language) {
        CanonicalWinePair pair = CanonicalWinePair.of(wineAId, wineBId);

        return jpaRepository.existsByWineIdsAndLanguage(
                pair.wineAId(), pair.wineBId(), language);
    }
}
