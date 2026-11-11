-- Visual label retrieval (#544): one image embedding per catalog wine whose label image Vinnot hosts (the
-- catalog CDN or a label uploaded by a member). The backend keeps every vector of the active model in memory and
-- compares a scanned photo with all of them; this table only persists them across restarts and records which image
-- and model produced each vector, so a changed image or model is embedded again.
--
-- embedding holds the vector quantized to signed bytes (one per dimension) and scale the factor that restores it:
-- value = byte * scale. 35k wines at 768 dimensions take about 27 MB.
CREATE TABLE public.wine_image_embeddings (
    wine_id uuid NOT NULL,
    image_url text NOT NULL,
    model character varying(80) NOT NULL,
    dimensions smallint NOT NULL,
    scale real NOT NULL,
    embedding bytea NOT NULL,
    embedded_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wine_image_embeddings_pkey PRIMARY KEY (wine_id),
    CONSTRAINT wine_image_embeddings_wine_id_fkey
        FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE,
    CONSTRAINT wine_image_embeddings_dimensions_check CHECK (dimensions > 0 AND octet_length(embedding) = dimensions)
);

-- The wines whose label image Vinnot hosts, so the backfill finds the images still to embed without reading the
-- whole 1.7M-row catalog. The predicate must stay identical to the one in JdbcWineImageEmbeddingRepository.
CREATE INDEX idx_wines_hosted_label_image ON public.wines (id)
    WHERE image_url LIKE 'https://images.vinnot.com/%' OR image_url LIKE '/api/uploads/wine-labels/%';
