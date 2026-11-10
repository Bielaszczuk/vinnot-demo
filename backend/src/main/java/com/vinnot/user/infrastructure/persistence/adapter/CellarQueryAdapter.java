package com.vinnot.user.infrastructure.persistence.adapter;

import com.vinnot.cellar.application.port.out.CellarWineRepositoryPort;
import com.vinnot.user.application.port.out.CellarQueryPort;
import org.springframework.stereotype.Component;

import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Component("userCellarQueryAdapter")
@RequiredArgsConstructor
public class CellarQueryAdapter implements CellarQueryPort {

    private final CellarWineRepositoryPort cellarWineRepositoryPort;

    @Override
    public long countByUserId(UUID userId) {
        return cellarWineRepositoryPort.countByUserId(userId);
    }
}

