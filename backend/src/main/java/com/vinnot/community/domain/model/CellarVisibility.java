package com.vinnot.community.domain.model;

import java.util.Objects;

/**
 * The cellar setting a member chose in their profile (#541), as the community module applies it: who may see the
 * cellar listing and its size on the public profile. The owner always sees their own cellar.
 */
public enum CellarVisibility {
    PUBLIC,
    FOLLOWERS,
    PRIVATE;

    /**
     * @param owner    whether the viewer is the cellar's owner
     * @param follower whether the viewer follows the owner
     * @return whether the viewer may see the cellar
     */
    public boolean visibleTo(boolean owner, boolean follower) {
        return owner || this == PUBLIC || (this == FOLLOWERS && follower);
    }

    /** The stored setting; a missing value is the default, {@link #PUBLIC}. */
    public static CellarVisibility fromStored(String value) {
        return Objects.isNull(value) ? PUBLIC : valueOf(value);
    }
}
