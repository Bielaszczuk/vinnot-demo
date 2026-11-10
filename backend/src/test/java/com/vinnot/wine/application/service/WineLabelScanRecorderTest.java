package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S2: every scan of a member is recorded; only an exact match earns the scan point for that wine. */
class WineLabelScanRecorderTest {
    private final WineLabelScanHistoryPort history = mock(WineLabelScanHistoryPort.class);
    private final WineContributionPointsPort points = mock(WineContributionPointsPort.class);
    private final WineLabelScanRecorder recorder = new WineLabelScanRecorder(history, points);
    private final UUID member = UUID.randomUUID();

    @Test
    void anExactMatchIsRecordedWithItsWineAndEarnsThePoint() {
        UUID wine = UUID.randomUUID();
        WineSummaryResponse summary = mock(WineSummaryResponse.class);
        when(summary.id()).thenReturn(wine);

        recorder.record(member, new WineLabelScanResponse(WineLabelScanResponse.Outcome.EXACT_MATCH, 0.98, summary,
                List.of(), List.of(), null));

        verify(history).record(eq(member), eq(WineLabelScanResponse.Outcome.EXACT_MATCH), eq(wine), any());
        verify(points).labelMatched(member, wine);
    }

    @Test
    void otherOutcomesAreRecordedWithoutAWineOrPoints() {
        recorder.record(member, new WineLabelScanResponse(WineLabelScanResponse.Outcome.POSSIBLE_MATCHES, 0.5, null,
                List.of(), List.of(), null));
        recorder.record(member, new WineLabelScanResponse(WineLabelScanResponse.Outcome.EXACT_MATCH, 0.9, null,
                List.of(), List.of(), null));

        verify(history).record(eq(member), eq(WineLabelScanResponse.Outcome.POSSIBLE_MATCHES), isNull(), any());
        verify(history).record(eq(member), eq(WineLabelScanResponse.Outcome.EXACT_MATCH), isNull(), any());
        verifyNoInteractions(points);
    }
}
