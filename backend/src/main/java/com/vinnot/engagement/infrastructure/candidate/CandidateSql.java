package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.engagement.domain.model.PlanningMember;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * SQL shared by the candidate sources. Every source receives the page's account ids as one {@code uuid[]} parameter,
 * so each runs one statement per page whatever the page size.
 */
final class CandidateSql {
    /** Taste affinities count once based on this many rated wines with this average, as for #306 recommendations. */
    static final int MIN_RATED_WINES = 3;
    static final double MIN_AVERAGE = 4.0;
    /** A rating of this or more marks a wine (and its region) as liked. */
    static final int LIKED_RATING = 4;

    private CandidateSql() {
    }

    static UUID[] ids(List<PlanningMember> members) {
        return members.stream().map(PlanningMember::userId).toArray(UUID[]::new);
    }

    /**
     * The wine is active, and the account has not reviewed it, does not keep it in its cellar, was not suggested it
     * before and has no block with whoever added it.
     */
    static String suggestableWine(String user, String wine) {
        return """
                AND NOT EXISTS (SELECT 1 FROM reviews xr WHERE xr.user_id = %1$s AND xr.wine_id = %2$s.id)
                AND NOT EXISTS (SELECT 1 FROM cellar_wines xc WHERE xc.user_id = %1$s AND xc.wine_id = %2$s.id)
                AND NOT EXISTS (SELECT 1 FROM engagement_sends xs WHERE xs.user_id = %1$s AND xs.content_ref = 'WINE:' || %2$s.id)
                AND NOT EXISTS (SELECT 1 FROM user_blocks xb WHERE %2$s.created_by IS NOT NULL
                    AND ((xb.blocker_id = %1$s AND xb.blocked_id = %2$s.created_by)
                      OR (xb.blocker_id = %2$s.created_by AND xb.blocked_id = %1$s)))
                """.formatted(user, wine);
    }

    /** The content was never suggested to the account. */
    static String notSuggested(String user, String contentRef) {
        return "AND NOT EXISTS (SELECT 1 FROM engagement_sends xs WHERE xs.user_id = %s AND xs.content_ref = %s)\n"
                .formatted(user, contentRef);
    }

    /** A wine's name as pushes show it: with its vintage when known. */
    static String wineName(ResultSet row, String name, String vintage) throws SQLException {
        int year = row.getInt(vintage);
        return row.wasNull() ? row.getString(name) : row.getString(name) + " " + year;
    }

    static Duration since(Timestamp at, Instant now) {
        return Objects.isNull(at) ? null : Duration.between(at.toInstant(), now);
    }
}
