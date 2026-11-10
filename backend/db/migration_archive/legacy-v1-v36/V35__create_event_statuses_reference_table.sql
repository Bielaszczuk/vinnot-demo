-- V35: Create event_statuses reference table
-- Replaces the hardcoded EventStatusEnum Java enum with a DB-managed catalog.

CREATE TABLE IF NOT EXISTS event_statuses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name_es     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL,
    is_terminal BOOLEAN      NOT NULL DEFAULT FALSE,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO event_statuses (code, name_es, name_en, is_terminal, sort_order) VALUES
    ('DRAFT',      'Borrador',   'Draft',      FALSE, 1),
    ('PUBLISHED',  'Publicado',  'Published',  FALSE, 2),
    ('CANCELLED',  'Cancelado',  'Cancelled',  TRUE,  3),
    ('POSTPONED',  'Postergado', 'Postponed',  FALSE, 4),
    ('SOLD_OUT',   'Agotado',    'Sold Out',   FALSE, 5),
    ('COMPLETED',  'Completado', 'Completed',  TRUE,  6)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE event_statuses IS 'Extensible catalog of event statuses. is_terminal flags end states.';

