package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.application.port.out.SocialPostRepository;
import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.PostPublishing;
import com.vinnot.marketing.domain.model.PostReview;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPostMedia;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * The {@code social_posts} table (#489): copy (one document per language, {@code {"es": …, "en": …}}, #497), generation
 * and media (#492) are JSONB documents, the review is flat columns. The {@code language} column is no longer written.
 * The render job owns the media: {@link #save} only moves it to another copy hash or a newer illustration version, keeping
 * what the job stored meanwhile, and {@link #saveMedia} writes it only over the exact document the job read. The publishing
 * record (#510) is a JSONB document the post owns, written by every save; {@link #saveIfStatus} writes only over the status
 * and time the caller read, and an approval by the system (#510) only over the exact pending post it read
 * ({@link #saveApprovalIfUnchanged}). The upsert never writes {@code scheduled_for} of a stored post: a reschedule or a
 * publish-now (#513) moves it with {@link #saveScheduleIfUnchanged}, so a save from a copy read earlier never moves it back.
 */
@Component
public class JdbcSocialPostRepository implements SocialPostRepository {
    private static final String COLUMNS = """
            id, status, scheduled_for, pillar_code, wine_day_code, copy::text AS copy, generation::text AS generation,
            media::text AS media, publishing::text AS publishing, reviewed_by, reviewed_at, review_reason, edited_by, created_at, updated_at
            """;
    /**
     * The media a post save leaves, in one statement so it cannot interleave with the render job's compare-and-set. The
     * snapshot only moves the target: new copy hashes (one per language, #497) or a higher illustration version (an older or
     * equal version with the same copy keeps the stored media). It never lowers the illustration version, and the stored
     * hero and each language's stored slides stay when they are of the same or a newer version than the snapshot's,
     * because the job may have written (and cleaned up behind) them after the snapshot was read. The status is then READY
     * only when every targeted language's slides already show its copy hash with the target's version.
     */
    private static final String MEDIA_ON_SAVE = """
            CASE WHEN EXCLUDED.media IS NULL THEN social_posts.media
                WHEN social_posts.media IS NULL THEN EXCLUDED.media
                WHEN social_posts.media -> 'copyHashes' = EXCLUDED.media -> 'copyHashes'
                    AND (EXCLUDED.media ->> 'illustrationVersion')::int <= (social_posts.media ->> 'illustrationVersion')::int
                    THEN social_posts.media
                ELSE (SELECT target.media || jsonb_build_object('status', CASE WHEN NOT EXISTS (
                            SELECT 1 FROM jsonb_each_text(target.media -> 'copyHashes') AS wanted (lang, hash)
                            WHERE (target.media -> 'slides' -> wanted.lang ->> 'copyHash' = wanted.hash
                                AND (target.media -> 'slides' -> wanted.lang ->> 'illustrationVersion')::int
                                    = (target.media ->> 'illustrationVersion')::int) IS NOT TRUE)
                        THEN 'READY' ELSE 'PENDING' END)
                    FROM (SELECT EXCLUDED.media || jsonb_build_object(
                        'illustrationVersion', GREATEST((EXCLUDED.media ->> 'illustrationVersion')::int,
                            (social_posts.media ->> 'illustrationVersion')::int),
                        'illustration', CASE WHEN jsonb_typeof(social_posts.media -> 'illustration') = 'object'
                                AND (jsonb_typeof(EXCLUDED.media -> 'illustration') IS DISTINCT FROM 'object'
                                    OR (social_posts.media -> 'illustration' ->> 'version')::int
                                        >= (EXCLUDED.media -> 'illustration' ->> 'version')::int)
                            THEN social_posts.media -> 'illustration' ELSE EXCLUDED.media -> 'illustration' END,
                        'slides', (SELECT COALESCE(jsonb_object_agg(languages.lang, CASE
                                WHEN jsonb_typeof(social_posts.media -> 'slides' -> languages.lang) = 'object'
                                    AND (jsonb_typeof(EXCLUDED.media -> 'slides' -> languages.lang) IS DISTINCT FROM 'object'
                                        OR (social_posts.media -> 'slides' -> languages.lang ->> 'illustrationVersion')::int
                                            >= (EXCLUDED.media -> 'slides' -> languages.lang ->> 'illustrationVersion')::int)
                                THEN social_posts.media -> 'slides' -> languages.lang
                                ELSE EXCLUDED.media -> 'slides' -> languages.lang END), '{}'::jsonb)
                            FROM (SELECT jsonb_object_keys(CASE WHEN jsonb_typeof(social_posts.media -> 'slides') = 'object'
                                        THEN social_posts.media -> 'slides' ELSE '{}'::jsonb END)
                                UNION SELECT jsonb_object_keys(CASE WHEN jsonb_typeof(EXCLUDED.media -> 'slides') = 'object'
                                        THEN EXCLUDED.media -> 'slides' ELSE '{}'::jsonb END)) AS languages (lang))) AS media) target)
            END""";
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public JdbcSocialPostRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @Override
    public void save(SocialPost post) {
        upsert(post, "", List.of());
    }

    @Override
    public boolean saveIfStatus(SocialPost post, SocialPostStatus expected) {
        return upsert(post, " WHERE social_posts.status = ? AND social_posts.scheduled_for = ?",
                List.of(expected.name(), Timestamp.from(post.scheduledFor()))) == 1;
    }

    @Override
    public boolean saveScheduleIfUnchanged(SocialPost post, SocialPostStatus expectedStatus, Instant expectedScheduledFor) {
        return jdbc.update("UPDATE social_posts SET scheduled_for = ?, updated_at = ? WHERE id = ? AND status = ? AND scheduled_for = ?",
                Timestamp.from(post.scheduledFor()), Timestamp.from(post.updatedAt()), post.id(), expectedStatus.name(),
                Timestamp.from(expectedScheduledFor)) == 1;
    }

    /** Inserts the post or updates the stored one, only where {@code condition} (on the stored row) holds. */
    private int upsert(SocialPost post, String condition, List<Object> conditionArguments) {
        PostReview review = post.review();
        List<Object> arguments = new ArrayList<>(Arrays.asList(post.id(), post.status().name(), Timestamp.from(post.scheduledFor()),
                post.pillarCode(), post.wineDayCode(), copiesJson(post.copies()), generationJson(post.generation()),
                mediaJson(post.media()), publishingJson(post.publishing()), Objects.isNull(review) ? null : review.reviewedBy(),
                Objects.isNull(review) || Objects.isNull(review.reviewedAt()) ? null : Timestamp.from(review.reviewedAt()),
                Objects.isNull(review) ? null : review.reason(), Objects.isNull(review) ? null : review.editedBy(),
                Timestamp.from(post.createdAt()), Timestamp.from(post.updatedAt())));
        arguments.addAll(conditionArguments);
        return jdbc.update("""
                INSERT INTO social_posts (id, status, scheduled_for, pillar_code, wine_day_code, copy, generation, media, publishing,
                    reviewed_by, reviewed_at, review_reason, edited_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, copy = EXCLUDED.copy, generation = EXCLUDED.generation,
                    media = %s, publishing = EXCLUDED.publishing,
                    reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at, review_reason = EXCLUDED.review_reason,
                    edited_by = EXCLUDED.edited_by, updated_at = EXCLUDED.updated_at
                """.formatted(MEDIA_ON_SAVE) + condition, arguments.toArray());
    }

    @Override
    public boolean saveMedia(UUID postId, SocialPostMedia expected, SocialPostMedia next) {
        return jdbc.update("UPDATE social_posts SET media = CAST(? AS jsonb) WHERE id = ? AND media IS NOT DISTINCT FROM CAST(? AS jsonb)",
                mediaJson(Objects.requireNonNull(next, "next")), postId, mediaJson(expected)) == 1;
    }

    @Override
    public boolean saveApprovalIfUnchanged(SocialPost post, Instant expectedUpdatedAt, SocialPostMedia expectedMedia) {
        PostReview review = post.review();
        return jdbc.update("""
                UPDATE social_posts SET status = ?, reviewed_by = ?, reviewed_at = ?, review_reason = ?, edited_by = ?, updated_at = ?
                WHERE id = ? AND status = 'PENDING_APPROVAL' AND updated_at = ? AND media IS NOT DISTINCT FROM CAST(? AS jsonb)
                """, post.status().name(), Objects.isNull(review) ? null : review.reviewedBy(),
                Objects.isNull(review) || Objects.isNull(review.reviewedAt()) ? null : Timestamp.from(review.reviewedAt()),
                Objects.isNull(review) ? null : review.reason(), Objects.isNull(review) ? null : review.editedBy(),
                Timestamp.from(post.updatedAt()), post.id(), Timestamp.from(expectedUpdatedAt), mediaJson(expectedMedia)) == 1;
    }

    @Override
    public List<SocialPost> findAwaitingMedia(Instant from, int limit) {
        return jdbc.query("SELECT " + COLUMNS + """
                 FROM social_posts WHERE copy IS NOT NULL AND status IN ('PENDING_APPROVAL', 'APPROVED', 'SCHEDULED')
                 AND scheduled_for >= ? AND (media IS NULL OR media ->> 'status' = 'PENDING') ORDER BY scheduled_for LIMIT ?
                """, this::post, Timestamp.from(from), limit);
    }

    @Override
    public List<SocialPost> findDueForPublishing(Instant after, Instant now, int limit) {
        return jdbc.query("SELECT " + COLUMNS + """
                 FROM social_posts WHERE status = 'APPROVED' AND scheduled_for > ? AND scheduled_for <= ? ORDER BY scheduled_for LIMIT ?
                """, this::post, Timestamp.from(after), Timestamp.from(now), limit);
    }

    @Override
    public Optional<SocialPost> findById(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM social_posts WHERE id = ?", this::post, id).stream().findFirst();
    }

    @Override
    public List<SocialPost> findScheduledBetween(Instant from, Instant to) {
        return jdbc.query("SELECT " + COLUMNS + " FROM social_posts WHERE scheduled_for >= ? AND scheduled_for <= ? ORDER BY scheduled_for",
                this::post, Timestamp.from(from), Timestamp.from(to));
    }

    @Override
    public List<SocialPost> findByStatus(SocialPostStatus status, int limit) {
        return jdbc.query("SELECT " + COLUMNS + " FROM social_posts WHERE status = ? ORDER BY scheduled_for LIMIT ?", this::post,
                status.name(), limit);
    }

    @Override
    public PageResult<SocialPost> search(SocialPostStatus status, Instant from, Instant to, int page, int size) {
        StringBuilder where = new StringBuilder(" WHERE TRUE");
        List<Object> arguments = new ArrayList<>();
        if (Objects.nonNull(status)) {
            where.append(" AND status = ?");
            arguments.add(status.name());
        }
        if (Objects.nonNull(from)) {
            where.append(" AND scheduled_for >= ?");
            arguments.add(Timestamp.from(from));
        }
        if (Objects.nonNull(to)) {
            where.append(" AND scheduled_for <= ?");
            arguments.add(Timestamp.from(to));
        }
        Long total = jdbc.queryForObject("SELECT count(*) FROM social_posts" + where, Long.class, arguments.toArray());
        List<Object> pageArguments = new ArrayList<>(arguments);
        pageArguments.add(size);
        pageArguments.add((long) page * size);
        List<SocialPost> content = jdbc.query("SELECT " + COLUMNS + " FROM social_posts" + where + " ORDER BY scheduled_for LIMIT ? OFFSET ?",
                this::post, pageArguments.toArray());
        return PageResult.of(content, page, size, Objects.requireNonNullElse(total, 0L));
    }

    private SocialPost post(ResultSet row, int index) throws SQLException {
        Timestamp reviewedAt = row.getTimestamp("reviewed_at");
        UUID reviewedBy = row.getObject("reviewed_by", UUID.class);
        UUID editedBy = row.getObject("edited_by", UUID.class);
        String reason = row.getString("review_reason");
        PostReview review = Objects.isNull(reviewedBy) && Objects.isNull(editedBy) && Objects.isNull(reason) ? null
                : new PostReview(reviewedBy, Objects.isNull(reviewedAt) ? null : reviewedAt.toInstant(), reason, editedBy);
        return SocialPost.restore(row.getObject("id", UUID.class), SocialPostStatus.valueOf(row.getString("status")),
                row.getTimestamp("scheduled_for").toInstant(), row.getString("pillar_code"), row.getString("wine_day_code"),
                copies(row.getString("copy")), generation(row.getString("generation")), review, media(row.getString("media")),
                publishing(row.getString("publishing")), row.getTimestamp("created_at").toInstant(),
                row.getTimestamp("updated_at").toInstant());
    }

    private String copiesJson(PostCopies copies) {
        if (Objects.isNull(copies)) {
            return null;
        }
        Map<String, Object> json = new LinkedHashMap<>();
        copies.languages().forEach(language -> json.put(language.code(), copyJson(copies.get(language))));
        return mapper.writeValueAsString(json);
    }

    private static Map<String, Object> copyJson(PostCopy copy) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("hook", copy.hook());
        json.put("slides", copy.slides().stream().map(slide -> Map.of("title", slide.title(), "body", slide.body())).toList());
        json.put("caption", copy.caption());
        json.put("hashtags", copy.hashtags());
        json.put("altText", copy.altText());
        json.put("cta", copy.cta());
        if (Objects.nonNull(copy.illustration())) {
            json.put("illustration", copy.illustration());
        }
        return json;
    }

    private PostCopies copies(String json) {
        if (Objects.isNull(json)) {
            return null;
        }
        Map<String, Object> map = read(json);
        return new PostCopies(copy(map.get(PostLanguage.ES.code())), copy(map.get(PostLanguage.EN.code())));
    }

    private static PostCopy copy(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            return null;
        }
        List<PostCopy.Slide> slides = ((List<?>) map.get("slides")).stream().map(slide -> (Map<?, ?>) slide)
                .map(slide -> new PostCopy.Slide((String) slide.get("title"), (String) slide.get("body"))).toList();
        List<String> hashtags = ((List<?>) map.get("hashtags")).stream().map(String::valueOf).toList();
        return new PostCopy((String) map.get("hook"), slides, (String) map.get("caption"), hashtags, (String) map.get("altText"),
                (String) map.get("cta"), (String) map.get("illustration"));
    }

    private String generationJson(GenerationInfo generation) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("provider", generation.provider());
        json.put("model", generation.model());
        json.put("mock", generation.mock());
        json.put("attempts", generation.attempts());
        json.put("generatedAt", Objects.isNull(generation.generatedAt()) ? null : generation.generatedAt().toString());
        json.put("factCheck", Objects.isNull(generation.factCheck()) ? null : generation.factCheck().name());
        json.put("factCheckIssues", generation.factCheckIssues());
        json.put("error", generation.error());
        return mapper.writeValueAsString(json);
    }

    private GenerationInfo generation(String json) {
        if (Objects.isNull(json)) {
            return GenerationInfo.none();
        }
        Map<String, Object> map = read(json);
        Object issues = map.get("factCheckIssues");
        return new GenerationInfo((String) map.get("provider"), (String) map.get("model"), Boolean.TRUE.equals(map.get("mock")),
                ((Number) Objects.requireNonNullElse(map.get("attempts"), 0)).intValue(),
                Objects.isNull(map.get("generatedAt")) ? null : Instant.parse((String) map.get("generatedAt")),
                Objects.isNull(map.get("factCheck")) ? null : FactCheck.valueOf((String) map.get("factCheck")),
                issues instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of(), (String) map.get("error"));
    }

    private String mediaJson(SocialPostMedia media) {
        if (Objects.isNull(media)) {
            return null;
        }
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("status", media.status().name());
        Map<String, Object> hashes = new LinkedHashMap<>();
        media.copyHashes().forEach((language, hash) -> hashes.put(language.code(), hash));
        json.put("copyHashes", hashes);
        json.put("illustrationVersion", media.illustrationVersion());
        json.put("attempts", media.attempts());
        json.put("error", media.error());
        json.put("updatedAt", instant(media.updatedAt()));
        SocialPostMedia.Illustration illustration = media.illustration();
        if (Objects.isNull(illustration)) {
            json.put("illustration", null);
        } else {
            Map<String, Object> hero = new LinkedHashMap<>();
            hero.put("version", illustration.version());
            hero.put("subject", illustration.subject());
            hero.put("source", illustration.source().name());
            hero.put("image", imageJson(illustration.image()));
            hero.put("reason", illustration.reason());
            json.put("illustration", hero);
        }
        Map<String, Object> slides = new LinkedHashMap<>();
        media.slides().forEach((language, set) -> {
            Map<String, Object> rendered = new LinkedHashMap<>();
            rendered.put("copyHash", set.copyHash());
            rendered.put("illustrationVersion", set.illustrationVersion());
            rendered.put("instagram", set.instagram().stream().map(JdbcSocialPostRepository::imageJson).toList());
            rendered.put("tiktok", set.tiktok().stream().map(JdbcSocialPostRepository::imageJson).toList());
            rendered.put("renderedAt", instant(set.renderedAt()));
            slides.put(language.code(), rendered);
        });
        json.put("slides", slides);
        return mapper.writeValueAsString(json);
    }

    private SocialPostMedia media(String json) {
        if (Objects.isNull(json)) {
            return null;
        }
        Map<String, Object> map = read(json);
        SocialPostMedia.Illustration illustration = null;
        if (map.get("illustration") instanceof Map<?, ?> hero) {
            illustration = new SocialPostMedia.Illustration(number(hero.get("version")), (String) hero.get("subject"),
                    SocialPostMedia.Source.valueOf((String) hero.get("source")), imageOf(hero.get("image")), (String) hero.get("reason"));
        }
        Map<PostLanguage, String> hashes = new EnumMap<>(PostLanguage.class);
        Map<PostLanguage, SocialPostMedia.Slides> slides = new EnumMap<>(PostLanguage.class);
        for (PostLanguage language : PostLanguage.values()) {
            if (map.get("copyHashes") instanceof Map<?, ?> targets && targets.get(language.code()) instanceof String hash) {
                hashes.put(language, hash);
            }
            if (map.get("slides") instanceof Map<?, ?> sets && sets.get(language.code()) instanceof Map<?, ?> rendered) {
                slides.put(language, new SocialPostMedia.Slides((String) rendered.get("copyHash"), number(rendered.get("illustrationVersion")),
                        images(rendered.get("instagram")), images(rendered.get("tiktok")), instant(rendered.get("renderedAt"))));
            }
        }
        return new SocialPostMedia(SocialPostMedia.Status.valueOf((String) map.get("status")), hashes,
                number(map.get("illustrationVersion")), number(map.get("attempts")), (String) map.get("error"), illustration, slides,
                instant(map.get("updatedAt")));
    }

    private String publishingJson(PostPublishing publishing) {
        if (Objects.isNull(publishing)) {
            return null;
        }
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("startedAt", instant(publishing.startedAt()));
        json.put("finishedAt", instant(publishing.finishedAt()));
        json.put("error", publishing.error());
        return mapper.writeValueAsString(json);
    }

    private PostPublishing publishing(String json) {
        if (Objects.isNull(json)) {
            return null;
        }
        Map<String, Object> map = read(json);
        return new PostPublishing(instant(map.get("startedAt")), instant(map.get("finishedAt")), (String) map.get("error"));
    }

    private static Map<String, Object> imageJson(SocialPostMedia.Image image) {
        if (Objects.isNull(image)) {
            return null;
        }
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("key", image.key());
        json.put("url", image.url());
        return json;
    }

    private static SocialPostMedia.Image imageOf(Object value) {
        return value instanceof Map<?, ?> image ? new SocialPostMedia.Image((String) image.get("key"), (String) image.get("url")) : null;
    }

    private static List<SocialPostMedia.Image> images(Object value) {
        return value instanceof List<?> list ? list.stream().map(JdbcSocialPostRepository::imageOf).toList() : List.of();
    }

    private static int number(Object value) {
        return ((Number) Objects.requireNonNullElse(value, 0)).intValue();
    }

    private static String instant(Instant value) {
        return Objects.isNull(value) ? null : value.toString();
    }

    private static Instant instant(Object value) {
        return Objects.isNull(value) ? null : Instant.parse((String) value);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> read(String json) {
        return mapper.readValue(json, Map.class);
    }
}
