-- V14__create_route_wineries_table.sql
-- Add route_wineries pivot table for many-to-many relationship

CREATE TABLE route_wineries (
    route_id UUID NOT NULL REFERENCES wine_routes(id) ON DELETE CASCADE,
    winery_id UUID NOT NULL REFERENCES wineries(id) ON DELETE CASCADE,
    PRIMARY KEY (route_id, winery_id)
);

CREATE INDEX idx_route_wineries_route_id ON route_wineries(route_id);
CREATE INDEX idx_route_wineries_winery_id ON route_wineries(winery_id);

