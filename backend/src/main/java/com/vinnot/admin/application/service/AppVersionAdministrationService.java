package com.vinnot.admin.application.service;

import com.vinnot.admin.application.model.AppVersionSettings;
import com.vinnot.admin.application.port.in.ManageAppVersionsUseCase;
import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import com.vinnot.admin.application.port.out.UserQueryPort;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

/**
 * The minimum supported mobile app version per platform (#428). Values are stored and audited by
 * {@link AppMinimumVersionPort}; the mobile app reads them through {@link MinimumAppVersionsService}.
 */
@Service
public class AppVersionAdministrationService implements ManageAppVersionsUseCase {
    static final int RECENT_CHANGES = 20;
    private final AppMinimumVersionPort versions;
    private final UserQueryPort users;
    private final Clock clock;

    @Autowired
    public AppVersionAdministrationService(AppMinimumVersionPort versions, UserQueryPort users) {
        this(versions, users, Clock.systemUTC());
    }

    AppVersionAdministrationService(AppMinimumVersionPort versions, UserQueryPort users, Clock clock) {
        this.versions = versions;
        this.users = users;
        this.clock = clock;
    }

    @Override
    public AppVersionSettings settings() {
        Map<AppPlatform, AppMinimumVersionPort.Setting> stored = versions.settings();
        var platforms = Arrays.stream(AppPlatform.values())
                .map(platform -> stored.getOrDefault(platform, new AppMinimumVersionPort.Setting(platform, null, null, null)))
                .toList();
        return new AppVersionSettings(platforms, versions.recentChanges(RECENT_CHANGES));
    }

    @Override
    @Transactional
    public AppVersionSettings setMinimumVersion(AppPlatform platform, String minimumVersion, UUID actorId) {
        AppVersion version = AppVersion.parseOptional(minimumVersion).orElse(null);
        String email = users.findById(actorId).map(UserQueryPort.UserAdminData::email)
                .orElseThrow(() -> new DomainException("ADMIN_NOT_FOUND", "The administrator account was not found"));
        versions.change(platform, version, new AppMinimumVersionPort.Actor(actorId, email), clock.instant());
        return settings();
    }
}
