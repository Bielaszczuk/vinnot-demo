package com.vinnot.shared.infrastructure.web.controller;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class HealthControllerTest {
    @Test
    void versionExposesTheBuiltRevisionAlongsideTheExistingContract() {
        var controller = new HealthController();
        ReflectionTestUtils.setField(controller, "appName", "vinnot-backend");
        ReflectionTestUtils.setField(controller, "appVersion", "1.0.0");
        ReflectionTestUtils.setField(controller, "revision", "a".repeat(40));
        assertThat(controller.version().getBody())
                .containsEntry("revision", "a".repeat(40))
                .containsEntry("version", "1.0.0")
                .containsEntry("name", "vinnot-backend");
        assertThat(controller.health().getBody()).containsEntry("status", "UP");
    }
}
