-- V31: Create event_types reference table
-- Replaces the hardcoded EventType Java enum with a DB-managed catalog.

CREATE TABLE event_types (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(50)  NOT NULL UNIQUE,
    name_es    VARCHAR(100) NOT NULL,
    name_en    VARCHAR(100) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO event_types (code, name_es, name_en, sort_order) VALUES
    ('TASTING',     'Degustación',   'Tasting',     1),
    ('FESTIVAL',    'Festival',      'Festival',    2),
    ('TOUR',        'Visita',        'Tour',        3),
    ('WORKSHOP',    'Taller',        'Workshop',    4),
    ('CLASS',       'Clase',         'Class',       5),
    ('DINNER',      'Cena maridaje', 'Wine Dinner', 6),
    ('PAIRING',     'Maridaje',      'Pairing',     7),
    ('COMPETITION', 'Concurso',      'Competition', 8),
    ('FAIR',        'Feria',         'Fair',        9),
    ('HARVEST',     'Vendimia',      'Harvest',     10),
    ('OTHER',       'Otro',          'Other',       99);

COMMENT ON TABLE event_types IS 'Extensible catalog of event types. Add new rows without deploying code.';

