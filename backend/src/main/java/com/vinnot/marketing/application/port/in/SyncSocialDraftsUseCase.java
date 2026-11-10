package com.vinnot.marketing.application.port.in;

import java.time.Instant;

/** The draft sweep (#516 S1): TikTok drafts the creator posted from the app become published. */
public interface SyncSocialDraftsUseCase {

    /** @return how many drafts were marked as published */
    int syncDrafts(Instant now);
}
