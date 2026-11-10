-- #309: a suspension stores its preset reason code before the administrator's detail ("CODE: detail"), so the
-- column must hold the longest code plus a 255-character detail. Widening a varchar does not rewrite the table.
ALTER TABLE users ALTER COLUMN lock_reason TYPE varchar(300);
