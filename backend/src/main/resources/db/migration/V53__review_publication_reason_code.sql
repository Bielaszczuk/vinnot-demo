-- #307: a rejection carries a preset reason that the author is told about; the free-text reason stays an internal
-- note. Additive and nullable (approvals and earlier decisions have none): the previous binary ignores the column.
ALTER TABLE review_publication_decisions ADD COLUMN reason_code varchar(20)
    CHECK (reason_code IN ('OFFENSIVE', 'SPAM', 'OFF_TOPIC', 'PERSONAL_DATA', 'OTHER'));
