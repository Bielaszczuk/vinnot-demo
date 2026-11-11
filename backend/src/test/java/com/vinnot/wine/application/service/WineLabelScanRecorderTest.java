package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineBarcodeConfirmationPort;
import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort.RecordedScan;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * S2 (#455): every scan of a member is recorded; only an exact match earns the scan point for that wine.
 * S12 (#544): the stored scan's id is returned for feedback, with the barcode read; feedback with a wine on a barcode
 * scan records the member's barcode confirmation.
 */
class WineLabelScanRecorderTest {
    private static final String BARCODE = "7791234567890";

    private final WineLabelScanHistoryPort history = mock(WineLabelScanHistoryPort.class);
    private final WineContributionPointsPort points = mock(WineContributionPointsPort.class);
    private final WineBarcodeConfirmationPort barcodes = mock(WineBarcodeConfirmationPort.class);
    private final WineLabelScanRecorder recorder = new WineLabelScanRecorder(history, points, barcodes);
    private final UUID member = UUID.randomUUID();

    @Test
    void anExactMatchIsRecordedWithItsWineAndEarnsThePoint() {
        UUID wine = UUID.randomUUID();
        WineSummaryResponse summary = mock(WineSummaryResponse.class);
        when(summary.id()).thenReturn(wine);

        recorder.record(member, new WineLabelScanResponse(WineLabelScanResponse.Outcome.EXACT_MATCH, 0.98, summary,
                List.of(), List.of(), null));

        verify(history).record(any(), eq(member), eq(WineLabelScanResponse.Outcome.EXACT_MATCH), eq(wine), isNull(),
                any());
        verify(points).labelMatched(member, wine);
    }

    @Test
    void otherOutcomesAreRecordedWithoutAWineOrPoints() {
        recorder.record(member, new WineLabelScanResponse(WineLabelScanResponse.Outcome.POSSIBLE_MATCHES, 0.5, null,
                List.of(), List.of(), null));
        recorder.record(member, new WineLabelScanResponse(WineLabelScanResponse.Outcome.EXACT_MATCH, 0.9, null,
                List.of(), List.of(), null));

        verify(history).record(any(), eq(member), eq(WineLabelScanResponse.Outcome.POSSIBLE_MATCHES), isNull(),
                isNull(), any());
        verify(history).record(any(), eq(member), eq(WineLabelScanResponse.Outcome.EXACT_MATCH), isNull(), isNull(),
                any());
        verifyNoInteractions(points);
    }

    @Test
    void theStoredScanIdIsReturnedWithTheBarcodeItRead() {
        when(history.record(any(), any(), any(), any(), any(), any())).thenReturn(true);

        UUID scanId = recorder.record(member, noMatch(), BARCODE);

        ArgumentCaptor<UUID> stored = ArgumentCaptor.forClass(UUID.class);
        verify(history).record(stored.capture(), eq(member), eq(WineLabelScanResponse.Outcome.NO_MATCH), isNull(),
                eq(BARCODE), any());
        assertThat(scanId).isNotNull().isEqualTo(stored.getValue());
    }

    @Test
    void aScanThatWasNotStoredHasNoId() {
        when(history.record(any(), any(), any(), any(), any(), any())).thenReturn(false);

        assertThat(recorder.record(member, noMatch(), BARCODE)).isNull();
    }

    @Test
    void onlyAConfirmedMatchOnABarcodeScanConfirmsTheBarcode() {
        UUID matched = UUID.randomUUID();
        RecordedScan exact = new RecordedScan(UUID.randomUUID(), WineLabelScanResponse.Outcome.EXACT_MATCH, matched,
                BARCODE);
        RecordedScan missed = new RecordedScan(UUID.randomUUID(), WineLabelScanResponse.Outcome.NO_MATCH, null, BARCODE);
        UUID chosen = UUID.randomUUID();

        recorder.recordFeedback(exact, member, WineLabelScanVerdict.CONFIRMED, matched);
        recorder.recordFeedback(missed, member, WineLabelScanVerdict.CORRECTED, chosen);

        verify(history).saveFeedback(eq(missed.id()), eq(WineLabelScanVerdict.CORRECTED), eq(chosen), any());
        verify(barcodes).confirm(eq(BARCODE), eq(member), eq(matched), any());
        verify(barcodes, never()).confirm(any(), any(), eq(chosen), any());
    }

    @Test
    void aBarcodeAnswerIsStoredWithoutItsBarcodeAndEarnsNoPoint() {
        UUID wine = UUID.randomUUID();
        WineSummaryResponse summary = mock(WineSummaryResponse.class);
        when(summary.id()).thenReturn(wine);
        when(history.record(any(), any(), any(), any(), any(), any())).thenReturn(true);

        UUID scanId = recorder.recordBarcodeAnswer(member, new WineLabelScanResponse(
                WineLabelScanResponse.Outcome.EXACT_MATCH, 1.0, summary, List.of(), List.of(), null));

        assertThat(scanId).isNotNull();
        verify(history).record(eq(scanId), eq(member), eq(WineLabelScanResponse.Outcome.EXACT_MATCH), eq(wine),
                isNull(), any());
        verifyNoInteractions(points);
    }

    @Test
    void feedbackWithoutABarcodeOrWithoutAWineConfirmsNoBarcode() {
        RecordedScan withoutBarcode = new RecordedScan(
                UUID.randomUUID(), WineLabelScanResponse.Outcome.POSSIBLE_MATCHES, null, null);
        RecordedScan withBarcode = new RecordedScan(
                UUID.randomUUID(), WineLabelScanResponse.Outcome.NO_MATCH, null, BARCODE);

        recorder.recordFeedback(withoutBarcode, member, WineLabelScanVerdict.CONFIRMED, UUID.randomUUID());
        recorder.recordFeedback(withBarcode, member, WineLabelScanVerdict.NOT_IN_CATALOG, null);

        verify(history).saveFeedback(eq(withoutBarcode.id()), eq(WineLabelScanVerdict.CONFIRMED), any(), any());
        verify(history).saveFeedback(eq(withBarcode.id()), eq(WineLabelScanVerdict.NOT_IN_CATALOG), isNull(), any());
        verify(barcodes, never()).confirm(anyString(), any(), any(), any());
    }

    private WineLabelScanResponse noMatch() {
        return new WineLabelScanResponse(WineLabelScanResponse.Outcome.NO_MATCH, 0.0, null, List.of(), List.of(), null);
    }
}
