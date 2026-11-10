package com.vinnot.marketing.application.model;

import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A post of the approval queue as the admin API returns it (#489), with its copy and its rendered images per language
 * (#492, #497). A language without copy yet (a post stored before #497) is null in {@code copies} and in the slides. Its
 * publishing record and its publication on each network with their latest metrics (#510) follow. Last (#513 S7): whether the
 * admin may move the post ({@code canReschedule}) or publish it now ({@code canPublishNow}, false while publishing is off or no
 * network is enabled), and when it goes out on each network that publishes ({@code networkSchedule}).
 */
public record SocialPostAdminResponse(UUID id, SocialPostStatus status, Instant scheduledFor, Pillar pillar, WineDayRef wineDay,
        Copies copies, Generation generation, Review review, Media media, Publishing publishing, List<Publication> publications,
        Instant createdAt, Instant updatedAt, boolean canReschedule, boolean canPublishNow, List<NetworkSchedule> networkSchedule) {

    public record Pillar(String code, String nameEs, String nameEn) { }

    public record WineDayRef(String code, String nameEs, String nameEn, LocalDate date) { }

    /** The copy in Spanish and in English. */
    public record Copies(Copy es, Copy en) { }

    public record Copy(String hook, List<Slide> slides, String caption, List<String> hashtags, String altText, String cta,
            String illustration) { }

    public record Slide(String title, String body) { }

    public record Generation(String provider, String model, boolean mock, int attempts, Instant generatedAt, FactCheck factCheck,
            List<String> factCheckIssues, String error) { }

    /** Who reviewed and edited the post; {@code automatic} when the system approved it on its pillar's behalf (#510). */
    public record Review(UUID reviewedBy, String reviewedByEmail, Instant reviewedAt, String reason, UUID editedBy,
            String editedByEmail, boolean automatic) { }

    /**
     * The rendered images: render state and its error, where the shared hero came from (and why the model was not used),
     * the hero URL and the slides of each language.
     */
    public record Media(SocialPostMedia.Status status, SocialPostMedia.Source source, String error, String illustrationReason,
            String heroUrl, SlideSets slides, Instant updatedAt) { }

    /** The slide set of each language; null while a language was never rendered. */
    public record SlideSets(SlideSet es, SlideSet en) { }

    /**
     * One language's slide URLs in deck order and the copy hash they were rendered for. Slides rendered for other copy
     * of that language are not listed (the lists are empty until the new ones are ready).
     */
    public record SlideSet(List<String> instagram, List<String> tiktok, String renderedFor) { }

    /** When publishing started and ended and why the post failed (#510); null until publishing starts. */
    public record Publishing(Instant startedAt, Instant finishedAt, String error) { }

    /**
     * The post's publication on one network (#510): its state, the network's id and public link (none for a TikTok draft),
     * the attempts, the last error and the latest metrics read (null until the first read).
     */
    public record Publication(SocialNetwork network, PublicationStatus status, String externalId, String permalink, int attempts,
            String error, Instant publishedAt, Metrics metrics) { }

    /** When the post goes out on a network (#513 S7): the post time, or that day's not-before time of the network when later. */
    public record NetworkSchedule(SocialNetwork network, Instant publishAt) { }

    /** The latest metrics of a publication; a null figure is one the network does not give. */
    public record Metrics(Long views, Long reach, Long likes, Long comments, Long saves, Long shares, Long follows) { }
}
