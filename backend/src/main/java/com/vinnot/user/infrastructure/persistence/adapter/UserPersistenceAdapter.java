package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.infrastructure.persistence.entity.RoleJpaEntity;
import com.vinnot.user.infrastructure.persistence.entity.UserJpaEntity;
import com.vinnot.user.infrastructure.persistence.jpa.RoleJpaRepository;
import com.vinnot.user.infrastructure.persistence.jpa.UserJpaRepository;
import com.vinnot.user.infrastructure.persistence.mapper.UserPersistenceMapper;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.shared.infrastructure.persistence.PageMapper;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class UserPersistenceAdapter implements UserRepositoryPort {

    private final UserJpaRepository jpaRepository;
    private final RoleJpaRepository roleJpaRepository;
    private final AccountDeletionIntegrity deletionIntegrity;

    @Override
    public Optional<User> findById(UUID id) {
        return jpaRepository.findById(id).map(UserPersistenceMapper::toDomain);
    }

    @Override
    public Optional<User> findByEmail(Email email) {
        return jpaRepository.findByEmail(email.getValue()).map(UserPersistenceMapper::toDomain);
    }

    @Override
    public Optional<User> findByEmailOrUsername(String identifier) {
        return jpaRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase(identifier, identifier)
                .map(UserPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByEmail(Email email) {
        return jpaRepository.existsByEmail(email.getValue());
    }

    @Override
    public boolean existsByUsername(String username) {
        return jpaRepository.existsByUsernameIgnoreCase(username);
    }

    @Override
    public User save(User user) {
        UserJpaEntity entity = UserPersistenceMapper.toEntity(user);
        // Resolve roles from DB by name to avoid detached entity issues
        if (Objects.nonNull(user.getRoles()) && !user.getRoles().isEmpty()) {
            Set<String> roleNames = user.getRoles().stream()
                    .map(r -> "ROLE_" + r.name())
                    .collect(Collectors.toSet());
            List<RoleJpaEntity> resolvedRoles = roleJpaRepository.findAll().stream()
                    .filter(r -> roleNames.contains(r.getName()))
                    .collect(Collectors.toList());
            entity.setRoles(new HashSet<>(resolvedRoles));
        }
        UserJpaEntity saved = jpaRepository.saveAndFlush(entity);
        return UserPersistenceMapper.toDomain(saved);
    }

    @Override
    @Transactional
    public void delete(User user) {
        deleteById(user.getId());
    }

    @Override
    public List<User> findAllByIds(Collection<UUID> ids) {
        return jpaRepository.findAllById(ids).stream()
                .map(UserPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Map<UUID, String> findUsernamesByIds(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return jpaRepository.findUsernamesByIds(ids).stream().collect(Collectors.toMap(
                UserJpaRepository.UsernameProjection::getId,
                UserJpaRepository.UsernameProjection::getUsername));
    }

    @Override
    public PageResult<User> findAll(PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.findAll(PageMapper.toPageable(pageQuery))
                        .map(UserPersistenceMapper::toDomain));
    }

    @Override
    public PageResult<User> searchByKeyword(String keyword, PageQuery pageQuery) {
        return PageMapper.toPageResult(
                jpaRepository.searchByKeyword(keyword, PageMapper.toPageable(pageQuery))
                        .map(UserPersistenceMapper::toDomain));
    }

    @Override
    public boolean existsById(UUID id) {
        return jpaRepository.existsById(id);
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        deletionIntegrity.delete(id, () -> {
            jpaRepository.deleteById(id);
            jpaRepository.flush();
        });
    }

    @Override
    public List<UUID> lockActiveAdministratorIds() {
        roleJpaRepository.lockAdministratorRole().orElseThrow(() -> new IllegalStateException("Administrator role is missing"));
        return jpaRepository.lockActiveAdministratorIds();
    }

    @Override
    public long count() {
        return jpaRepository.count();
    }

    @Override
    public long countByActiveTrue() {
        return jpaRepository.countByActiveTrue();
    }
}
