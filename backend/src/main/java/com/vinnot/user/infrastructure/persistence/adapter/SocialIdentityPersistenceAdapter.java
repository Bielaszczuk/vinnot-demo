package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.infrastructure.persistence.entity.SocialIdentityJpaEntity;
import com.vinnot.user.infrastructure.persistence.jpa.SocialIdentityJpaRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SocialIdentityPersistenceAdapter implements SocialIdentityRepositoryPort {

    private final SocialIdentityJpaRepository repository;

    @Override
    public Optional<SocialIdentity> findByProviderAndSubject(
            SocialProvider provider, String subject) {
        return repository.findByProviderAndProviderSubject(provider, subject)
                .map(this::toDomain);
    }

    @Override
    public boolean existsByUserId(UUID userId) {
        return repository.existsByUserId(userId);
    }

    @Override
    public List<SocialIdentity> findByUserId(UUID userId) {
        return repository.findAllByUserId(userId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public SocialIdentity save(SocialIdentity identity) {
        SocialIdentityJpaEntity entity = new SocialIdentityJpaEntity();
        entity.setId(identity.id());
        entity.setUserId(identity.userId());
        entity.setProvider(identity.provider());
        entity.setProviderSubject(identity.providerSubject());
        entity.setProviderEmail(identity.providerEmail());
        entity.setCreatedAt(identity.createdAt());
        entity.setUpdatedAt(identity.updatedAt());
        return toDomain(repository.save(entity));
    }

    private SocialIdentity toDomain(SocialIdentityJpaEntity entity) {
        return new SocialIdentity(
                entity.getId(), entity.getUserId(), entity.getProvider(),
                entity.getProviderSubject(), entity.getProviderEmail(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
