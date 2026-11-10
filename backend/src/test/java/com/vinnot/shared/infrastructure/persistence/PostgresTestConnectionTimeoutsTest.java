package com.vinnot.shared.infrastructure.persistence;

import org.junit.jupiter.api.Test;
import org.postgresql.jdbc.PgConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

/**
 * Every test connection to PostgreSQL has timeouts (src/test/resources/org/postgresql/driverconfig.properties), so a
 * Docker connection that drops makes a test fail in seconds instead of hanging the whole build.
 */
@Testcontainers(disabledWithoutDocker = true)
class PostgresTestConnectionTimeoutsTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Test
    void aDatabaseThatAcceptsTheConnectionButNeverAnswersFailsInsteadOfHanging() throws Exception {
        try (ServerSocket silent = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            Thread holder = Thread.ofVirtual().start(() -> {
                try (Socket ignored = silent.accept()) {
                    Thread.sleep(Duration.ofMinutes(5));
                } catch (Exception stopped) {
                    // the test is over
                }
            });
            String url = "jdbc:postgresql://127.0.0.1:" + silent.getLocalPort() + "/vinnot";

            assertTimeoutPreemptively(Duration.ofSeconds(60), () ->
                    assertThatThrownBy(() -> DriverManager.getConnection(url, "vinnot", "unused"))
                            .isInstanceOf(SQLException.class));
            holder.interrupt();
        }
    }

    @Test
    void anOpenConnectionGivesUpOnAReadThatNeverReturns() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            assertThat(connection.unwrap(PgConnection.class).getNetworkTimeout()).isEqualTo(120_000);
        }
    }
}
