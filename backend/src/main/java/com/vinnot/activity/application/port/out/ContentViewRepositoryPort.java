package com.vinnot.activity.application.port.out;

import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.ViewedContent;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ContentViewRepositoryPort {
    /** Adds one view to the content's row of that UTC day; views of accounts that no longer exist are ignored. */
    void record(UUID userId, ContentKind kind, UUID entityId, Instant at);

    /** Per user, the content of one kind with a view since the instant, most viewed first. */
    Map<UUID, List<ViewedContent>> viewsSince(Collection<UUID> userIds, ContentKind kind, Instant since);

    /** Content of one kind with the most views by everyone since the instant. */
    List<ViewedContent> mostViewed(ContentKind kind, Instant since, int limit);

    /** Deletes at most {@code batchSize} day rows before the cutoff's UTC day and says how many it deleted. */
    int purgeBefore(Instant cutoff, int batchSize);
}
