package com.vinnot.shared.infrastructure.storage;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Component
public class R2AvatarInventory {
    private final JdbcTemplate jdbc;
    public R2AvatarInventory(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID owner, String url) {
        String day = LocalDate.now(ZoneOffset.UTC).toString();
        jdbc.update("INSERT INTO storage_operation_budgets(scope, period) VALUES (?, ?) ON CONFLICT DO NOTHING", "avatar-user-" + owner, day);
        int changed = jdbc.update("UPDATE storage_operation_budgets SET operations = operations + 1 WHERE scope = ? AND period = ? AND operations < 20",
                "avatar-user-" + owner, day);
        if (changed != 1) { throw new IllegalArgumentException("Daily image upload limit reached"); }
        jdbc.update("INSERT INTO r2_avatar_inventory(image_url, owner_id) VALUES (?, ?)", url, owner);
    }
}
