package com.vinnot.shared.infrastructure.storage;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class R2OperationBudgetTest {
    @Test
    void readOnlyStopsPutsWhileKeepingReadsAndCleanupAvailable() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var budget = new R2OperationBudget(jdbc, 100, 10, 100, false);
        assertThatThrownBy(() -> budget.reserveWrite(1)).isInstanceOf(ExternalServiceUnavailableException.class);
        verifyNoInteractions(jdbc);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        budget.reserveRead();
        verify(jdbc).update(anyString(), any(Object[].class));
    }
    @Test
    void invalidAllocationsAndDatabaseFailuresFailClosed() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        assertThatThrownBy(() -> new R2OperationBudget(jdbc, 0, 1, 1, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new R2OperationBudget(jdbc, 100, 100_000, 1, true)).isInstanceOf(IllegalArgumentException.class);
        var budget = new R2OperationBudget(jdbc, 100, 10, 100, true);
        assertThatThrownBy(() -> budget.reserveRead()).isInstanceOf(ExternalServiceUnavailableException.class);
        assertThatThrownBy(() -> budget.reserveWrite(1)).isInstanceOf(ExternalServiceUnavailableException.class);
    }
}
