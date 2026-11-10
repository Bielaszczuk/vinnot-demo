package com.vinnot.engagement.infrastructure.notification;

import com.vinnot.engagement.application.model.Admission;
import com.vinnot.engagement.application.port.in.AdmitEngagementUseCase;
import com.vinnot.notification.application.port.out.EngagementBudgetPort;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** S10: delivery asks the engagement module to admit and release, translating between the two modules' models. */
class EngagementBudgetAdapterTest {
    private final AdmitEngagementUseCase admissions = mock(AdmitEngagementUseCase.class);
    private final EngagementBudgetAdapter adapter = new EngagementBudgetAdapter(admissions);

    @Test
    void admitsThroughTheEngagementModuleAndReturnsItsCounts() {
        UUID ana = UUID.randomUUID();
        UUID bruno = UUID.randomUUID();
        ZoneId zone = ZoneId.of("America/Argentina/Buenos_Aires");
        Instant at = Instant.parse("2026-10-21T22:30:00Z");
        when(admissions.admit(new Admission.Request(NotificationType.TASTE_PICK, "engagement:k", "WINE:w",
                List.of(new Admission.Account(ana, zone), new Admission.Account(bruno, zone)), at)))
                .thenReturn(new Admission.Result(List.of(ana), 1, 0, 0));

        EngagementBudgetPort.Admission admission = adapter.admit(new EngagementBudgetPort.Push(NotificationType.TASTE_PICK,
                "engagement:k", "WINE:w"), List.of(new EngagementBudgetPort.Recipient(ana, zone),
                new EngagementBudgetPort.Recipient(bruno, zone)), at);

        assertThat(admission).isEqualTo(new EngagementBudgetPort.Admission(List.of(ana), 1, 0, 0));
    }

    @Test
    void releasesTheRowsOfAPushThatWasNotSent() {
        UUID ana = UUID.randomUUID();

        adapter.release("engagement:k", List.of(ana));

        verify(admissions).release("engagement:k", List.of(ana));
    }
}
