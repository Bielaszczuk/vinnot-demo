package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineLabelCandidateVerificationPort;
import com.vinnot.wine.application.port.out.WineLabelCandidateVerificationPort.Verdict;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineLabelCandidateVerifierTest {

    private static final byte[] PHOTO = {1, 2, 3};
    private static final ExtractedWineLabel LABEL = new ExtractedWineLabel(null, null, null, null, null, null, null,
            null, 0.9, null, null, true, List.of("CASA SUR", "GRAN RESERVA", "MALBEC", "GRAN CUVEE"));
    private final WineLabelCandidateVerificationPort port = mock(WineLabelCandidateVerificationPort.class);
    private final WineLabelCandidateVerifier verifier = new WineLabelCandidateVerifier(port, 0.85);
    private final WineLabelCandidate reserva = candidate("Reserva Malbec");
    private final WineLabelCandidate granReserva = candidate("Gran Reserva Malbec");
    private final WineLabelCandidate lookalike = candidate("Gran Cuvee");

    @Test
    void aConfidentPickBecomesTheExactMatchAndKeepsTheOtherSuggestions() {
        when(port.isAvailable()).thenReturn(true);
        when(port.verify(eq(PHOTO), eq("image/jpeg"), anyList(), any())).thenReturn(new Verdict(1, 0.93, "Casa Sur", "Gran Reserva Malbec"));

        var result = verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions(), deadline(10));

        assertThat(result.exact()).isTrue();
        assertThat(result.ranked()).extracting(RankedWineLabelCandidate::candidate)
                .containsExactly(granReserva, reserva);
        assertThat(result.ranked().getFirst().score()).isEqualTo(0.93);
        verify(port).verify(eq(PHOTO), eq("image/jpeg"), eq(List.of(reserva, granReserva, lookalike)), any());
    }

    @Test
    void aPickFromTheVisualCandidatesIsAcceptedEvenWithoutTextEvidence() {
        when(port.isAvailable()).thenReturn(true);
        when(port.verify(any(), any(), anyList(), any())).thenReturn(new Verdict(2, 0.9, "Casa Sur", "Gran Cuvee"));

        var result = verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions(), deadline(10));

        assertThat(result.exact()).isTrue();
        assertThat(result.ranked().getFirst().candidate()).isEqualTo(lookalike);
        assertThat(result.ranked()).hasSize(3);
    }

    @Test
    void anUnsureEmptyOrDifferingAnswerKeepsTheCatalogResult() {
        when(port.isAvailable()).thenReturn(true);
        var suggestions = suggestions();
        when(port.verify(any(), any(), anyList(), any()))
                .thenReturn(new Verdict(0, 0.84, "Casa Sur", "Reserva Malbec"), Verdict.none(),
                        new Verdict(7, 0.99, "Casa Sur", "Reserva Malbec"),
                        new Verdict(-1, 0.99, "Casa Sur", "Reserva Malbec"),
                        // The label says Gran Reserva: picking plain Reserva is a neighbour, not the wine.
                        new Verdict(0, 0.99, "Casa Sur", "Gran Reserva Malbec"));

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThat(verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions, deadline(10))).isSameAs(suggestions);
        }
    }

    @Test
    void aProviderFailureKeepsTheCatalogResult() {
        when(port.isAvailable()).thenReturn(true);
        when(port.verify(any(), any(), anyList(), any())).thenThrow(new IllegalStateException("provider down"));
        var suggestions = suggestions();

        assertThat(verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions, deadline(10))).isSameAs(suggestions);
    }

    @Test
    void exactResultsUnavailableProvidersEmptyShortlistsAndShortBudgetsAreNotVerified() {
        var exact = new WineLabelCatalogMatcher.MatchResult(
                List.of(new RankedWineLabelCandidate(reserva, 0.97)), Map.of(), true);
        var empty = new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false);
        assertThat(verifier.verify(PHOTO, "image/jpeg", LABEL, exact, deadline(10))).isSameAs(exact);
        var suggestions = suggestions();
        assertThat(verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions, deadline(10))).isSameAs(suggestions);

        when(port.isAvailable()).thenReturn(true);
        assertThat(verifier.verify(PHOTO, "image/jpeg", LABEL, empty, deadline(10))).isSameAs(empty);
        assertThat(verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions, deadline(2))).isSameAs(suggestions);
        verify(port, never()).verify(any(), any(), anyList(), any());
    }

    @Test
    void theModelGetsAtMostEightSecondsAndLeavesTimeToAnswer() {
        when(port.isAvailable()).thenReturn(true);
        when(port.verify(any(), any(), anyList(), any())).thenReturn(Verdict.none());

        verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions(), deadline(30));
        verifier.verify(PHOTO, "image/jpeg", LABEL, suggestions(), deadline(5));

        verify(port).verify(any(), any(), anyList(), eq(Duration.ofSeconds(8)));
        verify(port).verify(any(), any(), anyList(), argThat(
                timeout -> timeout.compareTo(Duration.ofSeconds(4)) <= 0
                        && timeout.compareTo(Duration.ofSeconds(3)) > 0));
    }

    @Test
    void theShortlistTakesFiveTextCandidatesThenThreeNewVisualOnes() {
        List<WineLabelCandidate> text = IntStream.range(0, 7).mapToObj(i -> candidate("Text " + i)).toList();
        List<WineLabelCandidate> visual = IntStream.range(0, 5).mapToObj(i -> candidate("Visual " + i)).toList();
        var match = new WineLabelCatalogMatcher.MatchResult(
                text.stream().map(candidate -> new RankedWineLabelCandidate(candidate, 0.7)).toList(), Map.of(),
                false, List.of(
                        new WineLabelCatalogMatcher.VisualCandidate(text.get(1), 0.95),
                        new WineLabelCatalogMatcher.VisualCandidate(visual.get(0), 0.9),
                        new WineLabelCatalogMatcher.VisualCandidate(visual.get(1), 0.8),
                        new WineLabelCatalogMatcher.VisualCandidate(visual.get(2), 0.7),
                        new WineLabelCatalogMatcher.VisualCandidate(visual.get(3), 0.6)));

        assertThat(WineLabelCandidateVerifier.shortlist(match)).containsExactly(
                text.get(0), text.get(1), text.get(2), text.get(3), text.get(4),
                visual.get(0), visual.get(1), visual.get(2));
    }

    @Test
    void rejectsAMinimumConfidenceOutsideZeroToOne() {
        assertThatThrownBy(() -> new WineLabelCandidateVerifier(port, 0.0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WineLabelCandidateVerifier(port, 1.1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private WineLabelCatalogMatcher.MatchResult suggestions() {
        return new WineLabelCatalogMatcher.MatchResult(List.of(
                new RankedWineLabelCandidate(reserva, 0.81),
                new RankedWineLabelCandidate(granReserva, 0.8)), Map.of(), false, List.of(
                new WineLabelCatalogMatcher.VisualCandidate(lookalike, 0.88),
                new WineLabelCatalogMatcher.VisualCandidate(reserva, 0.7)));
    }

    private static WineLabelScanDeadline deadline(int seconds) {
        return new WineLabelScanDeadline(Duration.ofSeconds(seconds));
    }

    private static WineLabelCandidate candidate(String name) {
        return new WineLabelCandidate(Wine.create(name, UUID.randomUUID(), WineType.RED, UUID.randomUUID()), "Casa Sur");
    }
}
