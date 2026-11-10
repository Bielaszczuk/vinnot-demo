package com.vinnot.ai.application.port.in;

/** Regenerates stored AI profiles made from an older prompt or older catalog facts, a few at a time. */
public interface RefreshStaleAiProfilesUseCase {

    /**
     * Regenerates at most the configured number of stale, non-manual profiles.
     *
     * @return how many wines were regenerated in this run
     */
    int refreshStaleProfiles();
}
