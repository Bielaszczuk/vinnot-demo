package com.vinnot.legal.application.port.out;

import java.util.List;
import java.util.UUID;

/** Who still has to hear about a new terms revision (#309), in batches that never repeat a user. */
public interface TermsAnnouncementPort {
    /**
     * The next active users who accepted another revision but not {@code revision}, after the ones already announced.
     * The cursor moves in the caller's transaction, locked so two runs never take the same users; an empty list means
     * the announcement is complete.
     */
    List<UUID> nextRecipients(String revision, int limit);
}
