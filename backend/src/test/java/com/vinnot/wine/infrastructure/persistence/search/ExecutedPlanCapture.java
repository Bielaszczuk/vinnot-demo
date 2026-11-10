package com.vinnot.wine.infrastructure.persistence.search;

import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Captures the plans PostgreSQL actually executed for the statements a repository call ran, with their real
 * parameters, through {@code auto_explain}. The container must preload it without setting
 * {@code auto_explain.log_min_duration} on the command line, which would override {@code ALTER SYSTEM}. Plans are
 * read back from the server log between two markers, so no SQL has to be rebuilt in the test.
 */
final class ExecutedPlanCapture {

    /** One executed statement: its query text and the shared buffers its top plan node touched. */
    record ExecutedPlan(String text, long sharedBuffers) {
    }

    private static final Pattern TOP_BUFFERS = Pattern.compile("Buffers: shared((?: hit=\\d+)?(?: read=\\d+)?)");
    private static final Pattern COUNT = Pattern.compile("(?:hit|read)=(\\d+)");

    private final JdbcTemplate jdbcTemplate;
    private final PostgreSQLContainer postgres;

    ExecutedPlanCapture(JdbcTemplate jdbcTemplate, PostgreSQLContainer postgres) {
        this.jdbcTemplate = jdbcTemplate;
        this.postgres = postgres;
    }

    /** Runs the action with every statement explained, and returns the plans of the statements that read wines. */
    List<ExecutedPlan> capture(Runnable action) {
        String marker = UUID.randomUUID().toString();
        reload(0);
        log("plan-capture-start-" + marker);
        try {
            action.run();
        } finally {
            reload(-1);
            log("plan-capture-end-" + marker);
        }
        String logs = postgres.getLogs();
        int start = logs.indexOf("plan-capture-start-" + marker);
        int end = logs.indexOf("plan-capture-end-" + marker);
        return parse(logs.substring(start, end));
    }

    /** Backends apply a reloaded setting before their next command; the pause lets idle pool connections do so. */
    private void reload(int minDuration) {
        jdbcTemplate.execute("ALTER SYSTEM SET auto_explain.log_min_duration = " + minDuration);
        jdbcTemplate.execute("SELECT pg_reload_conf()");
        try {
            Thread.sleep(300);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private void log(String message) {
        jdbcTemplate.execute("DO $$ BEGIN RAISE LOG '" + message + "'; END $$");
    }

    private static List<ExecutedPlan> parse(String section) {
        List<ExecutedPlan> plans = new ArrayList<>();
        for (String entry : section.split("duration: ")) {
            int queryText = entry.indexOf("Query Text:");
            if (queryText < 0) {
                continue;
            }
            String text = entry.substring(queryText);
            if (!text.contains("wine") || text.contains("auto_explain") || text.contains("RAISE LOG")) {
                continue;
            }
            Matcher buffers = TOP_BUFFERS.matcher(text);
            long shared = 0;
            if (buffers.find()) {
                Matcher count = COUNT.matcher(buffers.group(1));
                while (count.find()) {
                    shared += Long.parseLong(count.group(1));
                }
            }
            plans.add(new ExecutedPlan(text, shared));
        }
        return plans;
    }
}
