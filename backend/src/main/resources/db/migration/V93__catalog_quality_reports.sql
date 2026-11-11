-- Catalog quality reports (#544): the system files a moderation report when a member corrects an exact label scan
-- match, because the two wines may be duplicates or one may carry the wrong winery or image. These reports have no
-- reporter (reporter_id is NULL), target the matched WINE, name the wine the member picked in related_target_id and
-- use the CATALOG_QUALITY reason. Moderators decide them; catalog rows are never edited automatically.
ALTER TABLE community_reports DROP CONSTRAINT community_reports_target_type_check;
ALTER TABLE community_reports ADD CONSTRAINT community_reports_target_type_check
    CHECK (target_type IN ('REVIEW','COMMENT','USER','EVENT','WINE_ROUTE','WINE'));
ALTER TABLE community_reports DROP CONSTRAINT community_reports_reason_check;
ALTER TABLE community_reports ADD CONSTRAINT community_reports_reason_check
    CHECK (reason IN ('SPAM','HARASSMENT','HATE','SEXUAL_CONTENT','VIOLENCE','PRIVACY','MISINFORMATION','OTHER',
                      'CATALOG_QUALITY'));
ALTER TABLE community_reports ADD COLUMN related_target_id uuid;
-- One open report per wine pair, in either direction, so repeated corrections never pile up while one is pending.
CREATE UNIQUE INDEX community_report_open_catalog_pair ON community_reports(
        LEAST(target_id, related_target_id), GREATEST(target_id, related_target_id))
    WHERE reason = 'CATALOG_QUALITY' AND status IN ('OPEN','IN_REVIEW');
