package com.vinnot.ai.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class WineGrowingAreaTest {

    /** Catalog region names as the catalog spells them, Argentina by subregion, the world by appellation. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', nullValues = "-", textBlock = """
            -          | Cafayate Valley                       | Argentina      | CALCHAQUI_SALTA
            -          | Valles Calchaquíes                    | Argentina      | CALCHAQUI_SALTA
            -          | Salta                                 | Argentina      | CALCHAQUI_SALTA
            -          | Jujuy                                 | Argentina      | QUEBRADA_DE_HUMAHUACA
            -          | Uco Valley                            | Argentina      | UCO_VALLEY
            -          | Valle de Uco                          | Argentina      | UCO_VALLEY
            -          | Paraje Altamira                       | Argentina      | UCO_VALLEY
            Tupungato  | Mendoza                               | Argentina      | UCO_VALLEY
            -          | Lujan de Cuyo                         | Argentina      | LUJAN_DE_CUYO
            -          | Agrelo                                | Argentina      | LUJAN_DE_CUYO
            -          | Maipu                                 | Argentina      | MAIPU
            -          | Mendoza                               | Argentina      | MENDOZA
            -          | Pedernal Valley                       | Argentina      | SAN_JUAN_HIGH
            -          | Tulum Valley                          | Argentina      | SAN_JUAN
            -          | La Rioja                              | Argentina      | FAMATINA
            -          | Patagonia                             | Argentina      | PATAGONIA
            -          | Rio Negro                             | Argentina      | RIO_NEGRO
            -          | Neuquén                               | Argentina      | NEUQUEN
            -          | Chubut                                | Argentina      | CHUBUT
            -          | Córdoba Province                      | Argentina      | CORDOBA
            -          | Rioja                                 | España         | RIOJA
            -          | Castilla y León                       | España         | CASTILLA_Y_LEON
            -          | Castilla                              | España         | CENTRAL_SPAIN
            -          | Saint-Émilion Grand Cru               | Francia        | BORDEAUX
            -          | Champagne Premier Cru                 | France         | CHAMPAGNE
            -          | Côtes-du-Rhône                        | Francia        | SOUTHERN_RHONE
            -          | Northern Rhône                        | Francia        | NORTHERN_RHONE
            -          | Côtes de Provence                     | Francia        | PROVENCE
            -          | Amarone della Valpolicella Classico   | Italia         | VENETO
            -          | Südtirol - Alto Adige                 | Italia         | ALPINE_ITALY
            -          | Friuli-Venezia Giulia                 | Italia         | ALPINE_ITALY
            -          | Montepulciano d'Abruzzo               | Italia         | CENTRAL_ADRIATIC
            -          | Vino Nobile di Montepulciano          | Italia         | TUSCANY
            -          | Mosel                                 | Alemania       | MOSEL
            -          | Napa Valley                           | Estados Unidos | NAPA
            -          | Sta. Rita Hills                       | Estados Unidos | COOL_CALIFORNIA
            -          | Central Valley                        | Chile          | CENTRAL_CHILE
            -          | Casablanca Valley                     | Chile          | COASTAL_CHILE
            -          | Marlborough                           | Nueva Zelanda  | MARLBOROUGH
            -          | Hawke's Bay                           | Nueva Zelanda  | NORTH_ISLAND
            -          | Barossa Valley                        | Australia      | WARM_AUSTRALIA
            -          | Stellenbosch                          | Sudáfrica      | STELLENBOSCH
            -          | Porto                                 | Portugal       | PORTO
            -          | Kakheti                               | Georgia        | KAKHETI
            """)
    void locatesTheCatalogPlace(String subregion, String region, String country, WineGrowingArea expected) {
        assertThat(WineGrowingArea.locate(subregion, region, country)).contains(expected);
    }

    /** An unmapped place, a place in another country or a missing country gives no terroir. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', nullValues = "-", textBlock = """
            -          | Wine of Argentina | Argentina
            -          | Mendoza           | Chile
            -          | Central Valley    | Estados Unidos
            -          | Rioja             | Argentina
            -          | California        | Estados Unidos
            -          | Mendoza           | -
            -          | -                 | Argentina
            Unknown    | -                 | Argentina
            """)
    void addsNoTerroirForAnUnknownPlace(String subregion, String region, String country) {
        assertThat(WineGrowingArea.locate(subregion, region, country)).isEmpty();
    }

    @Test
    void describesThePlaceItsClimateAndTheEffectOnEachFamily() {
        assertThat(WineGrowingArea.CALCHAQUI_SALTA.cue(WineColorEvidence.Family.RED))
                .contains("Calchaquí Valleys, Salta (about 1,700-3,100 m)", "UV-B", "inky, near-opaque core",
                        "vivid violet rim");
        assertThat(WineGrowingArea.NEUQUEN.cue(WineColorEvidence.Family.RED))
                .contains("Neuquén", "translucent ruby", "vivid, bright red-violet");
        assertThat(WineGrowingArea.MOSEL.cue(WineColorEvidence.Family.WHITE))
                .contains("almost colorless", "almost watery lemon-green");
        assertThat(WineGrowingArea.PROVENCE.cue(WineColorEvidence.Family.ROSE))
                .contains("deeper, warmer pink", "peach, melon, mango");
        assertThat(WineGrowingArea.MAIPU.cue(WineColorEvidence.Family.WHITE)).contains("deeper straw to gold");
        assertThat(WineGrowingArea.LUJAN_DE_CUYO.cue(WineColorEvidence.Family.ROSE))
                .contains("ripe strawberry to raspberry pink").doesNotContain("; null");
        assertThat(WineGrowingArea.UCO_VALLEY.cue(WineColorEvidence.Family.WHITE)).contains("silver glints");
        assertThat(WineGrowingArea.BORDEAUX.cue(WineColorEvidence.Family.RED)).contains("saturated but not inky");
        assertThat(WineGrowingArea.CALCHAQUI_SALTA.cue(WineColorEvidence.Family.ROSE)).contains("violet glints");
        assertThat(WineGrowingArea.CALCHAQUI_SALTA.cue(WineColorEvidence.Family.WHITE)).contains("luminous straw");
        assertThat(WineGrowingArea.UCO_VALLEY.cue(WineColorEvidence.Family.ROSE)).contains("bright, clear pink");
        assertThat(WineGrowingArea.BORDEAUX.cue(WineColorEvidence.Family.WHITE)).contains("lemon to straw");
        assertThat(WineGrowingArea.BORDEAUX.cue(WineColorEvidence.Family.ROSE)).contains("salmon to strawberry");
        assertThat(WineGrowingArea.MAIPU.cue(WineColorEvidence.Family.RED)).contains("garnet sooner");
        assertThat(WineGrowingArea.LUJAN_DE_CUYO.cue(WineColorEvidence.Family.WHITE)).contains("light gold");
        assertThat(WineGrowingArea.NEUQUEN.cue(WineColorEvidence.Family.ROSE)).contains("copper");
        assertThat(WineGrowingArea.UCO_VALLEY.climate()).isEqualTo(WineGrowingArea.Climate.HIGH_ALTITUDE);
    }
}
