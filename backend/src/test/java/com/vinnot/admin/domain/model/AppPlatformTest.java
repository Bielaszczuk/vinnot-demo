package com.vinnot.admin.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppPlatformTest {

    @Test
    void iosComesBeforeAndroid() {
        assertThat(AppPlatform.values()).containsExactly(AppPlatform.IOS, AppPlatform.ANDROID);
    }

    @Test
    void onlyExactPlatformNamesAreAccepted() {
        assertThat(AppPlatform.named("IOS")).isEqualTo(AppPlatform.IOS);
        assertThat(AppPlatform.named("ANDROID")).isEqualTo(AppPlatform.ANDROID);
        for (String name : new String[]{"ios", "WEB", "", null}) {
            assertThatThrownBy(() -> AppPlatform.named(name))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "NOT_AN_APP_PLATFORM");
        }
    }
}
