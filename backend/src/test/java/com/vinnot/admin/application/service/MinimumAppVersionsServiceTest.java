package com.vinnot.admin.application.service;

import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MinimumAppVersionsServiceTest {
    private final AppMinimumVersionPort versions = mock(AppMinimumVersionPort.class);
    private final MinimumAppVersionsService service = new MinimumAppVersionsService(versions);

    @Test
    void readsTheStoredMinimumsOnEveryRequestAndAnAbsentPlatformHasNone() {
        when(versions.minimumVersions()).thenReturn(Map.of(AppPlatform.IOS, new AppVersion(0, 3, 0)));
        var policy = service.minimumVersions();
        assertThat(policy.of(AppPlatform.IOS)).contains(new AppVersion(0, 3, 0));
        assertThat(policy.of(AppPlatform.ANDROID)).isEmpty();

        when(versions.minimumVersions()).thenReturn(Map.of());
        assertThat(service.minimumVersions().of(AppPlatform.IOS)).as("a change applies without a deploy").isEmpty();
    }
}
