package com.vinnot.payment.domain.valueobject;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommissionPolicyTest {
    @Test
    void defaultKeepsTheOriginalThreePercentPolicy() {
        assertThat(CommissionPolicy.DEFAULT.basisPoints()).isEqualTo(300);
        assertThat(CommissionPolicy.DEFAULT.id()).isEqualTo("VINNOT_3_PERCENT_V1");
        assertThat(CommissionPolicy.DEFAULT.percent()).isEqualByComparingTo("3");
    }

    @Test
    void acceptsWholeAndFractionalPercentPoliciesWhoseNameMatchesTheRate() {
        assertThat(new CommissionPolicy(800, "VINNOT_8_PERCENT_V1").percent()).isEqualByComparingTo("8");
        assertThat(new CommissionPolicy(1200, "VINNOT_12_PERCENT_V2").percent()).isEqualByComparingTo("12");
        assertThat(new CommissionPolicy(250, "VINNOT_2_5_PERCENT_V1").percent()).isEqualByComparingTo(new BigDecimal("2.5"));
        assertThat(new CommissionPolicy(3000, "VINNOT_30_PERCENT_V1").basisPoints()).isEqualTo(3000);
        assertThat(new CommissionPolicy(1, "VINNOT_0_01_PERCENT_V1").percent()).isEqualByComparingTo("0.01");
    }

    @Test
    void rejectsBasisPointsOutsideOneToThreeThousand() {
        for (int basisPoints : new int[]{0, -300, 3001}) {
            assertThatThrownBy(() -> new CommissionPolicy(basisPoints, "VINNOT_3_PERCENT_V1"))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("basis points");
        }
    }

    @Test
    void rejectsBlankOrMalformedPolicyIds() {
        for (String id : new String[]{null, "", "  ", "VINNOT_3_PERCENT", "vinnot_3_percent_v1", "VINNOT_3_PERCENT_V1 ",
                "VINNOT__PERCENT_V1", "VINNOT_3_5_7_PERCENT_V1", "OTHER_3_PERCENT_V1"}) {
            assertThatThrownBy(() -> new CommissionPolicy(300, id))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("policy");
        }
    }

    @Test
    void rejectsAPolicyWhoseNameDisagreesWithItsBasisPoints() {
        assertThatThrownBy(() -> new CommissionPolicy(800, "VINNOT_3_PERCENT_V1"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("does not match");
        assertThatThrownBy(() -> new CommissionPolicy(250, "VINNOT_2_55_PERCENT_V1"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("does not match");
    }
}
