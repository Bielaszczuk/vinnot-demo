package com.vinnot.winery.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.domain.valueobject.ContactInfo;
import com.vinnot.winery.domain.valueobject.Location;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineryTest {

    @Test
    void createsSlugAndKeepsItSynchronizedWithTheName() {
        UUID countryId = UUID.randomUUID();
        Winery winery = Winery.create("  Bodega Los Andes  ", countryId);

        winery.updateBasicInfo(
                "Nueva Bodega", "Descripción", countryId, UUID.randomUUID(), "Uco");
        winery.updateDescriptions("Descripción", "Description");

        assertThat(winery.getName()).isEqualTo("Nueva Bodega");
        assertThat(winery.getSlug()).isEqualTo("nueva-bodega");
        assertThat(winery.getDescriptionEs()).isEqualTo("Descripción");
        assertThat(winery.getDescriptionEn()).isEqualTo("Description");
        assertThat(winery.getSubregion()).isEqualTo("Uco");
    }

    @Test
    void updatesOperationalDetailsAndLifecycle() {
        Winery winery = Winery.create("Winery", UUID.randomUUID());
        Location location = Location.of(
                "Mendoza", Coordinates.of(-32.9, -68.8));
        ContactInfo contact = ContactInfo.of("wine@example.com", "+54", "https://wine.test");

        winery.updateLocation(location);
        winery.updateContactInfo(contact);
        winery.updateImages("logo.jpg", "hero.jpg");
        winery.setEstablishedYear(1901);
        winery.deactivate();

        assertThat(winery.getLocation()).isEqualTo(location);
        assertThat(winery.getContactInfo()).isEqualTo(contact);
        assertThat(winery.getLogoUrl()).isEqualTo("logo.jpg");
        assertThat(winery.getImageUrl()).isEqualTo("hero.jpg");
        assertThat(winery.getEstablishedYear()).isEqualTo(1901);
        assertThat(winery.isActive()).isFalse();

        winery.activate();
        assertThat(winery.isActive()).isTrue();
    }

    @Test
    void rejectsBlankNamesAndMissingCountries() {
        assertThatThrownBy(() -> Winery.create(" ", UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_WINERY_NAME");
        Winery winery = Winery.create("Valid", UUID.randomUUID());
        assertThatThrownBy(() -> winery.updateBasicInfo(
                "Valid", null, null, null, null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void reconstructsCompleteAggregateThroughPersistenceBuilder() {
        UUID id = UUID.randomUUID();
        UUID countryId = UUID.randomUUID();
        UUID regionId = UUID.randomUUID();
        Instant now = Instant.now();
        Location location = Location.of("Address", Coordinates.of(-32.9, -68.8));
        ContactInfo contact = ContactInfo.of("wine@example.com", "+54", "https://wine.test");

        Winery winery = Winery.builder()
                .id(id)
                .name("Winery")
                .slug("winery")
                .descriptionEs("Descripción")
                .descriptionEn("Description")
                .subregion("Uco")
                .location(location)
                .contactInfo(contact)
                .logoUrl("logo.jpg")
                .imageUrl("hero.jpg")
                .establishedYear(1901)
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .seoName("winery-seo")
                .businessName("Winery SA")
                .wineryStatus(1)
                .claimed(true)
                .regionId(regionId)
                .countryId(countryId)
                .countryCode("AR")
                .countryName("Argentina")
                .regionName("Mendoza")
                .ratingsCount(12)
                .ratingsAverage(new BigDecimal("4.5"))
                .winesCount(8)
                .labelsCount(9)
                .backgroundImageUrl("background.jpg")
                .build();

        assertThat(winery.getId()).isEqualTo(id);
        assertThat(winery.getLocation()).isEqualTo(location);
        assertThat(winery.getContactInfo()).isEqualTo(contact);
        assertThat(winery.getCountryId()).isEqualTo(countryId);
        assertThat(winery.getRegionId()).isEqualTo(regionId);
        assertThat(winery.getRatingsAverage()).isEqualByComparingTo("4.5");
        assertThat(winery.getLabelsCount()).isEqualTo(9);
        assertThat(winery.getBackgroundImageUrl()).isEqualTo("background.jpg");
    }
}
