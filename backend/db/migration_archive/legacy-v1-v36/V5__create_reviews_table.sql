-- V5__create_reviews_table.sql
-- Schema for reviews module

CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating DECIMAL(2, 1) NOT NULL,
    title VARCHAR(255),
    comment TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wine_id, user_id)
);

CREATE INDEX idx_reviews_wine_id ON reviews(wine_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Review likes table
CREATE TABLE review_likes (
    id UUID PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_likes_review ON review_likes(review_id);
CREATE INDEX idx_review_likes_user ON review_likes(user_id);

