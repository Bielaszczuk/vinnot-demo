package com.vinnot.ai.infrastructure.persistence.repository;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.infrastructure.persistence.entity.WineAiProfileJpaEntity;
import com.vinnot.ai.infrastructure.persistence.mapper.WineAiProfileMapper;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class WineAiProfileRepositoryAdapter implements WineAiProfileRepository {

    private final WineAiProfileJpaRepository jpaRepository;
    private final EntityManager entityManager;
    private final WineAiProfileMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Optional<WineAiProfile> findByWineIdAndLanguage(UUID wineId, String language) {
        return jpaRepository.findByWineIdAndLanguage(wineId, language)
                .map(mapper::toDomain);
    }

    @Override
    @Transactional
    public WineAiProfile save(WineAiProfile profile) {
        WineAiProfileJpaEntity entity = upsert(profile);
        entityManager.flush();
        return mapper.toDomain(entity);
    }

    @Override
    @Transactional
    public List<WineAiProfile> saveBundle(List<WineAiProfile> profiles) {
        List<WineAiProfileJpaEntity> entities = new ArrayList<>();
        profiles.forEach(profile -> entities.add(upsert(profile)));
        entityManager.flush();
        return entities.stream().map(mapper::toDomain).toList();
    }

    private WineAiProfileJpaEntity upsert(WineAiProfile profile) {
        var existing = jpaRepository.findByWineIdAndLanguage(
                profile.getWineId(), profile.getLanguage());

        WineAiProfileJpaEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setProfileJson(profile.getProfileJson());
            entity.setUpdatedAt(Instant.now());
        } else {
            entity = mapper.toEntity(profile);
            entityManager.persist(entity);
        }

        return entity;
    }

    @Override
    @Transactional
    public void deleteByWineIdAndLanguage(UUID wineId, String language) {
        jpaRepository.deleteByWineIdAndLanguage(wineId, language);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByWineIdAndLanguage(UUID wineId, String language) {
        return jpaRepository.existsByWineIdAndLanguage(wineId, language);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findWineIdsAfter(UUID afterWineId, int limit) {
        PageRequest page = PageRequest.of(0, limit);
        return Objects.isNull(afterWineId)
                ? jpaRepository.findProfiledWineIds(page)
                : jpaRepository.findProfiledWineIdsAfter(afterWineId, page);
    }
}
