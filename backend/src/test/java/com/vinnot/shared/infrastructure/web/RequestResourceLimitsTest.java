package com.vinnot.shared.infrastructure.web;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RequestResourceLimitsTest {
    @Test
    void allCatalogAndEventRequestDescriptionsAreBoundedWithoutChangingNullPatchSemantics() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            Map<String, List<String>> requests = Map.of(
                    "admin", List.of("CreateWineAdminRequest", "UpdateWineAdminRequest", "CreateWineryAdminRequest",
                            "UpdateWineryAdminRequest", "CreateEventAdminRequest", "UpdateEventAdminRequest",
                            "CreateRouteAdminRequest", "UpdateRouteAdminRequest", "AddStopAdminRequest"),
                    "wine", List.of("CreateWineRequest", "UpdateWineRequest"),
                    "winery", List.of("CreateWineryRequest", "UpdateWineryRequest"),
                    "event", List.of("CreateEventRequest", "UpdateEventRequest"),
                    "partner", List.of("CreatePartnerEventRequest", "UpdatePartnerEventRequest"),
                    "wineroute", List.of("CreateWineRouteRequest", "AddRouteStopRequest"));
            for (var module : requests.entrySet()) {
                for (String name : module.getValue()) {
                    Class<?> type = Class.forName("com.vinnot." + module.getKey() + ".infrastructure.web.request." + name);
                    for (var field : type.getDeclaredFields()) {
                        if (field.getName().startsWith("description")) {
                            assertBound(validator, type, field.getName(), "x".repeat(20000), "x".repeat(20001));
                        }
                        if (field.getName().equals("paymentInstructions")) {
                            assertBound(validator, type, field.getName(), "x".repeat(5000), "x".repeat(5001));
                        }
                    }
                }
            }
        }
    }

    @Test
    void boundsCollectionsAndElementsAcrossBothWineMutationContracts() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String name : List.of("admin.CreateWineAdminRequest", "admin.UpdateWineAdminRequest",
                    "wine.CreateWineRequest", "wine.UpdateWineRequest")) {
                String[] parts = name.split("\\.");
                Class<?> type = Class.forName("com.vinnot." + parts[0] + ".infrastructure.web.request." + parts[1]);
                for (String property : List.of("grapes", "allergens")) {
                    assertBound(validator, type, property, Collections.nCopies(50, "Malbec"),
                            Collections.nCopies(51, "Malbec"));
                    assertThat(validator.validateValue(type, property, List.of("x".repeat(101)))).isNotEmpty();
                }
            }
            for (String name : List.of("CreateRouteAdminRequest", "UpdateRouteAdminRequest")) {
                Class<?> type = Class.forName("com.vinnot.admin.infrastructure.web.request." + name);
                for (String property : List.of("wineryIds", "stops")) {
                    assertBound(validator, type, property, Collections.nCopies(100, null), Collections.nCopies(101, null));
                }
                assertBound(validator, type, "recommendedWineTypes", Collections.nCopies(50, "RED"), Collections.nCopies(51, "RED"));
                assertThat(validator.validateValue(type, "recommendedWineTypes", List.of("x".repeat(51)))).isNotEmpty();
            }
            Class<?> update = Class.forName("com.vinnot.admin.infrastructure.web.request.UpdateWineAdminRequest");
            assertThat(validator.validateValue(update, "clearFields", Set.of("x".repeat(65)))).isNotEmpty();
        }
    }

    @Test
    void cellarNotesRetainNormalAndNullValuesButRejectUnboundedContent() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            for (String name : List.of("AddWineToCellarRequest", "UpdateCellarEntryRequest")) {
                Class<?> type = Class.forName("com.vinnot.cellar.infrastructure.web.request." + name);
                assertBound(factory.getValidator(), type, "notes", "x".repeat(10000), "x".repeat(10001));
            }
        }
    }

    private void assertBound(Validator validator, Class<?> type, String property, Object valid, Object invalid) {
        assertThat(validator.validateValue(type, property, null)).as("%s.%s null", type, property).isEmpty();
        assertThat(validator.validateValue(type, property, valid)).as("%s.%s boundary", type, property).isEmpty();
        assertThat(validator.validateValue(type, property, invalid)).as("%s.%s oversized", type, property).isNotEmpty();
    }
}
