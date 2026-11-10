package com.vinnot.shared.infrastructure.storage;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class R2OperationBudgetSocialMediaTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test
    void socialWritesReserveTheirOwnMonthlyBytesAndTheSharedWriteCount() {
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        var budget = new R2OperationBudget(jdbc, 100, 10, 100, true, 5_000);

        budget.reserveSocialWrite(1_234);

        var arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc, times(2)).update(anyString(), arguments.capture());
        Object[] bytes = arguments.getAllValues().get(0);
        Object[] writes = arguments.getAllValues().get(1);
        assertThat(bytes[0]).isEqualTo("r2-social-bytes");
        assertThat((String) bytes[1]).matches("\\d{4}-\\d{2}");
        assertThat(bytes[3]).isEqualTo(1_234L);
        assertThat(bytes[7]).isEqualTo(5_000L);
        assertThat(writes[0]).isEqualTo("r2-write");
        assertThat(writes[2]).isEqualTo(1L);
        assertThat(writes[5]).isEqualTo(10L);
    }

    @Test
    void anExhaustedSocialAllowanceFailsClosed() {
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(0);
        var budget = new R2OperationBudget(jdbc, 100, 10, 100, true, 5_000);

        assertThatThrownBy(() -> budget.reserveSocialWrite(10_000))
                .isInstanceOf(ExternalServiceUnavailableException.class);
    }

    @Test
    void readOnlyModeStopsSocialWritesBeforeTheDatabase() {
        var budget = new R2OperationBudget(jdbc, 100, 10, 100, false, 5_000);

        assertThatThrownBy(() -> budget.reserveSocialWrite(1))
                .isInstanceOf(ExternalServiceUnavailableException.class);
        verifyNoInteractions(jdbc);
    }

    @Test
    void socialAllowancesOutsideConservativeLimitsAreRejected() {
        assertThatThrownBy(() -> new R2OperationBudget(jdbc, 100, 10, 100, true, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new R2OperationBudget(jdbc, 100, 10, 100, true, 4L * 1_073_741_824L + 1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
