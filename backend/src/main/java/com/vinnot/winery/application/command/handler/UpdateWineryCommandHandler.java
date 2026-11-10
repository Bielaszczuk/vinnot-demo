package com.vinnot.winery.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.application.command.model.UpdateWineryCommand;
import com.vinnot.winery.application.port.in.UpdateWineryUseCase;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.domain.valueobject.ContactInfo;
import com.vinnot.winery.domain.valueobject.Location;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.Objects;
import com.vinnot.shared.application.command.FieldUpdates;
import lombok.RequiredArgsConstructor;
import com.vinnot.shared.domain.exception.DomainException;

/**
 * Handler for UpdateWineryCommand.
 * Implements {@link UpdateWineryUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class UpdateWineryCommandHandler implements UpdateWineryUseCase {

    private final WineryRepositoryPort wineryRepository;

    @Override
    @Transactional
    public void execute(UpdateWineryCommand command) {
        Winery winery = wineryRepository.findById(command.wineryId())
                .orElseThrow(() -> new EntityNotFoundException("Winery", command.wineryId()));

        FieldUpdates updates = new FieldUpdates(command.clearFields(), Set.of(
                "descriptionEs", "descriptionEn", "regionId", "subregion", "address",
                "latitude", "longitude", "email", "phone", "website", "logoUrl", "imageUrl", "establishedYear"));
        winery.updateBasicInfo(command.name(),
                updates.resolve("descriptionEs", command.descriptionEs(), winery.getDescriptionEs()),
                Objects.isNull(command.countryId()) ? winery.getCountryId() : command.countryId(),
                updates.resolve("regionId", command.regionId(), winery.getRegionId()),
                updates.resolve("subregion", command.subregion(), winery.getSubregion()));
        winery.updateDescriptions(winery.getDescriptionEs(),
                updates.resolve("descriptionEn", command.descriptionEn(), winery.getDescriptionEn()));

        Location currentLocation = winery.getLocation();
        Coordinates currentCoordinates = Objects.isNull(currentLocation) ? null : currentLocation.getCoordinates();
        var latitude = updates.resolve("latitude", command.latitude(),
                Objects.isNull(currentCoordinates) ? null : currentCoordinates.getLatitude());
        var longitude = updates.resolve("longitude", command.longitude(),
                Objects.isNull(currentCoordinates) ? null : currentCoordinates.getLongitude());
        if ((Objects.isNull(latitude)) != (Objects.isNull(longitude))) {
            throw new DomainException(
                    "INVALID_COORDINATES", "Latitude and longitude must be set or cleared together");
        }
        winery.updateLocation(Location.of(
                updates.resolve("address", command.address(), Objects.isNull(currentLocation) ? null : currentLocation.getAddress()),
                Objects.isNull(latitude) ? null : Coordinates.of(latitude, longitude)));
        ContactInfo contact = winery.getContactInfo();
        winery.updateContactInfo(ContactInfo.of(
                updates.resolve("email", command.email(), Objects.isNull(contact) ? null : contact.getEmail()),
                updates.resolve("phone", command.phone(), Objects.isNull(contact) ? null : contact.getPhone()),
                updates.resolve("website", command.website(), Objects.isNull(contact) ? null : contact.getWebsite())));
        winery.updateImages(updates.resolve("logoUrl", command.logoUrl(), winery.getLogoUrl()),
                updates.resolve("imageUrl", command.imageUrl(), winery.getImageUrl()));
        winery.setEstablishedYear(updates.resolve("establishedYear", command.establishedYear(), winery.getEstablishedYear()));

        wineryRepository.save(winery);
    }
}
