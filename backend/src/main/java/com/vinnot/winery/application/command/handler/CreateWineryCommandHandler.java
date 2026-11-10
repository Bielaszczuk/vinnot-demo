package com.vinnot.winery.application.command.handler;

import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.application.command.model.CreateWineryCommand;
import com.vinnot.winery.application.port.in.CreateWineryUseCase;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.domain.valueobject.ContactInfo;
import com.vinnot.winery.domain.valueobject.Location;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/**
 * Handler for CreateWineryCommand.
 * Implements {@link CreateWineryUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class CreateWineryCommandHandler implements CreateWineryUseCase {

    private final WineryRepositoryPort wineryRepository;

    @Override
    @Transactional
    public UUID execute(CreateWineryCommand command) {
        Winery winery = Winery.create(command.name(), command.countryId());

        winery.updateBasicInfo(
                command.name(),
                command.descriptionEs(),
                command.countryId(),
                command.regionId(),
                command.subregion()
        );
        winery.updateDescriptions(command.descriptionEs(), command.descriptionEn());

        Coordinates coordinates = null;
        if (Objects.nonNull(command.latitude()) && Objects.nonNull(command.longitude())) {
            coordinates = Coordinates.of(command.latitude(), command.longitude());
        }

        Location location = Location.of(command.address(), coordinates);
        winery.updateLocation(location);

        ContactInfo contactInfo = ContactInfo.of(
                command.email(),
                command.phone(),
                command.website()
        );
        winery.updateContactInfo(contactInfo);

        winery.updateImages(command.logoUrl(), command.imageUrl());
        winery.setEstablishedYear(command.establishedYear());

        Winery savedWinery = wineryRepository.save(winery);

        return savedWinery.getId();
    }
}
