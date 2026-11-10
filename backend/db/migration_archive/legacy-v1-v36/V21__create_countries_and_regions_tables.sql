-- V21__create_countries_and_regions_tables.sql
-- Create reference tables for countries and regions

-- Countries table
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_countries_code ON countries(code);

-- Seed common wine-producing countries
INSERT INTO countries (code, name) VALUES
('ar', 'Argentina'),
('cl', 'Chile'),
('es', 'España'),
('fr', 'Francia'),
('it', 'Italia'),
('pt', 'Portugal'),
('us', 'Estados Unidos'),
('au', 'Australia'),
('za', 'Sudáfrica'),
('nz', 'Nueva Zelanda'),
('de', 'Alemania'),
('at', 'Austria'),
('uy', 'Uruguay'),
('br', 'Brasil'),
('mx', 'México'),
('gr', 'Grecia'),
('hu', 'Hungría'),
('ro', 'Rumania'),
('ge', 'Georgia'),
('cn', 'China'),
('gb', 'Reino Unido'),
('il', 'Israel'),
('lb', 'Líbano'),
('ma', 'Marruecos'),
('hr', 'Croacia'),
('si', 'Eslovenia'),
('bg', 'Bulgaria'),
('ch', 'Suiza'),
('pe', 'Perú'),
('bo', 'Bolivia');

-- Regions table (with FK to countries)
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(name, country_id)
);

CREATE INDEX idx_regions_country_id ON regions(country_id);
CREATE INDEX idx_regions_name ON regions(name);

-- Seed Argentine wine regions
INSERT INTO regions (name, country_id) VALUES
('Mendoza', (SELECT id FROM countries WHERE code = 'ar')),
('San Juan', (SELECT id FROM countries WHERE code = 'ar')),
('Salta', (SELECT id FROM countries WHERE code = 'ar')),
('La Rioja', (SELECT id FROM countries WHERE code = 'ar')),
('Patagonia', (SELECT id FROM countries WHERE code = 'ar')),
('Neuquén', (SELECT id FROM countries WHERE code = 'ar')),
('Río Negro', (SELECT id FROM countries WHERE code = 'ar')),
('Catamarca', (SELECT id FROM countries WHERE code = 'ar')),
('Tucumán', (SELECT id FROM countries WHERE code = 'ar')),
('Córdoba', (SELECT id FROM countries WHERE code = 'ar')),
('Buenos Aires', (SELECT id FROM countries WHERE code = 'ar')),
('Jujuy', (SELECT id FROM countries WHERE code = 'ar')),
('La Pampa', (SELECT id FROM countries WHERE code = 'ar')),
('Valle de Uco', (SELECT id FROM countries WHERE code = 'ar')),
('Luján de Cuyo', (SELECT id FROM countries WHERE code = 'ar')),
('Maipú', (SELECT id FROM countries WHERE code = 'ar')),
('Valle de Cafayate', (SELECT id FROM countries WHERE code = 'ar')),
('Tupungato', (SELECT id FROM countries WHERE code = 'ar')),
('Tunuyán', (SELECT id FROM countries WHERE code = 'ar')),
('San Carlos', (SELECT id FROM countries WHERE code = 'ar')),
('San Rafael', (SELECT id FROM countries WHERE code = 'ar')),
('Agrelo', (SELECT id FROM countries WHERE code = 'ar')),
('Gualtallary', (SELECT id FROM countries WHERE code = 'ar')),
('Perdriel', (SELECT id FROM countries WHERE code = 'ar')),
('Vista Flores', (SELECT id FROM countries WHERE code = 'ar')),
('Paraje Altamira', (SELECT id FROM countries WHERE code = 'ar')),
('La Consulta', (SELECT id FROM countries WHERE code = 'ar')),
('Barrancas', (SELECT id FROM countries WHERE code = 'ar')),
('Lunlunta', (SELECT id FROM countries WHERE code = 'ar')),
('Ugarteche', (SELECT id FROM countries WHERE code = 'ar')),
('Las Compuertas', (SELECT id FROM countries WHERE code = 'ar')),
('San Martín', (SELECT id FROM countries WHERE code = 'ar')),
('Famatina', (SELECT id FROM countries WHERE code = 'ar')),
('Fiambalá', (SELECT id FROM countries WHERE code = 'ar')),
('Valles Calchaquíes', (SELECT id FROM countries WHERE code = 'ar')),
('Valle de Pedernal', (SELECT id FROM countries WHERE code = 'ar')),
('Valle de Zonda', (SELECT id FROM countries WHERE code = 'ar')),
('Valle de Tulum', (SELECT id FROM countries WHERE code = 'ar')),
('Valle de Traslasierra', (SELECT id FROM countries WHERE code = 'ar')),
-- Spanish regions
('Rioja', (SELECT id FROM countries WHERE code = 'es')),
('Ribera del Duero', (SELECT id FROM countries WHERE code = 'es')),
('Priorat', (SELECT id FROM countries WHERE code = 'es')),
('Rías Baixas', (SELECT id FROM countries WHERE code = 'es')),
('Penedès', (SELECT id FROM countries WHERE code = 'es')),
('Jerez', (SELECT id FROM countries WHERE code = 'es')),
('Toro', (SELECT id FROM countries WHERE code = 'es')),
('Rueda', (SELECT id FROM countries WHERE code = 'es')),
('Jumilla', (SELECT id FROM countries WHERE code = 'es')),
('Navarra', (SELECT id FROM countries WHERE code = 'es')),
-- French regions
('Bordeaux', (SELECT id FROM countries WHERE code = 'fr')),
('Bourgogne', (SELECT id FROM countries WHERE code = 'fr')),
('Champagne', (SELECT id FROM countries WHERE code = 'fr')),
('Rhône', (SELECT id FROM countries WHERE code = 'fr')),
('Loire', (SELECT id FROM countries WHERE code = 'fr')),
('Alsace', (SELECT id FROM countries WHERE code = 'fr')),
('Provence', (SELECT id FROM countries WHERE code = 'fr')),
('Languedoc', (SELECT id FROM countries WHERE code = 'fr')),
-- Italian regions
('Toscana', (SELECT id FROM countries WHERE code = 'it')),
('Piemonte', (SELECT id FROM countries WHERE code = 'it')),
('Veneto', (SELECT id FROM countries WHERE code = 'it')),
('Sicilia', (SELECT id FROM countries WHERE code = 'it')),
('Puglia', (SELECT id FROM countries WHERE code = 'it')),
-- Chilean regions
('Valle Central', (SELECT id FROM countries WHERE code = 'cl')),
('Valle de Colchagua', (SELECT id FROM countries WHERE code = 'cl')),
('Valle del Maipo', (SELECT id FROM countries WHERE code = 'cl')),
('Valle de Casablanca', (SELECT id FROM countries WHERE code = 'cl'));

