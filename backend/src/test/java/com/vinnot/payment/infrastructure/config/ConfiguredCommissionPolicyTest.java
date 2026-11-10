package com.vinnot.payment.infrastructure.config;

import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConfiguredCommissionPolicyTest {
    @Test
    void exposesTheConfiguredPolicy() {
        assertThat(new ConfiguredCommissionPolicy(800, "VINNOT_8_PERCENT_V1").current())
                .isEqualTo(new CommissionPolicy(800, "VINNOT_8_PERCENT_V1"));
    }

    @Test
    void refusesToStartWithSettingsThatDisagreeOrAreOutOfRange() {
        for (var invalid : new Object[][]{{800, "VINNOT_3_PERCENT_V1"}, {0, "VINNOT_0_PERCENT_V1"}, {3500, "VINNOT_35_PERCENT_V1"},
                {300, ""}, {300, "THREE_PERCENT"}}) {
            assertThatThrownBy(() -> new ConfiguredCommissionPolicy((int) invalid[0], (String) invalid[1]))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("app.payments.commission")
                    .hasCauseInstanceOf(IllegalArgumentException.class);
        }
    }
}
