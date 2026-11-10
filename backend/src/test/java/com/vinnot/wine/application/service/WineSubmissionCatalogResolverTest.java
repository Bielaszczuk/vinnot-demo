package com.vinnot.wine.application.service;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.application.port.out.WineSubmissionCatalogLookupPort;
import com.vinnot.wine.domain.model.WineSubmissionCatalogReferences;
import com.vinnot.wine.domain.service.CatalogNameNormalizer;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineSubmissionCatalogResolverTest {

    private static final UUID ARGENTINA = UUID.randomUUID();
    private static final UUID CHILE = UUID.randomUUID();
    private static final UUID MENDOZA = UUID.randomUUID();
    private static final UUID MAIPO = UUID.randomUUID();
    private static final UUID CATENA = UUID.randomUUID();

    private final WineSubmissionCatalogResolver resolver = new WineSubmissionCatalogResolver(new FakeCatalog());

    @Test
    void picksReplaceTheSubmittedTextWithCatalogNamesAndAreStored() {
        var resolution = resolver.resolve(new WineSubmissionCatalogResolver.Input(
                CATENA, "catena", ARGENTINA, "arg", MENDOZA, "mza", List.of("Malbec")));

        assertThat(resolution.wineryName()).isEqualTo("Catena Zapata");
        assertThat(resolution.country()).isEqualTo("Argentina");
        assertThat(resolution.region()).isEqualTo("Mendoza");
        assertThat(resolution.references())
                .isEqualTo(new WineSubmissionCatalogReferences(CATENA, ARGENTINA, MENDOZA, List.of()));
    }

    @Test
    void aPickedRegionImpliesItsCountry() {
        var resolution = resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "Bodega Nueva", null, null, MENDOZA, null, List.of()));

        assertThat(resolution.country()).isEqualTo("Argentina");
        assertThat(resolution.references().countryId()).isEqualTo(ARGENTINA);
        assertThat(resolution.references().regionId()).isEqualTo(MENDOZA);
    }

    @Test
    void rejectsARegionFromAnotherCountry() {
        assertThatThrownBy(() -> resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "Bodega Nueva", ARGENTINA, null, MAIPO, null, List.of())))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_SUBMISSION_CATALOG_REFERENCE")
                .hasMessage("The selected region does not belong to the selected country");
    }

    @Test
    void rejectsPickedIdsThatAreNotInTheCatalog() {
        assertThatThrownBy(() -> resolver.resolve(new WineSubmissionCatalogResolver.Input(
                UUID.randomUUID(), "Bodega", null, null, null, null, List.of())))
                .hasMessage("The selected winery does not exist");
        assertThatThrownBy(() -> resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "Bodega", UUID.randomUUID(), null, null, null, List.of())))
                .hasMessage("The selected country does not exist");
        assertThatThrownBy(() -> resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "Bodega", null, null, UUID.randomUUID(), null, List.of())))
                .hasMessage("The selected region does not exist");
    }

    @Test
    void freeTextFromOlderAppsIsLinkedWhenItMatchesIgnoringCaseAndAccents() {
        var resolution = resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "CATENA zapata", null, " argentina ", null, "mendozá", List.of()));

        assertThat(resolution.wineryName()).isEqualTo("Catena Zapata");
        assertThat(resolution.region()).isEqualTo("Mendoza");
        assertThat(resolution.references())
                .isEqualTo(new WineSubmissionCatalogReferences(CATENA, ARGENTINA, MENDOZA, List.of()));
    }

    @Test
    void unknownTextIsKeptAsAProposalWithoutReferences() {
        var resolution = resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "Bodega Nueva", null, "Narnia", null, "Valle Oculto", List.of()));

        assertThat(resolution.wineryName()).isEqualTo("Bodega Nueva");
        assertThat(resolution.country()).isEqualTo("Narnia");
        assertThat(resolution.region()).isEqualTo("Valle Oculto");
        assertThat(resolution.references()).isEqualTo(WineSubmissionCatalogReferences.none());
    }

    @Test
    void knownGrapesTakeTheirCatalogNameAndTheRestAreProposedOnce() {
        var resolution = resolver.resolve(new WineSubmissionCatalogResolver.Input(
                null, "Bodega", null, null, null, null,
                List.of("malbec", "Uva Criolla", "Malbec", " Uva Criolla ")));

        assertThat(resolution.grapes()).containsExactly("Malbec", "Uva Criolla");
        assertThat(resolution.references().proposedGrapes()).containsExactly("Uva Criolla");
    }

    private static final class FakeCatalog implements WineSubmissionCatalogLookupPort {
        private final Map<UUID, CatalogEntry> countries = Map.of(
                ARGENTINA, new CatalogEntry(ARGENTINA, "Argentina"), CHILE, new CatalogEntry(CHILE, "Chile"));
        private final Map<UUID, RegionEntry> regions = Map.of(
                MENDOZA, new RegionEntry(MENDOZA, "Mendoza", ARGENTINA), MAIPO, new RegionEntry(MAIPO, "Maipo", CHILE));
        private final Map<UUID, CatalogEntry> wineries = Map.of(CATENA, new CatalogEntry(CATENA, "Catena Zapata"));

        @Override
        public Optional<CatalogEntry> findCountry(UUID countryId) {
            return Optional.ofNullable(countries.get(countryId));
        }

        @Override
        public Optional<RegionEntry> findRegion(UUID regionId) {
            return Optional.ofNullable(regions.get(regionId));
        }

        @Override
        public Optional<CatalogEntry> findWinery(UUID wineryId) {
            return Optional.ofNullable(wineries.get(wineryId));
        }

        @Override
        public Optional<CatalogEntry> matchCountry(String name) {
            return countries.values().stream().filter(c -> CatalogNameNormalizer.sameName(name, c.name())).findFirst();
        }

        @Override
        public Optional<RegionEntry> matchRegion(UUID countryId, String name) {
            return regions.values().stream()
                    .filter(r -> r.countryId().equals(countryId) && CatalogNameNormalizer.sameName(name, r.name()))
                    .findFirst();
        }

        @Override
        public Optional<CatalogEntry> matchWinery(String name) {
            return wineries.values().stream().filter(w -> CatalogNameNormalizer.sameName(name, w.name())).findFirst();
        }

        @Override
        public Optional<String> matchGrape(String name) {
            return CatalogNameNormalizer.sameName(name, "Malbec") ? Optional.of("Malbec") : Optional.empty();
        }
    }
}
