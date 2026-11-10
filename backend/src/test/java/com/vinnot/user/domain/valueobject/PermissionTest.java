package com.vinnot.user.domain.valueobject;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class PermissionTest {

    @Test
    void normalizesPermissionCodesAndUsesValueEquality() {
        Permission permission = Permission.of("wine_create");

        assertThat(permission.getCode()).isEqualTo("WINE_CREATE");
        assertThat(permission.toAuthority()).isEqualTo("WINE_CREATE");
        assertThat(permission).isEqualTo(Permission.of("WINE_CREATE"));
    }

    @Test
    void rejectsMissingPermissionCodes() {
        assertThatIllegalArgumentException().isThrownBy(() -> Permission.of(" "));
        assertThatIllegalArgumentException().isThrownBy(() -> Permission.of(null));
    }
}
