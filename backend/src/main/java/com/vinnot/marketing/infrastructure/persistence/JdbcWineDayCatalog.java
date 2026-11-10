package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.port.out.WineDayCatalog;
import com.vinnot.marketing.domain.model.DateRule;
import com.vinnot.marketing.domain.model.WineDay;
import com.vinnot.marketing.domain.model.WineDayKind;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/** The seeded {@code wine_days} table (#489). */
@Component
public class JdbcWineDayCatalog implements WineDayCatalog {
    private final JdbcTemplate jdbc;

    public JdbcWineDayCatalog(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<WineDay> all() {
        return jdbc.query("SELECT code, name_es, name_en, kind, date_rule, priority, country_code FROM wine_days ORDER BY code",
                (row, index) -> new WineDay(row.getString("code"), row.getString("name_es"), row.getString("name_en"),
                        WineDayKind.valueOf(row.getString("kind")), DateRule.parse(row.getString("date_rule")), row.getInt("priority"),
                        row.getString("country_code")));
    }
}
