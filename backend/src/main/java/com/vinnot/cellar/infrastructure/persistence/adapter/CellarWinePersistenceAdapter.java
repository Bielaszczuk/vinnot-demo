package com.vinnot.cellar.infrastructure.persistence.adapter;

import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.cellar.domain.model.CellarWine;
import com.vinnot.cellar.infrastructure.persistence.entity.CellarWineJpaEntity;
import com.vinnot.cellar.infrastructure.persistence.jpa.CellarWineJpaRepository;
import com.vinnot.cellar.infrastructure.persistence.mapper.CellarWinePersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CellarWinePersistenceAdapter implements CellarWineRepositoryPort {

    private final CellarWineJpaRepository jpaRepository;
    private final CellarWinePersistenceMapper mapper;

    @Override
    public Optional<CellarWine> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<CellarWine> findByUserIdAndWineId(UUID userId, UUID wineId) {
        return jpaRepository.findByUserIdAndWineId(userId, wineId).map(mapper::toDomain);
    }

    @Override
    public PageResult<CellarWine> findByUserId(UUID userId, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findByUserId(userId, PageMapper.toPageable(pageQuery))
                        .map(mapper::toDomain));
    }

    @Override
    public List<CellarWine> findAllByUserId(UUID userId) {
        return jpaRepository.findAllByUserId(userId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public CellarWine save(CellarWine cellarWine) {
        CellarWineJpaEntity entity = mapper.toEntity(cellarWine);
        CellarWineJpaEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public void delete(CellarWine cellarWine) {
        jpaRepository.deleteById(cellarWine.getId());
    }

    @Override
    public boolean existsByUserIdAndWineId(UUID userId, UUID wineId) {
        return jpaRepository.existsByUserIdAndWineId(userId, wineId);
    }

    @Override
    public long countByUserId(UUID userId) {
        return jpaRepository.findAllByUserId(userId).size();
    }
}

