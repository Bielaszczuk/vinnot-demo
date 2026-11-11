package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.command.exception.WineLabelScanFeedbackNotFoundException;
import com.vinnot.wine.application.command.model.SubmitWineLabelScanFeedbackCommand;
import com.vinnot.wine.application.port.out.CatalogQualitySignalPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort.RecordedScan;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse.Outcome;
import com.vinnot.wine.application.service.WineLabelScanRecorder;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S12: a member's verdict on their own scan, the 404 rules, and the catalog signal on a corrected exact match. */
class SubmitWineLabelScanFeedbackCommandHandlerTest {
    private final WineLabelScanHistoryPort history = mock(WineLabelScanHistoryPort.class);
    private final WineRepositoryPort wines = mock(WineRepositoryPort.class);
    private final WineLabelScanRecorder recorder = mock(WineLabelScanRecorder.class);
    private final CatalogQualitySignalPort signals = mock(CatalogQualitySignalPort.class);
    private final SubmitWineLabelScanFeedbackCommandHandler handler =
            new SubmitWineLabelScanFeedbackCommandHandler(history, wines, recorder, signals);
    private final UUID member = UUID.randomUUID();
    private final UUID scanId = UUID.randomUUID();

    @Test
    void confirmedFeedbackOnTheMembersScanIsRecordedWithTheChosenWine() {
        Wine wine = activeWine();
        RecordedScan scan = scan(Outcome.EXACT_MATCH, wine.getId());

        handler.execute(command(WineLabelScanVerdict.CONFIRMED, wine.getId()));

        verify(recorder).recordFeedback(scan, member, WineLabelScanVerdict.CONFIRMED, wine.getId());
        verifyNoInteractions(signals);
    }

    @Test
    void notInCatalogFeedbackNamesNoWineAndLooksNoneUp() {
        RecordedScan scan = scan(Outcome.NO_MATCH, null);

        handler.execute(command(WineLabelScanVerdict.NOT_IN_CATALOG, null));

        verify(recorder).recordFeedback(scan, member, WineLabelScanVerdict.NOT_IN_CATALOG, null);
        verifyNoInteractions(wines, signals);
    }

    @Test
    void anUnknownScanOrAnotherMembersScanIsNotFound() {
        when(history.findOwnedBy(scanId, member)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.execute(command(WineLabelScanVerdict.NOT_IN_CATALOG, null)))
                .isInstanceOf(WineLabelScanFeedbackNotFoundException.class)
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("SCAN_NOT_FOUND");
        verifyNoInteractions(recorder, signals);
    }

    @Test
    void anUnknownOrInactiveWineIsNotFound() {
        scan(Outcome.NO_MATCH, null);
        UUID unknown = UUID.randomUUID();
        when(wines.findById(unknown)).thenReturn(Optional.empty());
        Wine inactive = activeWine();
        inactive.deactivate();

        assertThatThrownBy(() -> handler.execute(command(WineLabelScanVerdict.CORRECTED, unknown)))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("WINE_NOT_FOUND");
        assertThatThrownBy(() -> handler.execute(command(WineLabelScanVerdict.CORRECTED, inactive.getId())))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("WINE_NOT_FOUND");
        verifyNoInteractions(recorder, signals);
    }

    @Test
    void onlyTheExactlyMatchedWineCanBeConfirmed() {
        Wine other = activeWine();
        scan(Outcome.EXACT_MATCH, UUID.randomUUID());
        assertThatThrownBy(() -> handler.execute(command(WineLabelScanVerdict.CONFIRMED, other.getId())))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("INVALID_SCAN_FEEDBACK");

        scan(Outcome.POSSIBLE_MATCHES, null);
        assertThatThrownBy(() -> handler.execute(command(WineLabelScanVerdict.CONFIRMED, other.getId())))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("INVALID_SCAN_FEEDBACK");
        verifyNoInteractions(recorder, signals);
    }

    @Test
    void correctingAnExactMatchToAnotherWineSignalsTheCatalogAfterRecording() {
        UUID matched = UUID.randomUUID();
        Wine chosen = activeWine();
        scan(Outcome.EXACT_MATCH, matched);

        handler.execute(command(WineLabelScanVerdict.CORRECTED, chosen.getId()));

        verify(recorder).recordFeedback(any(), any(), any(), any());
        verify(signals).exactMatchCorrected(matched, chosen.getId());
    }

    @Test
    void correctionsThatDoNotContradictAnExactMatchSendNoSignal() {
        Wine chosen = activeWine();
        scan(Outcome.EXACT_MATCH, chosen.getId());
        handler.execute(command(WineLabelScanVerdict.CORRECTED, chosen.getId()));

        scan(Outcome.POSSIBLE_MATCHES, null);
        handler.execute(command(WineLabelScanVerdict.CORRECTED, chosen.getId()));

        verifyNoInteractions(signals);
    }

    @Test
    void aFailingCatalogSignalNeverFailsTheFeedback() {
        UUID matched = UUID.randomUUID();
        Wine chosen = activeWine();
        RecordedScan scan = scan(Outcome.EXACT_MATCH, matched);
        doThrow(new IllegalStateException("reports unavailable")).when(signals).exactMatchCorrected(any(), any());

        handler.execute(command(WineLabelScanVerdict.CORRECTED, chosen.getId()));

        verify(recorder).recordFeedback(scan, member, WineLabelScanVerdict.CORRECTED, chosen.getId());
        verify(signals).exactMatchCorrected(matched, chosen.getId());
    }

    @Test
    void theVerdictMustAgreeWithTheChosenWine() {
        assertThatThrownBy(() -> command(WineLabelScanVerdict.CONFIRMED, null))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("INVALID_SCAN_FEEDBACK");
        assertThatThrownBy(() -> command(WineLabelScanVerdict.CORRECTED, null))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("INVALID_SCAN_FEEDBACK");
        assertThatThrownBy(() -> command(WineLabelScanVerdict.NOT_IN_CATALOG, UUID.randomUUID()))
                .extracting(failure -> ((DomainException) failure).getCode()).isEqualTo("INVALID_SCAN_FEEDBACK");
        assertThat(command(WineLabelScanVerdict.NOT_IN_CATALOG, null).wineId()).isNull();
    }

    private RecordedScan scan(Outcome outcome, UUID wineId) {
        RecordedScan scan = new RecordedScan(scanId, outcome, wineId, null);
        when(history.findOwnedBy(scanId, member)).thenReturn(Optional.of(scan));
        return scan;
    }

    private Wine activeWine() {
        Wine wine = Wine.create("Gran Malbec", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(wines.findById(wine.getId())).thenReturn(Optional.of(wine));
        return wine;
    }

    private SubmitWineLabelScanFeedbackCommand command(WineLabelScanVerdict verdict, UUID wineId) {
        return new SubmitWineLabelScanFeedbackCommand(member, scanId, verdict, wineId);
    }
}
