package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.valueobject.TasteAffinity;
import com.vinnot.wine.domain.valueobject.WineType;

import java.util.List;
import java.util.UUID;

/** Who would like a wine, from the stored taste affinities (#306). */
public interface TasteAudience {
    /**
     * Accounts with a {@linkplain TasteAffinity#strong strong} affinity for one of the wine's grapes or for its type,
     * except its creator and anyone who already has it in their cellar or reviewed it. One match per account, preferring
     * a grape over the type, then the higher score. The wine comes from memory, so one saved in the same transaction
     * matches before it is flushed.
     */
    List<Match> matching(Candidate wine);

    /**
     * @param wineId    the wine to recommend
     * @param createdBy who added it, never told about it; may be null
     * @param type      its type
     * @param grapes    its grape names as written; may be empty
     */
    record Candidate(UUID wineId, UUID createdBy, WineType type, List<String> grapes) { }

    /**
     * @param userId who would like it
     * @param kind   what matched
     * @param label  the grape name as the user knows it, or the type name
     */
    record Match(UUID userId, TasteAffinity.Kind kind, String label) { }
}
