package com.vinnot.user.application.port.out;

import com.vinnot.user.domain.model.User;

/** Points for a complete profile (#455): a photo, a first and last name and a phone number, awarded once. */
public interface ProfilePointsPort {
    /** The member's profile changed; it earns its points the first time it is complete. */
    void profileChanged(User user);
}
