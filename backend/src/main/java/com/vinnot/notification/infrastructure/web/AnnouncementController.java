package com.vinnot.notification.infrastructure.web;

import com.vinnot.notification.application.model.AnnouncementPreview;
import com.vinnot.notification.application.model.AnnouncementReach;
import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.model.AnnouncementStats;
import com.vinnot.notification.application.port.in.ComposeAnnouncementUseCase;
import com.vinnot.notification.application.port.in.SendAnnouncementUseCase;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementBody;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.shared.infrastructure.web.dto.ApiResponseWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Administrators' manual announcements (#310). ADMIN only ({@code SecurityConfig}). Sending, testing included, needs
 * a fresh reauthentication ({@code AdminSensitiveActionInterceptor}); the preview, the reach and the history change
 * nothing, so they do not. Every record carries its delivery counts so far ({@code stats}, #490).
 */
@RestController
@RequestMapping("/admin/notifications/announcements")
@Tag(name = "Admin notifications")
public class AnnouncementController {
    private static final String KINDS = "NEWS|SERVICE";
    private static final String LANGUAGES = "es|en";
    private static final String ROLES = "PARTNER|MODERATOR|ADMIN";
    private final ComposeAnnouncementUseCase compose;
    private final SendAnnouncementUseCase sending;

    public AnnouncementController(ComposeAnnouncementUseCase compose, SendAnnouncementUseCase sending) {
        this.compose = compose;
        this.sending = sending;
    }

    @PostMapping("/preview")
    @Operation(summary = "Render one language of an announcement as its recipients would get it; nothing is sent")
    public ResponseEntity<ApiResponseWrapper<AnnouncementPreview>> preview(@AuthenticationPrincipal String principal,
            @Valid @RequestBody PreviewRequest request) {
        return ResponseEntity.ok(ApiResponseWrapper.of(compose.preview(AnnouncementKind.valueOf(request.kind()),
                NotificationLocale.fromLanguage(request.locale()), new AnnouncementContent(request.title(), request.body()),
                UUID.fromString(principal))));
    }

    @GetMapping("/reach")
    @Operation(summary = "How many accounts an announcement would reach by email, by push and in total")
    public ResponseEntity<ApiResponseWrapper<AnnouncementReach>> reach(
            @RequestParam String kind,
            @RequestParam boolean email,
            @RequestParam boolean push,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) UUID regionId,
            @RequestParam(required = false) UUID countryId,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(ApiResponseWrapper.of(sending.reach(AnnouncementKind.parse(kind),
                new AnnouncementAudience(email, push, language, regionId, countryId, role))));
    }

    @PostMapping("/test")
    @Operation(summary = "Send every written version to the administrator only, marked as a test")
    public ResponseEntity<ApiResponseWrapper<AnnouncementReach>> test(@AuthenticationPrincipal String principal,
            @Valid @RequestBody AnnouncementRequest request) {
        return ResponseEntity.ok(ApiResponseWrapper.of(compose.sendTest(request.toAnnouncement(), UUID.fromString(principal))));
    }

    @PostMapping
    @Operation(summary = "Send an announcement to its audience; delivery runs in batches. A repeated requestId returns the first send")
    public ResponseEntity<ApiResponseWrapper<RecordResponse>> send(@AuthenticationPrincipal String principal,
            @Valid @RequestBody AnnouncementRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponseWrapper.of(RecordResponse.from(sending.send(request.toAnnouncement(), UUID.fromString(principal),
                        request.requestId()))));
    }

    @GetMapping
    @Operation(summary = "The latest announcements and tests, newest first")
    public ResponseEntity<ApiResponseWrapper<List<RecordResponse>>> history() {
        return ResponseEntity.ok(ApiResponseWrapper.of(sending.history().stream().map(RecordResponse::from).toList()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "One announcement or test with what happened to its emails and pushes so far")
    public ResponseEntity<ApiResponseWrapper<RecordResponse>> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponseWrapper.of(RecordResponse.from(sending.find(id))));
    }

    public record PreviewRequest(
            @NotNull @Pattern(regexp = KINDS) String kind,
            @NotNull @Pattern(regexp = LANGUAGES) String locale,
            @NotNull @Size(max = AnnouncementContent.MAX_TITLE) String title,
            @NotNull @Size(max = AnnouncementBody.MAX_LENGTH) String body) {
    }

    public record VersionRequest(
            @NotNull @Size(max = AnnouncementContent.MAX_TITLE) String title,
            @NotNull @Size(max = AnnouncementBody.MAX_LENGTH) String body) {
    }

    public record AudienceRequest(
            boolean email,
            boolean push,
            @Pattern(regexp = LANGUAGES) String language,
            UUID regionId,
            UUID countryId,
            @Pattern(regexp = ROLES) String role) {
    }

    /** {@code requestId}: optional client-generated id of this send; a repeat returns the first send. Tests ignore it. */
    public record AnnouncementRequest(
            UUID requestId,
            @NotNull @Pattern(regexp = KINDS) String kind,
            @Valid VersionRequest es,
            @Valid VersionRequest en,
            @NotNull @Valid AudienceRequest audience,
            @NotNull @Pattern(regexp = "HOME|EVENTS|WINES|WINE_ROUTES|WINERIES") String destination) {
        Announcement toAnnouncement() {
            Map<NotificationLocale, AnnouncementContent> versions = new EnumMap<>(NotificationLocale.class);
            if (Objects.nonNull(es)) {
                versions.put(NotificationLocale.ES, new AnnouncementContent(es.title(), es.body()));
            }
            if (Objects.nonNull(en)) {
                versions.put(NotificationLocale.EN, new AnnouncementContent(en.title(), en.body()));
            }
            return new Announcement(AnnouncementKind.valueOf(kind), versions, new AnnouncementAudience(audience.email(),
                    audience.push(), audience.language(), audience.regionId(), audience.countryId(), audience.role()),
                    AnnouncementDestination.valueOf(destination));
        }
    }

    /**
     * One send or test in the audit; {@code completedAt} is empty while batches are still being queued. {@code stats}
     * counts what happened to its messages so far (#490).
     */
    public record RecordResponse(UUID id, String kind, boolean test, boolean email, boolean push, String language,
            UUID regionId, UUID countryId, String role, String destination, String title, int recipients, String sentBy,
            Instant createdAt, Instant completedAt, StatsResponse stats) {
        static RecordResponse from(AnnouncementRecord sent) {
            AnnouncementAudience audience = sent.audience();
            return new RecordResponse(sent.id(), sent.kind().name(), sent.test(), audience.email(), audience.push(),
                    audience.language(), audience.regionId(), audience.countryId(), audience.role(), sent.destination().name(),
                    sent.title(),
                    sent.recipients(), sent.sentByEmail(), sent.createdAt(), sent.completedAt(), StatsResponse.from(sent.stats()));
        }
    }

    /**
     * Emails the provider accepted and emails that will not arrive; accounts a push reached and push messages that
     * failed, late receipts included; accounts that opened the push.
     */
    public record StatsResponse(long emailsSent, long emailsFailed, long pushesSent, long pushesFailed, long pushesOpened) {
        static StatsResponse from(AnnouncementStats stats) {
            return new StatsResponse(stats.emailsSent(), stats.emailsFailed(), stats.pushesSent(), stats.pushesFailed(),
                    stats.pushesOpened());
        }
    }
}
