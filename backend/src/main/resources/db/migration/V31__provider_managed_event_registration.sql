-- Legacy registrations remain manual; only server-side checkout preparation can transfer authority.
ALTER TABLE event_registrations ADD COLUMN externally_managed_payment boolean NOT NULL DEFAULT false;
