-- V6__create_wine_routes_table.sql
-- Schema for wine routes module

CREATE TABLE wine_routes (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    country VARCHAR(100),
    region VARCHAR(100),
    subregion VARCHAR(100),
    estimated_duration_minutes INTEGER,
    estimated_days INTEGER,
    total_distance_km DOUBLE PRECISION,
    difficulty VARCHAR(50),
    image_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    recommended_wine_types JSONB,
    map_embed_url VARCHAR(1000),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wine_routes_name ON wine_routes(name);
CREATE INDEX idx_wine_routes_country ON wine_routes(country);
CREATE INDEX idx_wine_routes_region ON wine_routes(region);
CREATE INDEX idx_wine_routes_status ON wine_routes(status);
CREATE INDEX idx_wine_routes_creator ON wine_routes(created_by);

-- Wine route stops table
CREATE TABLE wine_route_stops (
    id UUID PRIMARY KEY,
    wine_route_id UUID NOT NULL REFERENCES wine_routes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    address VARCHAR(500),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(11, 7),
    stop_order INTEGER NOT NULL,
    estimated_duration_minutes INTEGER
);

CREATE INDEX idx_route_stops_route ON wine_route_stops(wine_route_id);
CREATE INDEX idx_route_stops_order ON wine_route_stops(wine_route_id, stop_order);

