package com.vinnot.marketing.application.port.out;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** The email of each account that reviewed or edited a social post, so the admin sees who did it (#489). */
public interface ReviewerEmails {
    /** Emails by account id; ids without an account are left out. */
    Map<UUID, String> emailsOf(Collection<UUID> accountIds);
}
