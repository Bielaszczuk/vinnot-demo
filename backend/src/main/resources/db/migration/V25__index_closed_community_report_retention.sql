-- Bounded hourly cleanup of closed cases; report actions are removed by their FK cascade.
CREATE INDEX community_reports_closed_retention ON community_reports(updated_at,id)
    WHERE status IN ('RESOLVED','DISMISSED');
