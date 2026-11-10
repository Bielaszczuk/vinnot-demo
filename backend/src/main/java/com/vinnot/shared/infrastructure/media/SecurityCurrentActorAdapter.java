package com.vinnot.shared.infrastructure.media;

import com.vinnot.shared.application.media.CurrentActorPort;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.security.AuthorizationUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityCurrentActorAdapter implements CurrentActorPort {
    @Override
    public ResourceReader current() { return AuthorizationUtils.resourceReader(SecurityContextHolder.getContext().getAuthentication()); }
}
