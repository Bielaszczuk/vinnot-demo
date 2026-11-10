package com.vinnot.community.application.query.handler;

import com.vinnot.community.application.port.in.CheckCommunityProfileUseCase;
import com.vinnot.community.application.port.out.CommunityProfileAccessPort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CheckCommunityProfileQueryHandler implements CheckCommunityProfileUseCase {
    private final CommunityProfileAccessPort access;

    @Override
    public void execute(UUID viewer, UUID author) {
        if (Objects.nonNull(viewer) && access.blockedBetween(viewer, author)) {
            throw new EntityNotFoundException("User", author);
        }
    }
}
