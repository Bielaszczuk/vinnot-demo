package com.vinnot.legal.application.port.in;

import java.time.Instant;

/** Emails the next batch of users about a new terms revision before it is required (#309). */
public interface AnnounceTermsUpdateUseCase {
    /** @return how many users were emailed in this run */
    int execute(Instant now);
}
