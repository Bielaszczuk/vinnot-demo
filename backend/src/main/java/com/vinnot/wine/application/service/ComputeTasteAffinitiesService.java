package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.in.ComputeTasteAffinitiesUseCase;
import com.vinnot.wine.application.port.out.TasteAffinityStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Readers never see a half-written profile: the replacement happens in one transaction. */
@Service
@RequiredArgsConstructor
public class ComputeTasteAffinitiesService implements ComputeTasteAffinitiesUseCase {
    private final TasteAffinityStore store;

    @Override
    @Transactional
    public int execute(Instant now) {
        return store.recompute(now);
    }
}
