package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.WineryQueryPort;
import com.vinnot.winery.application.port.out.WineryRepositoryPort;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component("adminWineryQueryAdapter")
@RequiredArgsConstructor
public class WineryQueryAdapter implements WineryQueryPort {

    private final WineryRepositoryPort wineryRepository;

    @Override
    public long count() {
        return wineryRepository.count();
    }
}

