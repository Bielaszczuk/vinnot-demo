-- V2__create_wineries_table.sql
-- Schema for wineries module

CREATE TABLE wineries (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description_es TEXT,
    description_en TEXT,
    country VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    subregion VARCHAR(100),
    address VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    logo_url VARCHAR(500),
    image_url VARCHAR(500),
    established_year INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wineries_name ON wineries(name);
CREATE INDEX idx_wineries_region ON wineries(region);
CREATE INDEX idx_wineries_country ON wineries(country);
CREATE INDEX idx_wineries_active ON wineries(is_active);

