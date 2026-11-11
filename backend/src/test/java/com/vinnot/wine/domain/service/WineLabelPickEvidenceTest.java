package com.vinnot.wine.domain.service;

import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineLabelPickEvidenceTest {

    @Test
    void acceptsAPickWhoseWordsMatchTheLabelIgnoringAccentsCaseAndVintage() {
        assertThat(WineLabelPickEvidence.supports("Viña Cobos", "Chañares Estate Cabernet Franc 2019",
                List.of("VIÑA COBOS", "CHAÑARES ESTATE", "CABERNET FRANC", "2019"),
                candidate("Vina Cobos", "Chanares Estate Cabernet Franc"))).isTrue();
    }

    @Test
    void rejectsACandidateMissingAProductWordFromTheLabel() {
        // The label is Los Arboles Cabernet Sauvignon; the pick is the estate's Cabernet Franc.
        assertThat(WineLabelPickEvidence.supports("Viña Cobos", "Chañares Estate Los Arboles Cabernet Sauvignon",
                List.of("VIÑA COBOS", "LOS ARBOLES"), candidate("Viña Cobos", "Chañares Estate Cabernet Franc")))
                .isFalse();
        assertThat(WineLabelPickEvidence.supports("Bodega Norton", "Cosecha Tardía Espumante Dulce Rosé",
                List.of(), candidate("Bodega Norton", "Cosecha Tardia Rosado Dulce"))).isFalse();
    }

    @Test
    void rejectsACandidateWhoseNameHasWordsNotReadOnTheLabel() {
        assertThat(WineLabelPickEvidence.supports("Andes Tierra", "Manuel & Carmen",
                List.of("MANUEL & CARMEN", "MENDOZA"), candidate("Andes Tierra", "Manuel & Carmen Familia Olero Ram")))
                .isFalse();
        assertThat(WineLabelPickEvidence.supports("Andes Tierra", "Manuel & Carmen",
                List.of("MANUEL & CARMEN", "MENDOZA"), candidate("Andes Tierra", "Manuel Carmen Mendoza")))
                .isTrue();
    }

    @Test
    void rejectsAnotherProducersWineWithTheSameName() {
        assertThat(WineLabelPickEvidence.supports("Don Aparo", "Malbec Bonarda", List.of("DON APARO"),
                candidate("Pascual Toso", "Toso Malbec - Bonarda"))).isFalse();
        assertThat(WineLabelPickEvidence.supports("El Esteco", "Elementos Rosé", List.of("EL ESTECO", "ELEMENTOS"),
                candidate("5 Elementos", "Rosé"))).isFalse();
    }

    @Test
    void acceptsABrandPrintedLargerThanTheProducer() {
        assertThat(WineLabelPickEvidence.supports("Oculto", "Pinot Noir", List.of("OCULTO", "PINOT NOIR"),
                candidate("Bodega Los Morros", "Oculto Pinot Noir"))).isTrue();
        assertThat(WineLabelPickEvidence.supports("Oculto", "Pinot Noir", List.of("OCULTO", "PINOT NOIR"),
                candidate("Bodega Los Morros", "Oculto"))).isFalse();
    }

    @Test
    void needsAProductReading() {
        assertThat(WineLabelPickEvidence.supports("Casa Sur", null, List.of("CASA SUR", "MALBEC"),
                candidate("Casa Sur", "Malbec"))).isFalse();
        assertThat(WineLabelPickEvidence.supports(null, "Malbec", List.of("MALBEC"), candidate(null, "Malbec")))
                .isTrue();
    }

    private static WineLabelCandidate candidate(String winery, String name) {
        return new WineLabelCandidate(Wine.create(name, UUID.randomUUID(), WineType.RED, UUID.randomUUID()), winery);
    }
}
