package com.vinnot.wine.infrastructure.persistence.search;

import org.hibernate.resource.jdbc.spi.StatementInspector;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** Records the SQL Hibernate prepares, so a test can explain the exact statement a repository runs. */
public class RecordingStatementInspector implements StatementInspector {

    private static final List<String> STATEMENTS = new CopyOnWriteArrayList<>();

    @Override
    public String inspect(String sql) {
        STATEMENTS.add(sql);
        return sql;
    }

    static void clear() {
        STATEMENTS.clear();
    }

    static List<String> statements() {
        return List.copyOf(STATEMENTS);
    }
}
