-- #492: the rendered images of a social post (hero illustration and carousel slides per format) and what is still to
-- render, as one JSONB document. Posts stored before this migration have none until their media is first rendered.
ALTER TABLE social_posts ADD COLUMN media JSONB;
