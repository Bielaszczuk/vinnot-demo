package com.vinnot.winery.application.query.handler;

import java.util.List;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.winery.application.port.in.GetWineryByIdUseCase;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import com.vinnot.winery.application.query.model.GetWineryByIdQuery;
import com.vinnot.winery.application.query.response.WineryDetailsResponse;
import com.vinnot.winery.domain.model.Winery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Handler for GetWineryByIdQuery.
 * Implements {@link GetWineryByIdUseCase} as the driving port contract.
 */
@Service
@RequiredArgsConstructor
public class GetWineryByIdQueryHandler implements GetWineryByIdUseCase {

    private final WineryRepositoryPort wineryRepository;

    @Override
    @Transactional(readOnly = true)
    public WineryDetailsResponse execute(GetWineryByIdQuery query) {
        Winery winery = wineryRepository.findById(query.wineryId())
                .orElseThrow(() -> new EntityNotFoundException("Winery", query.wineryId()));

        int count = wineryRepository.countActiveWinesByWineryIds(List.of(winery.getId()))
                .getOrDefault(winery.getId(), 0);
        return WineryDetailsResponse.fromDomain(winery, count);
    }
}

