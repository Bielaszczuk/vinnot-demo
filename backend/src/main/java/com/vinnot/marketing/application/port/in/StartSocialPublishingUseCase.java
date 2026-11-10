package com.vinnot.marketing.application.port.in;

import java.time.Instant;

/** The publishing sweep (#510 S2): approved posts whose slot arrived start publishing on every enabled network. */
public interface StartSocialPublishingUseCase {

    /** @return how many posts started publishing */
    int startDue(Instant now);
}
