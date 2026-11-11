package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineImageEmbeddingRepositoryPort;
import com.vinnot.wine.infrastructure.visual.Int8Vectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.BiConsumer;

/** Stores label image embeddings as signed bytes plus a scale (see V91). */
@Component
public class JdbcWineImageEmbeddingRepository implements WineImageEmbeddingRepositoryPort {

    /** Must match the predicate of idx_wines_hosted_label_image (V91). */
    static final String HOSTED_LABEL_IMAGE = "(w.image_url LIKE 'https://images.vinnot.com/%' "
            + "OR w.image_url LIKE '/api/uploads/wine-labels/%')";
    private static final int STREAM_FETCH_SIZE = 500;

    private final JdbcTemplate jdbc;

    public JdbcWineImageEmbeddingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<PendingImage> findPending(String modelId, int dimensions, UUID after, int limit) {
        String sql = "SELECT w.id, w.image_url FROM wines w "
                + "LEFT JOIN wine_image_embeddings e ON e.wine_id = w.id "
                + "WHERE " + HOSTED_LABEL_IMAGE + " AND w.is_active = true "
                + (Objects.isNull(after) ? "" : "AND w.id > ? ")
                + "AND (e.wine_id IS NULL OR e.image_url <> w.image_url OR e.model <> ? OR e.dimensions <> ?) "
                + "ORDER BY w.id LIMIT ?";
        Object[] args = Objects.isNull(after)
                ? new Object[] {modelId, dimensions, limit}
                : new Object[] {after, modelId, dimensions, limit};
        return jdbc.query(sql, (row, index) -> new PendingImage(
                row.getObject("id", UUID.class), row.getString("image_url")), args);
    }

    @Override
    public void save(UUID wineId, String imageUrl, String modelId, float[] vector) {
        Int8Vectors.Quantized quantized = Int8Vectors.quantize(vector, vector.length);
        jdbc.update("""
                INSERT INTO wine_image_embeddings (wine_id, image_url, model, dimensions, scale, embedding, embedded_at)
                VALUES (?, ?, ?, ?, ?, ?, now())
                ON CONFLICT (wine_id) DO UPDATE SET image_url = EXCLUDED.image_url, model = EXCLUDED.model,
                    dimensions = EXCLUDED.dimensions, scale = EXCLUDED.scale, embedding = EXCLUDED.embedding,
                    embedded_at = EXCLUDED.embedded_at
                """, wineId, imageUrl, modelId, vector.length, quantized.scale(), quantized.values());
    }

    @Override
    public void forEachVector(String modelId, int dimensions, BiConsumer<UUID, float[]> consumer) {
        jdbc.query(connection -> {
            var statement = connection.prepareStatement("""
                    SELECT e.wine_id, e.scale, e.embedding FROM wine_image_embeddings e
                    JOIN wines w ON w.id = e.wine_id
                    WHERE w.is_active = true AND e.image_url = w.image_url AND e.model = ? AND e.dimensions = ?
                    """);
            statement.setFetchSize(STREAM_FETCH_SIZE);
            statement.setString(1, modelId);
            statement.setInt(2, dimensions);
            return statement;
        }, row -> {
            consumer.accept(row.getObject("wine_id", UUID.class),
                    Int8Vectors.restore(row.getBytes("embedding"), row.getFloat("scale")));
        });
    }
}
