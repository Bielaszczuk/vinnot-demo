-- Per-category daily push limits (#305: one "new event near you" push per day) count recent sends of one category
-- per account. Index only: the previous binary is unaffected.
CREATE INDEX idx_push_sends_user_category ON push_sends(user_id, category, sent_at);
