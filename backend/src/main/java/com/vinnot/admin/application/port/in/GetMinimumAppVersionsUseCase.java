package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.model.MinimumAppVersions;

/** The public update policy the mobile app reads on launch and on returning to the foreground (#428). */
public interface GetMinimumAppVersionsUseCase {

    MinimumAppVersions minimumVersions();
}
