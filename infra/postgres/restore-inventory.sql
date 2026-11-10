-- Capture in the same quiescent backup window. Aggregate evidence only, never row contents.
SELECT json_build_object(
  'users', (SELECT count(*) FROM users),
  'wines', (SELECT count(*) FROM wines),
  'wineries', (SELECT count(*) FROM wineries),
  'searchRows', (SELECT count(*) FROM wine_catalog_search),
  'missingSearchRows', (SELECT count(*) FROM wines w LEFT JOIN wine_catalog_search s ON s.wine_id=w.id WHERE s.wine_id IS NULL),
  'constraints', (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace),
  'unvalidatedConstraints', (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated),
  'migrations', (SELECT json_agg(json_build_object('version',version,'script',script,'checksum',checksum,'success',success) ORDER BY installed_rank) FROM flyway_schema_history),
  'tables', (SELECT json_object_agg(table_name, row_count ORDER BY table_name) FROM (
    SELECT table_name, (xpath('/row/count/text()', query_to_xml(format('SELECT count(*) FROM public.%I', table_name),false,true,'')))[1]::text::bigint AS row_count
    FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
  ) counts)
);
