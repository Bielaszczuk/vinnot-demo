-- V4__create_events_table.sql
-- Schema for events module

CREATE TABLE events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location_name VARCHAR(255),
    location_address VARCHAR(500),
    location_city VARCHAR(100),
    location_region VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(11, 7),
    map_embed_url VARCHAR(1000),
    price DECIMAL(10, 2),
    max_attendees INTEGER,
    current_attendees INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    image_url VARCHAR(500),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organizer_type VARCHAR(50) NOT NULL DEFAULT 'PARTNER',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_title ON events(title);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status_start ON events(status, start_date);
CREATE INDEX idx_events_location ON events(latitude, longitude);
CREATE INDEX idx_events_city ON events(location_city);

