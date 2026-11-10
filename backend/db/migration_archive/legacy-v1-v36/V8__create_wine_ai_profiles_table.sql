-- V8: Create wine_ai_profiles table for AI-generated wine analysis
CREATE TABLE wine_ai_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wine_id UUID NOT NULL,
    language VARCHAR(10) NOT NULL,
    profile_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wine_ai_profile_wine FOREIGN KEY (wine_id) REFERENCES wines(id) ON DELETE CASCADE,
    CONSTRAINT uq_wine_ai_profile_wine_language UNIQUE (wine_id, language)
);

-- Create index for faster lookups
CREATE INDEX idx_wine_ai_profiles_wine_id ON wine_ai_profiles(wine_id);
CREATE INDEX idx_wine_ai_profiles_language ON wine_ai_profiles(language);

-- Comment on table
COMMENT ON TABLE wine_ai_profiles IS 'Stores AI-generated wine profiles/analysis for different languages';

