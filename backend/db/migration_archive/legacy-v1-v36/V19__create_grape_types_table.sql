-- Create grape_types reference table
CREATE TABLE grape_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    name_es VARCHAR(100),
    category VARCHAR(20) DEFAULT 'RED',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed with comprehensive list of grape varieties
INSERT INTO grape_types (name, name_es, category) VALUES
-- Red grapes
('Malbec', 'Malbec', 'RED'),
('Cabernet Sauvignon', 'Cabernet Sauvignon', 'RED'),
('Merlot', 'Merlot', 'RED'),
('Pinot Noir', 'Pinot Noir', 'RED'),
('Syrah', 'Syrah', 'RED'),
('Tempranillo', 'Tempranillo', 'RED'),
('Sangiovese', 'Sangiovese', 'RED'),
('Nebbiolo', 'Nebbiolo', 'RED'),
('Grenache', 'Grenache', 'RED'),
('Zinfandel', 'Zinfandel', 'RED'),
('Carménère', 'Carménère', 'RED'),
('Petit Verdot', 'Petit Verdot', 'RED'),
('Cabernet Franc', 'Cabernet Franc', 'RED'),
('Bonarda', 'Bonarda', 'RED'),
('Tannat', 'Tannat', 'RED'),
('Garnacha', 'Garnacha', 'RED'),
('Monastrell', 'Monastrell', 'RED'),
('Touriga Nacional', 'Touriga Nacional', 'RED'),
('Barbera', 'Barbera', 'RED'),
('Dolcetto', 'Dolcetto', 'RED'),
('Corvina', 'Corvina', 'RED'),
('Primitivo', 'Primitivo', 'RED'),
('Mourvèdre', 'Mourvèdre', 'RED'),
('Cinsault', 'Cinsault', 'RED'),
('Mencía', 'Mencía', 'RED'),
('Criolla Grande', 'Criolla Grande', 'RED'),
('País', 'País', 'RED'),
-- White grapes
('Chardonnay', 'Chardonnay', 'WHITE'),
('Sauvignon Blanc', 'Sauvignon Blanc', 'WHITE'),
('Riesling', 'Riesling', 'WHITE'),
('Pinot Grigio', 'Pinot Grigio', 'WHITE'),
('Gewürztraminer', 'Gewürztraminer', 'WHITE'),
('Viognier', 'Viognier', 'WHITE'),
('Chenin Blanc', 'Chenin Blanc', 'WHITE'),
('Semillón', 'Semillón', 'WHITE'),
('Torrontés', 'Torrontés', 'WHITE'),
('Albariño', 'Albariño', 'WHITE'),
('Verdejo', 'Verdejo', 'WHITE'),
('Moscatel', 'Moscatel', 'WHITE'),
('Pedro Ximénez', 'Pedro Ximénez', 'WHITE'),
('Garnacha Blanca', 'Garnacha Blanca', 'WHITE'),
('Marsanne', 'Marsanne', 'WHITE'),
('Roussanne', 'Roussanne', 'WHITE'),
('Grüner Veltliner', 'Grüner Veltliner', 'WHITE'),
('Vermentino', 'Vermentino', 'WHITE'),
('Trebbiano', 'Trebbiano', 'WHITE'),
-- Special
('Blend', 'Blend', 'OTHER'),
('Otra', 'Otra', 'OTHER');

CREATE INDEX idx_grape_types_active ON grape_types(is_active);
CREATE INDEX idx_grape_types_category ON grape_types(category);

