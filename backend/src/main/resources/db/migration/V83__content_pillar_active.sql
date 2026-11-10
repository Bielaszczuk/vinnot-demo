-- #510: the admin may switch a content pillar off; the planner only plans active pillars. Every pillar stays active.
ALTER TABLE content_pillars ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
