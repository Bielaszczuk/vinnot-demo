package com.vinnot.wine.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineTest {

    @Test
    void createsAnActiveUnfeaturedWineWithAnInitialRating() {
        Wine wine = Wine.create(
                "  Reserva  ", UUID.randomUUID(), WineType.RED, UUID.randomUUID());

        assertThat(wine.getName()).isEqualTo("Reserva");
        assertThat(wine.isActive()).isTrue();
        assertThat(wine.isFeatured()).isFalse();
        assertThat(wine.getRating()).isEqualTo(Rating.initial());
    }

    @Test
    void copiesMutableCatalogCollections() {
        Wine wine = wine();
        List<String> grapes = new ArrayList<>(List.of("Malbec"));
        List<String> allergens = new ArrayList<>(List.of("Sulfites"));

        wine.updateGrapes(grapes);
        wine.updateAllergens(allergens);
        grapes.add("Cabernet Sauvignon");
        allergens.clear();

        assertThat(wine.getGrapes()).containsExactly("Malbec");
        assertThat(wine.getAllergens()).containsExactly("Sulfites");
    }

    @Test
    void updatesBusinessCharacteristicsAndLifecycle() {
        Wine wine = wine();
        wine.updateBasicInfo("New name", 2020, "Reserve", "Description");
        wine.updateDescriptions("Descripción", "Description");
        wine.updateFoodPairing("Asado");
        wine.updateTasteProfile(70, 80, 90, 10);
        wine.updateRating(Rating.of(new BigDecimal("4.5"), 10));
        wine.toggleFeatured();
        wine.deactivate();

        assertThat(wine.getName()).isEqualTo("New name");
        assertThat(wine.getVintage()).isEqualTo(2020);
        assertThat(wine.getDescriptionEn()).isEqualTo("Description");
        assertThat(wine.getFoodPairing()).isEqualTo("Asado");
        assertThat(wine.getTasteProfile().getBody()).isEqualTo(90);
        assertThat(wine.getRating().getCount()).isEqualTo(10);
        assertThat(wine.isFeatured()).isTrue();
        assertThat(wine.isActive()).isFalse();
    }

    @Test
    void rejectsBlankIdentityAndMissingRequiredUpdates() {
        assertThatThrownBy(() -> Wine.create(
                " ", UUID.randomUUID(), WineType.RED, UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_WINE_NAME");

        Wine wine = wine();
        assertThatThrownBy(() -> wine.updateRating(null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> wine.updateOrigin(null, null))
                .isInstanceOf(NullPointerException.class);
    }

    private Wine wine() {
        return Wine.create(
                "Wine", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
    }
}
