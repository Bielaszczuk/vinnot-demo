package com.vinnot.user.application.port.out;

import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.valueobject.SocialProvider;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface SocialIdentityRepositoryPort {
    Optional<SocialIdentity> findByProviderAndSubject(SocialProvider provider, String subject);

    boolean existsByUserId(UUID userId);

    List<SocialIdentity> findByUserId(UUID userId);

    SocialIdentity save(SocialIdentity identity);
}
