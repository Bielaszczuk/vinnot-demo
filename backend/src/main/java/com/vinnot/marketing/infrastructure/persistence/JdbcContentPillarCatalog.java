package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.port.out.ContentPillarCatalog;
import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/** The seeded {@code content_pillars} table in rotation order (#489), with each pillar's auto-approval and active switches (#510). */
@Component
public class JdbcContentPillarCatalog implements ContentPillarCatalog {
    private final JdbcTemplate jdbc;

    public JdbcContentPillarCatalog(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<ContentPillar> all() {
        return jdbc.query("""
                SELECT code, name_es, name_en, weight, brief, brief_en, sort_order, auto_approve, active FROM content_pillars ORDER BY sort_order
                """, (row, index) -> new ContentPillar(row.getString("code"), row.getString("name_es"), row.getString("name_en"),
                row.getInt("weight"), row.getString("brief"), row.getString("brief_en"), row.getInt("sort_order"),
                row.getBoolean("auto_approve"), row.getBoolean("active")));
    }

    @Override
    public void setAutoApprove(String code, boolean enabled) {
        if (jdbc.update("UPDATE content_pillars SET auto_approve = ? WHERE code = ?", enabled, code) == 0) {
            throw new EntityNotFoundException("ContentPillar", code);
        }
    }

    @Override
    public void setActive(String code, boolean enabled) {
        if (jdbc.update("UPDATE content_pillars SET active = ? WHERE code = ?", enabled, code) == 0) {
            throw new EntityNotFoundException("ContentPillar", code);
        }
    }
}
