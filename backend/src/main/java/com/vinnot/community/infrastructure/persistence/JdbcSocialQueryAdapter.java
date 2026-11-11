package com.vinnot.community.infrastructure.persistence;

import com.vinnot.community.application.port.out.SocialQueryPort;
import com.vinnot.community.domain.model.CellarVisibility;
import com.vinnot.community.domain.model.TasteScore;
import com.vinnot.community.domain.model.TasteTrait;
import com.vinnot.community.domain.model.TasteWheel.CatalogGrape;
import com.vinnot.community.domain.model.TasteWheel.RatedWine;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Social reads over users, follows, blocks, reviews, wines, regions, the grape catalog, cellars and the nightly
 * taste table. Reviews are approved ones on active wines and members are active ones, in counts and lists alike.
 */
@Component
@RequiredArgsConstructor
public class JdbcSocialQueryAdapter implements SocialQueryPort {
    /** Members the viewer blocked or who blocked the viewer; binds the viewer twice. */
    private static final String NOT_BLOCKED_WITH_VIEWER = " NOT EXISTS (SELECT 1 FROM user_blocks b WHERE"
            + " (b.blocker_id=?::uuid AND b.blocked_id=%1$s) OR (b.blocker_id=%1$s AND b.blocked_id=?::uuid))";
    private static final String APPROVED_REVIEWS_OF = "SELECT count(*) FROM reviews r JOIN wines w ON w.id=r.wine_id"
            + " AND w.is_active WHERE r.user_id=%s AND r.publication_status='APPROVED'";
    private static final String MEMBER_FACTS = """
            SELECT u.cellar_visibility,
                   EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id=?::uuid AND f.followee_id=u.id) AS viewer_follows,
                   EXISTS(SELECT 1 FROM user_follows f WHERE f.follower_id=u.id AND f.followee_id=?::uuid) AS follows_viewer,
                   (SELECT count(*) FROM user_follows f JOIN users m ON m.id=f.follower_id AND m.active
                     WHERE f.followee_id=u.id) AS followers,
                   (SELECT count(*) FROM user_follows f JOIN users m ON m.id=f.followee_id AND m.active
                     WHERE f.follower_id=u.id) AS following,
                   (%s) AS reviews,
                   (SELECT count(*) FROM cellar_wines c JOIN wines w ON w.id=c.wine_id AND w.is_active
                     WHERE c.user_id=u.id) AS cellar_wines
            FROM users u WHERE u.id=? AND u.active
            """.formatted(APPROVED_REVIEWS_OF.formatted("u.id"));
    private static final String MEMBER_COLUMNS = "m.id,m.username,m.first_name,m.last_name,m.profile_image_url,"
            + "EXISTS(SELECT 1 FROM user_follows v WHERE v.follower_id=?::uuid AND v.followee_id=m.id) AS viewer_follows";
    private static final String REVIEW_COLUMNS = "r.id AS review_id,r.rating,r.title,r.comment,r.vintage,r.created_at,"
            + "u.id AS reviewer_id,u.username,u.first_name,u.last_name,u.profile_image_url,"
            + "w.id AS wine_id,w.name AS wine_name,w.image_url,w.wine_type,y.name AS winery_name";
    private static final String REVIEW_JOINS = " JOIN users u ON u.id=r.user_id AND u.active"
            + " JOIN wines w ON w.id=r.wine_id AND w.is_active LEFT JOIN wineries y ON y.id=w.winery_id";
    /**
     * Candidates with enough rated wines, their dot product with the viewer's taste vector and both vector lengths.
     * The ranking rounds the cosine like {@code TasteProfile.percent}, so equal percentages fall back to reviews.
     */
    private static final String SUGGESTIONS = """
            WITH mine AS (
                SELECT kind, value, score::float8 AS score FROM user_taste_affinities WHERE user_id=?
            ), viewer_norm AS (
                SELECT COALESCE(sqrt(sum(score * score)), 0) AS norm FROM mine
            ), candidates AS (
                SELECT t.user_id FROM user_taste_affinities t WHERE t.kind='TYPE' AND t.user_id<>?
                GROUP BY t.user_id HAVING sum(t.rated_wines) >= ?
            ), scored AS (
                SELECT c.user_id,
                       COALESCE((SELECT sum(t.score::float8 * mine.score) FROM user_taste_affinities t
                                 JOIN mine ON mine.kind=t.kind AND mine.value=t.value WHERE t.user_id=c.user_id), 0) AS dot,
                       (SELECT sqrt(sum(t.score::float8 * t.score::float8)) FROM user_taste_affinities t
                         WHERE t.user_id=c.user_id) AS norm
                FROM candidates c
            )
            SELECT u.id,u.username,u.first_name,u.last_name,u.profile_image_url,s.dot,s.norm,vn.norm AS viewer_norm,
                   (%s) AS reviews
            FROM scored s JOIN users u ON u.id=s.user_id AND u.active CROSS JOIN viewer_norm vn
            WHERE NOT EXISTS (SELECT 1 FROM user_follows f WHERE f.follower_id=? AND f.followee_id=u.id)
              AND %s
            ORDER BY CASE WHEN ? THEN
                       CASE WHEN s.norm > 0 AND vn.norm > 0
                            THEN round((100 * LEAST(GREATEST(s.dot / (s.norm * vn.norm), 0), 1))::numeric) ELSE 0 END
                     END DESC NULLS LAST,
                     reviews DESC, u.id
            LIMIT ?
            """.formatted(APPROVED_REVIEWS_OF.formatted("u.id"), NOT_BLOCKED_WITH_VIEWER.formatted("u.id"));

    /**
     * The member's most recent liked wines, each with its catalog structure scores and one of its AI profiles (any
     * language): the profile's numeric palate scores and its primary and secondary aromas and flavors. The rated rows
     * are the taste table's: non-rejected reviews and the cellar ratings of wines without one.
     */
    private static final String LIKED_WINES = """
            WITH rated AS (
                SELECT r.wine_id, r.rating::numeric AS rating, r.created_at AS rated_at FROM reviews r
                WHERE r.user_id=? AND r.publication_status <> 'REJECTED'
                UNION ALL
                SELECT c.wine_id, c.rating_decimal::numeric, c.created_at FROM cellar_wines c
                WHERE c.user_id=? AND c.rating_decimal IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM reviews r WHERE r.user_id=c.user_id AND r.wine_id=c.wine_id
                    AND r.publication_status <> 'REJECTED')
            ), liked AS (
                SELECT wine_id, rating, rated_at FROM rated WHERE rating >= ?
                ORDER BY rated_at DESC NULLS LAST, wine_id LIMIT ?
            )
            SELECT l.rating, w.acidity_score, w.body_score, w.tannin_score, w.sweetness_score,
                   p.profile_json IS NOT NULL AS profiled, %s,
                   ARRAY(SELECT x.item #>> '{}'
                         FROM (VALUES (p.profile_json->'aromaticProfile'->'primaryAromas'),
                                      (p.profile_json->'aromaticProfile'->'secondaryAromas'),
                                      (p.profile_json->'flavorProfile'->'primaryFlavors'),
                                      (p.profile_json->'flavorProfile'->'secondaryFlavors')) v(list)
                         CROSS JOIN LATERAL jsonb_array_elements(
                             CASE WHEN jsonb_typeof(v.list)='array' THEN v.list ELSE '[]'::jsonb END) x(item)
                         WHERE jsonb_typeof(x.item)='string') AS descriptors
            FROM liked l JOIN wines w ON w.id=l.wine_id
            LEFT JOIN LATERAL (SELECT a.profile_json FROM wine_ai_profiles a WHERE a.wine_id=w.id
                               ORDER BY a.updated_at DESC NULLS LAST, a.language LIMIT 1) p ON true
            ORDER BY l.rated_at DESC NULLS LAST, l.wine_id
            """.formatted(String.join(", ", Stream.of("acidity", "body", "tannin", "sweetness")
                    .map(trait -> ("CASE WHEN jsonb_typeof(p.profile_json->'palateAnalysis'->'%1$sScore')='number'"
                            + " THEN (p.profile_json->'palateAnalysis'->>'%1$sScore')::float8 END AS ai_%1$s")
                            .formatted(trait)).toList()));

    /**
     * Every rated wine of the member with its type, region and grapes; the rated rows and the grape filter (non-blank,
     * at most 120 characters) are the taste table's, so the wheel reads the same ratings as the nightly job.
     */
    private static final String RATED_WINES = """
            WITH rated AS (
                SELECT r.wine_id, r.rating::numeric AS rating FROM reviews r
                WHERE r.user_id=? AND r.publication_status <> 'REJECTED'
                UNION ALL
                SELECT c.wine_id, c.rating_decimal::numeric FROM cellar_wines c
                WHERE c.user_id=? AND c.rating_decimal IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM reviews r WHERE r.user_id=c.user_id AND r.wine_id=c.wine_id
                    AND r.publication_status <> 'REJECTED')
            )
            SELECT rated.rating, upper(trim(w.wine_type)) AS wine_type, w.region_id, g.name AS region_name,
                   ARRAY(SELECT trim(x.name) FROM jsonb_array_elements_text(
                             CASE WHEN jsonb_typeof(w.grapes)='array' THEN w.grapes ELSE '[]'::jsonb END) x(name)
                         WHERE trim(x.name) <> '' AND length(trim(x.name)) <= 120) AS grapes
            FROM rated JOIN wines w ON w.id=rated.wine_id LEFT JOIN regions g ON g.id=w.region_id
            ORDER BY w.id
            """;

    private final JdbcTemplate jdbc;

    @Override
    public boolean isActiveMember(UUID userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM users WHERE id=? AND active)", Boolean.class, userId));
    }

    @Override
    public Optional<MemberFacts> memberFacts(UUID userId, UUID viewer) {
        return jdbc.query(MEMBER_FACTS, (row, index) -> new MemberFacts(
                CellarVisibility.fromStored(row.getString("cellar_visibility")),
                row.getBoolean("viewer_follows"), row.getBoolean("follows_viewer"), row.getLong("followers"),
                row.getLong("following"), row.getLong("reviews"), row.getLong("cellar_wines")),
                viewer, viewer, userId).stream().findFirst();
    }

    @Override
    public PageResult<MemberRow> followers(UUID userId, UUID viewer, PageQuery page) {
        return members("f.follower_id", "f.followee_id", userId, viewer, page);
    }

    @Override
    public PageResult<MemberRow> following(UUID userId, UUID viewer, PageQuery page) {
        return members("f.followee_id", "f.follower_id", userId, viewer, page);
    }

    @Override
    public List<SuggestionRow> suggestions(UUID viewer, boolean rankByAffinity, int minRatedWines, int limit) {
        return jdbc.query(SUGGESTIONS, (row, index) -> new SuggestionRow(row.getObject("id", UUID.class),
                row.getString("username"), row.getString("first_name"), row.getString("last_name"),
                row.getString("profile_image_url"), row.getDouble("dot"), row.getDouble("norm"),
                row.getDouble("viewer_norm"), row.getLong("reviews")),
                viewer, viewer, minRatedWines, viewer, viewer, viewer, rankByAffinity, limit);
    }

    @Override
    public PageResult<ReviewRow> feed(UUID viewer, PageQuery page) {
        String from = " FROM reviews r JOIN user_follows f ON f.followee_id=r.user_id AND f.follower_id=?"
                + REVIEW_JOINS + " WHERE r.publication_status='APPROVED' AND"
                + NOT_BLOCKED_WITH_VIEWER.formatted("r.user_id");
        return page(REVIEW_COLUMNS, from, " ORDER BY r.created_at DESC, r.id", JdbcSocialQueryAdapter::review, page,
                List.of(), Arrays.asList(viewer, viewer, viewer));
    }

    @Override
    public PageResult<ReviewRow> reviewsBy(UUID userId, PageQuery page) {
        String from = " FROM reviews r" + REVIEW_JOINS + " WHERE r.user_id=? AND r.publication_status='APPROVED'";
        return page(REVIEW_COLUMNS, from, " ORDER BY r.created_at DESC, r.id", JdbcSocialQueryAdapter::review, page,
                List.of(), List.of(userId));
    }

    @Override
    public PageResult<CellarRow> cellar(UUID userId, PageQuery page) {
        String from = " FROM cellar_wines c JOIN wines w ON w.id=c.wine_id AND w.is_active"
                + " LEFT JOIN wineries y ON y.id=w.winery_id WHERE c.user_id=?";
        return page("c.id,c.vintage,c.rating_decimal,c.created_at,w.id AS wine_id,w.name AS wine_name,w.image_url,"
                        + "w.wine_type,y.name AS winery_name", from, " ORDER BY c.created_at DESC, c.id",
                (row, index) -> new CellarRow(row.getObject("id", UUID.class), wine(row),
                        row.getObject("vintage", Integer.class), row.getBigDecimal("rating_decimal"),
                        row.getTimestamp("created_at").toInstant()),
                page, List.of(), List.of(userId));
    }

    @Override
    public Map<UUID, List<TasteScore>> tastes(Collection<UUID> userIds) {
        Map<UUID, List<TasteScore>> tastes = new LinkedHashMap<>();
        if (userIds.isEmpty()) {
            return tastes;
        }
        jdbc.query("SELECT user_id,kind,value,label,score,rated_wines FROM user_taste_affinities WHERE user_id = ANY (?)",
                row -> {
                    tastes.computeIfAbsent(row.getObject("user_id", UUID.class), id -> new ArrayList<>())
                            .add(new TasteScore(TasteScore.Kind.valueOf(row.getString("kind")), row.getString("value"),
                                    row.getString("label"), row.getBigDecimal("score"), row.getInt("rated_wines")));
                },
                (Object) userIds.toArray(UUID[]::new));
        return tastes;
    }

    @Override
    public List<LikedWineRow> likedWines(UUID userId, BigDecimal minRating, int limit) {
        return jdbc.query(LIKED_WINES, (row, index) -> {
            Map<TasteTrait, Double> catalog = new EnumMap<>(TasteTrait.class);
            Map<TasteTrait, Double> profile = new EnumMap<>(TasteTrait.class);
            for (TasteTrait trait : TasteTrait.values()) {
                String column = trait.name().toLowerCase(Locale.ROOT);
                putScore(catalog, trait, row.getObject(column + "_score", Integer.class));
                putScore(profile, trait, row.getObject("ai_" + column, Double.class));
            }
            return new LikedWineRow(row.getBigDecimal("rating"), catalog, profile, row.getBoolean("profiled"),
                    strings(row.getArray("descriptors")));
        }, userId, userId, minRating, limit);
    }

    @Override
    public List<RatedWine> ratedWines(UUID userId) {
        return jdbc.query(RATED_WINES, (row, index) -> new RatedWine(row.getBigDecimal("rating"),
                row.getString("wine_type"), strings(row.getArray("grapes")),
                Objects.toString(row.getObject("region_id", UUID.class), null), row.getString("region_name")),
                userId, userId);
    }

    @Override
    public List<CatalogGrape> grapeCatalog() {
        return jdbc.query("SELECT name,name_es,category FROM grape_types ORDER BY name, id", (row, index) ->
                new CatalogGrape(row.getString("name"), row.getString("name_es"), row.getString("category")));
    }

    private static void putScore(Map<TasteTrait, Double> scores, TasteTrait trait, Number score) {
        if (Objects.nonNull(score)) {
            scores.put(trait, score.doubleValue());
        }
    }

    private static List<String> strings(Array array) throws SQLException {
        if (Objects.isNull(array)) {
            return List.of();
        }
        Object[] values = (Object[]) array.getArray();
        return Arrays.stream(values).filter(String.class::isInstance).map(String.class::cast).toList();
    }

    /**
     * One page of followers or followed members of {@code userId}, newest follow first.
     *
     * @param member the follow column of the listed members
     * @param owner  the follow column of {@code userId}
     */
    private PageResult<MemberRow> members(String member, String owner, UUID userId, UUID viewer, PageQuery page) {
        String from = " FROM user_follows f JOIN users m ON m.id=" + member + " AND m.active WHERE " + owner + "=? AND"
                + NOT_BLOCKED_WITH_VIEWER.formatted("m.id");
        return page(MEMBER_COLUMNS, from, " ORDER BY f.created_at DESC, m.id",
                (row, index) -> new MemberRow(row.getObject("id", UUID.class), row.getString("username"),
                        row.getString("first_name"), row.getString("last_name"), row.getString("profile_image_url"),
                        row.getBoolean("viewer_follows")),
                page, Arrays.asList(viewer), Arrays.asList(userId, viewer, viewer));
    }

    /**
     * Counts and reads one page of a listing.
     *
     * @param selectArgs parameters of the select list, bound before {@code fromArgs} on the page read only
     * @param fromArgs   parameters of the FROM and WHERE clauses
     */
    private <T> PageResult<T> page(String columns, String from, String order, RowMapper<T> mapper, PageQuery page,
            List<Object> selectArgs, List<Object> fromArgs) {
        Long total = jdbc.queryForObject("SELECT count(*)" + from, Long.class, fromArgs.toArray());
        Object[] args = Stream.of(selectArgs, fromArgs, List.<Object>of(page.size(), (long) page.page() * page.size()))
                .flatMap(List::stream).toArray();
        List<T> rows = jdbc.query("SELECT " + columns + from + order + " LIMIT ? OFFSET ?", mapper, args);
        return PageResult.of(rows, page.page(), page.size(), total);
    }

    private static ReviewRow review(ResultSet row, int index) throws SQLException {
        return new ReviewRow(row.getObject("review_id", UUID.class), row.getBigDecimal("rating"), row.getString("title"),
                row.getString("comment"), row.getObject("vintage", Integer.class),
                row.getTimestamp("created_at").toInstant(), row.getObject("reviewer_id", UUID.class),
                row.getString("username"), row.getString("first_name"), row.getString("last_name"),
                row.getString("profile_image_url"), wine(row));
    }

    private static WineRow wine(ResultSet row) throws SQLException {
        return new WineRow(row.getObject("wine_id", UUID.class), row.getString("wine_name"), row.getString("image_url"),
                row.getString("wine_type"), row.getString("winery_name"));
    }
}
