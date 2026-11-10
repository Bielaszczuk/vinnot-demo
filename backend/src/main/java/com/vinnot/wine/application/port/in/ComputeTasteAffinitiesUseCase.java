package com.vinnot.wine.application.port.in;

import java.time.Instant;

/** Recomputes every user's taste affinities from their ratings (#306). */
public interface ComputeTasteAffinitiesUseCase {
    /** @return how many affinities were stored */
    int execute(Instant now);
}
