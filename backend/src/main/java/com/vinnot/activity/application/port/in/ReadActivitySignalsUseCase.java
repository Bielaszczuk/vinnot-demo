package com.vinnot.activity.application.port.in;

import com.vinnot.activity.domain.model.ActivityRhythm;
import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.ViewedContent;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Engagement signals for the push planner (#405). Every method takes a whole page of users and runs a fixed number
 * of queries, so the planner never queries per user.
 */
public interface ReadActivitySignalsUseCase {
    /**
     * Last activity and usual local open hour (mode of the recorded opens of the last 30 days by default) per user.
     * Users that never opened the app since the signals exist are absent.
     */
    Map<UUID, ActivityRhythm> rhythms(Collection<UUID> userIds);

    /**
     * Each user's views of one kind of content since an instant, one entry per content, most viewed first.
     * Users without such views are absent.
     */
    Map<UUID, List<ViewedContent>> viewsSince(Collection<UUID> userIds, ContentKind kind, Instant since);

    /** The content of one kind viewed most by everyone since an instant, at most {@code limit} entries. */
    List<ViewedContent> mostViewed(ContentKind kind, Instant since, int limit);
}
