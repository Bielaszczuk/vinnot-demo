package com.vinnot.shared.infrastructure.persistence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mockStatic;

class ProductionMigrationRunnerTest {
    @ParameterizedTest
    @ValueSource(strings = {
        "", "jdbc:postgresql://postgres:5432/vinnot", "jdbc:postgresql://postgres/vinnot_prod",
        "jdbc:postgresql://postgres:5432/vinnot_prod?user=postgres",
        "jdbc:postgresql://postgres:5432/vinnot_prod?currentSchema=other",
        "jdbc:postgresql://postgres:5432/vinnot_prod/", "jdbc:h2:mem:vinnot_prod"
    })
    void refusesAmbiguousOrNonProductionDestinations(String url) {
        assertThatThrownBy(() -> ProductionMigrationRunner.configure(Map.of(
                "VINNOT_MIGRATION_DB_URL", url, "VINNOT_MIGRATION_DB_PASSWORD", "private-test-value")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("private-test-value");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\n\t"})
    void refusesEmptyPassword(String password) {
        assertThatThrownBy(() -> ProductionMigrationRunner.configure(Map.of(
                "VINNOT_MIGRATION_DB_URL", "jdbc:postgresql://postgres:5432/vinnot_prod",
                "VINNOT_MIGRATION_DB_PASSWORD", password)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("dedicated migration password");
    }

    @ParameterizedTest
    @ValueSource(strings = {"postgres", "127.0.0.1", "[::1]"})
    void fixesRoleSchemaAndSafetyOptionsWithoutBootstrappingSpring(String host) {
        var configuration = ProductionMigrationRunner.configure(Map.of(
                "VINNOT_MIGRATION_DB_URL", "jdbc:postgresql://" + host + ":5432/vinnot_prod",
                "VINNOT_MIGRATION_DB_PASSWORD", "isolated-test-only")).getConfiguration();
        assertThat(configuration.isCleanDisabled()).isTrue();
        assertThat(configuration.isBaselineOnMigrate()).isFalse();
        assertThat(configuration.isCreateSchemas()).isFalse();
        assertThat(configuration.isOutOfOrder()).isFalse();
        assertThat(configuration.isValidateOnMigrate()).isTrue();
        assertThat(configuration.getDefaultSchema()).isEqualTo("public");
        assertThat(configuration.getSchemas()).containsExactly("public");
        assertThat(configuration.getInitSql()).contains("session_user <> 'vinnot_prod_migrator'", "SET ROLE vinnot_prod_owner");
    }

    @Test
    void refusesMissingConfigurationAndCommandLineCredentials() {
        assertThatThrownBy(() -> ProductionMigrationRunner.configure(Map.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ProductionMigrationRunner.main(new String[]{"private-test-value"}))
                .isInstanceOf(IllegalArgumentException.class).hasMessageNotContaining("private-test-value");
    }

    @Test
    void entryPointDelegatesToTheIsolatedRunnerWithProcessEnvironment() {
        try (var runner = mockStatic(ProductionMigrationRunner.class)) {
            runner.when(() -> ProductionMigrationRunner.main(any(String[].class))).thenCallRealMethod();
            ProductionMigrationRunner.main(new String[0]);
            runner.verify(() -> ProductionMigrationRunner.migrate(anyMap()));
        }
    }
}
