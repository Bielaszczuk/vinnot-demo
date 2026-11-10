-- V11__add_email_verified_to_users.sql
-- Add email_verified field to users

ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

