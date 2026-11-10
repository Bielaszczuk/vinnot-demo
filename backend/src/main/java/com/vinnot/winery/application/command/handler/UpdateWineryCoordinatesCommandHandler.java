package com.vinnot.winery.application.command.handler;

import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import com.vinnot.winery.application.command.model.UpdateWineryCoordinatesCommand;
import com.vinnot.winery.application.port.in.UpdateWineryCoordinatesUseCase;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.domain.model.Winery;
import com.vinnot.winery.domain.valueobject.Location;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import lombok.RequiredArgsConstructor;

/**
 * Handler for UpdateWineryCoordinatesCommand.
 * Only updates coordinates (and optionally address) if the winery doesn't already have them.
 * Implements {@link UpdateWineryCoordinatesUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class UpdateWineryCoordinatesCommandHandler implements UpdateWineryCoordinatesUseCase {

    private final WineryRepositoryPort wineryRepository;

    @Override
    @Transactional
    public void execute(UpdateWineryCoordinatesCommand command) {
        Winery winery = wineryRepository.findById(command.wineryId())
                .orElseThrow(() -> new EntityNotFoundException("Winery", command.wineryId()));

        // Only update if the winery doesn't already have coordinates
        if (Objects.nonNull(winery.getLocation()) && winery.getLocation().hasCoordinates()) {
            return;
        }

        Coordinates coordinates = Coordinates.of(command.latitude(), command.longitude());

        // Preserve existing address if not provided, otherwise use the resolved one
        String address = command.address();
        if (Objects.isNull(address) && Objects.nonNull(winery.getLocation())) {
            address = winery.getLocation().getAddress();
        }

        Location location = Location.of(address, coordinates);
        winery.updateLocation(location);
        wineryRepository.save(winery);
    }
}

