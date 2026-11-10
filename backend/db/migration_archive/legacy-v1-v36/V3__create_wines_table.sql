-- V3__create_wines_table.sql
-- Schema for wines module

CREATE TABLE wines (
    id UUID PRIMARY KEY,
    winery_id UUID REFERENCES wineries(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    vintage INTEGER,
    wine_type VARCHAR(50) NOT NULL,
    style VARCHAR(100),
    grapes JSONB,
    allergens JSONB,
    description_es TEXT,
    description_en TEXT,
    alcohol_content DECIMAL(4, 2),
    serving_temp_min INTEGER,
    serving_temp_max INTEGER,
    price_min DECIMAL(10, 2),
    price_max DECIMAL(10, 2),
    image_url VARCHAR(500),
    rating_average DECIMAL(3, 2) NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wines_name ON wines(name);
CREATE INDEX idx_wines_winery_id ON wines(winery_id);
CREATE INDEX idx_wines_wine_type ON wines(wine_type);
CREATE INDEX idx_wines_vintage ON wines(vintage);
CREATE INDEX idx_wines_featured ON wines(is_featured);
CREATE INDEX idx_wines_active ON wines(is_active);
CREATE INDEX idx_wines_rating ON wines(rating_average DESC);
CREATE INDEX idx_wines_created_at ON wines(created_at DESC);

