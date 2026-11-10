-- V9: Create wine_comparisons table for AI-generated wine comparisons
CREATE TABLE wine_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wine_a_id UUID NOT NULL,
    wine_b_id UUID NOT NULL,
    language VARCHAR(10) NOT NULL,
    comparison_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wine_comparison_wine_a FOREIGN KEY (wine_a_id) REFERENCES wines(id) ON DELETE CASCADE,
    CONSTRAINT fk_wine_comparison_wine_b FOREIGN KEY (wine_b_id) REFERENCES wines(id) ON DELETE CASCADE,
    CONSTRAINT uq_wine_comparison_wines_language UNIQUE (wine_a_id, wine_b_id, language)
);

-- Create indexes for faster lookups
CREATE INDEX idx_wine_comparisons_wine_a_id ON wine_comparisons(wine_a_id);
CREATE INDEX idx_wine_comparisons_wine_b_id ON wine_comparisons(wine_b_id);
CREATE INDEX idx_wine_comparisons_language ON wine_comparisons(language);

-- Comment on table
COMMENT ON TABLE wine_comparisons IS 'Stores AI-generated wine comparison analyses for different languages';

