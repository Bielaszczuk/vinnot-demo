package com.vinnot.user.infrastructure.persistence.jpa;

import com.vinnot.user.domain.valueobject.SocialProvider;
import com.vinnot.user.infrastructure.persistence.entity.SocialIdentityJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface SocialIdentityJpaRepository extends JpaRepository<SocialIdentityJpaEntity, UUID> {
    Optional<SocialIdentityJpaEntity> findByProviderAndProviderSubject(
            SocialProvider provider, String providerSubject);

    boolean existsByUserId(UUID userId);

    List<SocialIdentityJpaEntity> findAllByUserId(UUID userId);
}
