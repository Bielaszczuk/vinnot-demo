package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.model.AppVersionSettings;
import com.vinnot.admin.domain.model.AppPlatform;

import java.util.UUID;

/** Administrators manage the minimum supported mobile app version per platform (#428). */
public interface ManageAppVersionsUseCase {

    AppVersionSettings settings();

    /**
     * Sets the minimum of one platform and audits the change; {@code null} clears it. An invalid version is refused with
     * {@code INVALID_APP_VERSION}.
     */
    AppVersionSettings setMinimumVersion(AppPlatform platform, String minimumVersion, UUID actorId);
}
