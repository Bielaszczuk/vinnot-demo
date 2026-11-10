-- V7__create_cellar_table.sql
-- Schema for cellar module

CREATE TABLE cellar_wines (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, wine_id)
);

CREATE INDEX idx_cellar_user ON cellar_wines(user_id);
CREATE INDEX idx_cellar_wine ON cellar_wines(wine_id);

