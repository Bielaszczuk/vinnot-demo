package com.vinnot.engagement.infrastructure;

import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

/** Rows the engagement integration tests need, inserted with only the columns that matter. */
public final class EngagementDatabase {
    private final JdbcTemplate jdbc;

    public EngagementDatabase(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID user(String timeZone, Instant createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,timezone,created_at)"
                        + " VALUES (?,?,?,'fixture','Test','Member',?,?)",
                id, "u-" + id.toString().substring(0, 18), id + "@example.invalid", timeZone, Timestamp.from(createdAt));
        return id;
    }

    public void device(UUID user, Instant seenAt) {
        jdbc.update("INSERT INTO push_devices(token,user_id,platform,locale,last_seen_at) VALUES (?,?,'ANDROID','es',?)",
                "ExpoPushToken[" + UUID.randomUUID() + "]", user, Timestamp.from(seenAt));
    }

    public UUID wine(String name, String type, String grapesJson, Instant createdAt, int ratings, UUID region) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,grapes,created_at,rating_count,rating_average,region_id)"
                        + " VALUES (?,?,?,CAST(? AS jsonb),?,?,4.2,?)",
                id, name, type, grapesJson, Timestamp.from(createdAt), ratings, region);
        return id;
    }

    public void review(UUID user, UUID wine, double rating, Instant at) {
        jdbc.update("INSERT INTO reviews(id,wine_id,user_id,rating,publication_status,created_at) VALUES (?,?,?,?,'APPROVED',?)",
                UUID.randomUUID(), wine, user, rating, Timestamp.from(at));
    }

    public UUID reviewId(UUID user, UUID wine) {
        return jdbc.queryForObject("SELECT id FROM reviews WHERE user_id=? AND wine_id=?", UUID.class, user, wine);
    }

    public void like(UUID review, UUID liker, Instant at) {
        jdbc.update("INSERT INTO review_likes(id,review_id,user_id,created_at) VALUES (?,?,?,?)", UUID.randomUUID(), review, liker,
                Timestamp.from(at));
    }

    public UUID cellar(UUID user, UUID wine, Integer rating, Instant at) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO cellar_wines(id,user_id,wine_id,rating,created_at) VALUES (?,?,?,?,?)", id, user, wine, rating,
                Timestamp.from(at));
        return id;
    }

    public void affinity(UUID user, String kind, String value, String label, double score, int rated) {
        jdbc.update("INSERT INTO user_taste_affinities(user_id,kind,value,label,score,rated_wines,computed_at) VALUES (?,?,?,?,?,?,now())",
                user, kind, value, label, score, rated);
    }

    public void view(UUID user, String kind, UUID entity, int views, Instant at) {
        jdbc.update("INSERT INTO content_views(user_id,kind,entity_id,view_day,views,last_viewed_at) VALUES (?,?,?,?,?,?)",
                user, kind, entity, LocalDate.ofInstant(at, ZoneOffset.UTC), views, Timestamp.from(at));
    }

    public UUID region(String name) {
        String code = UUID.randomUUID().toString().substring(0, 8);
        UUID country = jdbc.queryForObject("INSERT INTO countries(code,name) VALUES (?,?) RETURNING id", UUID.class, code,
                "Country " + code);
        return jdbc.queryForObject("INSERT INTO regions(name,country_id) VALUES (?,?) RETURNING id", UUID.class, name, country);
    }

    public UUID route(String name, String region, String typesJson, UUID createdBy, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wine_routes(id,name,region,recommended_wine_types,created_by,status) VALUES (?,?,?,CAST(? AS jsonb),?,?)",
                id, name, region, typesJson, createdBy, status);
        return id;
    }

    public UUID winery(String name, UUID region, double rating) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wineries(id,name,region_id,ratings_average) VALUES (?,?,?,?)", id, name, region, rating);
        return id;
    }

    public UUID event(String title, UUID organizer, Instant start, Instant end, String region, int attendees) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,location_region,current_attendees,
                    timezone)
                VALUES (?,?,'TASTING',?,?,?,'PUBLISHED',?,?,'America/Argentina/Buenos_Aires')
                """, id, title, Timestamp.from(start), Timestamp.from(end), organizer, region, attendees);
        return id;
    }

    public void register(UUID event, UUID user, String status) {
        jdbc.update("INSERT INTO event_registrations(event_id,user_id,status) VALUES (?,?,?)", event, user, status);
    }

    public void area(UUID user, UUID region) {
        jdbc.update("INSERT INTO user_event_areas(user_id,region_id) VALUES (?,?)", user, region);
    }

    public void sent(UUID user, String type, String key, String contentRef, Instant at, boolean holdout) {
        jdbc.update("INSERT INTO engagement_sends(user_id,dedupe_key,notification_type,content_ref,sent_at,holdout) VALUES (?,?,?,?,?,?)",
                user, key, type, contentRef, Timestamp.from(at), holdout);
    }

    public void active(UUID user, Instant at) {
        jdbc.update("INSERT INTO user_activity(user_id,last_active_at) VALUES (?,?) ON CONFLICT (user_id) DO UPDATE SET last_active_at = ?",
                user, Timestamp.from(at), Timestamp.from(at));
        jdbc.update("INSERT INTO app_opens(user_id,opened_at) VALUES (?,?) ON CONFLICT DO NOTHING", user, Timestamp.from(at));
    }
}
