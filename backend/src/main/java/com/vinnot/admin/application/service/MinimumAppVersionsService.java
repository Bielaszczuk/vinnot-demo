package com.vinnot.admin.application.service;

import com.vinnot.admin.application.model.MinimumAppVersions;
import com.vinnot.admin.application.port.in.GetMinimumAppVersionsUseCase;
import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import org.springframework.stereotype.Service;

/** The public update policy (#428), read from storage on every request so a change applies without a deploy. */
@Service
public class MinimumAppVersionsService implements GetMinimumAppVersionsUseCase {
    private final AppMinimumVersionPort versions;

    public MinimumAppVersionsService(AppMinimumVersionPort versions) {
        this.versions = versions;
    }

    @Override
    public MinimumAppVersions minimumVersions() {
        return new MinimumAppVersions(versions.minimumVersions());
    }
}
