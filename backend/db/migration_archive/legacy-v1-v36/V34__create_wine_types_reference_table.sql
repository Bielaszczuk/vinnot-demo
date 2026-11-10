-- V34: Create wine_types reference table
-- Replaces the hardcoded WineType Java enum with a DB-managed catalog.
-- Enables future extensibility without code deployments.

CREATE TABLE IF NOT EXISTS wine_types (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(50)  NOT NULL UNIQUE,
    name_es    VARCHAR(100) NOT NULL,
    name_en    VARCHAR(100) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO wine_types (code, name_es, name_en, sort_order) VALUES
    ('RED',        'Tinto',           'Red',        1),
    ('WHITE',      'Blanco',          'White',      2),
    ('ROSE',       'Rosado',          'Rosé',       3),
    ('SPARKLING',  'Espumante',       'Sparkling',  4),
    ('DESSERT',    'Postres',         'Dessert',    5),
    ('FORTIFIED',  'Fortificado',     'Fortified',  6),
    ('ORANGE',     'Naranja',         'Orange',     7)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE wine_types IS 'Extensible catalog of wine types. Add new rows without deploying code.';

