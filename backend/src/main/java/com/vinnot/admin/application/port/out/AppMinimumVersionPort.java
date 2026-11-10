package com.vinnot.admin.application.port.out;

import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** The minimum supported mobile app version per platform, with its audit (#428); a platform without one blocks no build. */
public interface AppMinimumVersionPort {

    /** The platforms that have a minimum; the others are absent. */
    Map<AppPlatform, AppVersion> minimumVersions();

    /** The stored value of each platform that was ever changed; platforms never changed are absent. */
    Map<AppPlatform, Setting> settings();

    /**
     * Stores the minimum ({@code null} clears it) and, when it changes, an audit record of who changed it, from what to
     * what and when. Concurrent changes of one platform are serialized.
     *
     * @return the minimum before the change, empty when there was none
     */
    Optional<AppVersion> change(AppPlatform platform, AppVersion minimumVersion, Actor actor, Instant at);

    /** The latest audited changes, newest first. */
    List<Change> recentChanges(int limit);

    /** The administrator making the change; the email keeps the audit readable after the account is gone. */
    record Actor(UUID id, String email) {
    }

    /** {@code minimumVersion} is {@code null} when there is no minimum; {@code updatedBy} is the last changer's email. */
    record Setting(AppPlatform platform, AppVersion minimumVersion, Instant updatedAt, String updatedBy) {
    }

    /** Either version is {@code null} when there was, or is, no minimum. */
    record Change(AppPlatform platform, AppVersion previousMinimumVersion, AppVersion minimumVersion, String changedBy,
            Instant changedAt) {
    }
}
