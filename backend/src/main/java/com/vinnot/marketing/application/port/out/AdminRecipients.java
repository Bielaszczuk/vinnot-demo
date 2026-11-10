package com.vinnot.marketing.application.port.out;

import java.util.List;
import java.util.UUID;

/** Who approves posts: the active, not locked administrators (#489). */
public interface AdminRecipients {
    List<UUID> admins();
}
