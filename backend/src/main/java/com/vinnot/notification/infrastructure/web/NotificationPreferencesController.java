package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.port.in.ManageNotificationPreferencesUseCase;
import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/users/me/notification-preferences")
@Tag(name = "Notification preferences")
public class NotificationPreferencesController {
    private final ManageNotificationPreferencesUseCase preferences;

    public NotificationPreferencesController(ManageNotificationPreferencesUseCase preferences) {
        this.preferences = preferences;
    }

    @GetMapping
    @Operation(summary = "Current user's notification preferences and marketing consent")
    public ResponseEntity<ApiResponseWrapper<PreferencesResponse>> get(@AuthenticationPrincipal String principal) {
        return ResponseEntity.ok(ApiResponseWrapper.of(PreferencesResponse.from(
                preferences.get(UUID.fromString(principal)), preferences.availableChannels())));
    }

    @PutMapping
    @Operation(summary = "Change optional notification categories per channel and the marketing consent")
    public ResponseEntity<ApiResponseWrapper<PreferencesResponse>> update(
            @AuthenticationPrincipal String principal, @Valid @RequestBody UpdatePreferencesRequest request) {
        Map<NotificationPreferences.Choice, Boolean> choices = new HashMap<>();
        for (CategoryChoice category : Objects.requireNonNullElse(request.categories(), List.<CategoryChoice>of())) {
            NotificationCategory value = NotificationCategory.valueOf(category.category());
            if (Objects.nonNull(category.email())) {
                choices.put(new NotificationPreferences.Choice(value, NotificationChannel.EMAIL), category.email());
            }
            if (Objects.nonNull(category.push())) {
                choices.put(new NotificationPreferences.Choice(value, NotificationChannel.PUSH), category.push());
            }
        }
        return ResponseEntity.ok(ApiResponseWrapper.of(PreferencesResponse.from(preferences.update(
                UUID.fromString(principal), choices, request.marketingConsent(),
                ConsentSource.valueOf(request.source())), preferences.availableChannels())));
    }

    public record UpdatePreferencesRequest(
            Boolean marketingConsent,
            @NotNull @Pattern(regexp = "WEB|MOBILE") String source,
            @Size(max = 20) List<@Valid CategoryChoice> categories) {
    }

    public record CategoryChoice(
            @NotNull @Pattern(regexp = "EVENTS_NEARBY|COMMUNITY|RECOMMENDATIONS|REMINDERS|NEWSLETTER|ACCOUNT|SECURITY|PAYMENTS|TICKETS")
            String category,
            Boolean email,
            Boolean push) {
    }

    public record PreferencesResponse(MarketingConsentResponse marketingConsent, List<CategoryResponse> categories) {
        static PreferencesResponse from(NotificationPreferences preferences,
                Map<NotificationCategory, Set<NotificationChannel>> availableChannels) {
            return new PreferencesResponse(
                    new MarketingConsentResponse(preferences.marketingConsent().granted(),
                            preferences.marketingConsent().decidedAt(),
                            Objects.toString(preferences.marketingConsent().source(), null)),
                    NotificationCategory.preferenceCategories().stream().map(category -> {
                        Set<NotificationChannel> channels = availableChannels.getOrDefault(category, Set.of());
                        return new CategoryResponse(
                                category.name(), category.kind().name(),
                                preferences.allows(category, NotificationChannel.EMAIL),
                                preferences.allows(category, NotificationChannel.PUSH),
                                !category.transactional(),
                                channels.contains(NotificationChannel.EMAIL),
                                channels.contains(NotificationChannel.PUSH));
                    }).toList());
        }
    }

    public record MarketingConsentResponse(boolean granted, Instant decidedAt, String source) {
    }

    /**
     * {@code email}/{@code push} are what would be delivered now; {@code editable} is false for transactional.
     * {@code emailAvailable}/{@code pushAvailable} say whether the category ever uses that channel: clients hide the
     * switch of a channel that is not available (for example email for push-only categories).
     */
    public record CategoryResponse(String category, String kind, boolean email, boolean push, boolean editable,
            boolean emailAvailable, boolean pushAvailable) {
    }
}
