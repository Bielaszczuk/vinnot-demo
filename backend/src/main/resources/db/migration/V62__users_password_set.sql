-- Whether the stored password is one the account owner chose (#345 B2). Accounts created by a social
-- sign-in, and unverified local accounts whose password was revoked when a provider proved the email,
-- store the hash of a random secret nobody knows; clients show them "set a password" instead of the
-- change-password form.
ALTER TABLE public.users
    ADD COLUMN password_set boolean NOT NULL DEFAULT true;

-- Backfill. A token counts as consumed only when its owner used it: requesting a new token of the same
-- type marks the earlier unused ones as used a moment before the new token is created, so a token
-- followed within seconds by a newer one of its type was invalidated, not consumed.
-- An account has no chosen password when its first social identity
--   * was saved with the account (a social sign-in creates both in one transaction), or
--   * was linked later to a local account that had not proven its email before the link (the link
--     revokes that password). Accounts older than V5 were verified in bulk by V5 and keep theirs; if
--     the V5 history row is missing (a baselined database), this case is skipped and they keep true,
-- and it did not consume a password reset after that identity was saved.
WITH consumed AS (
    SELECT token.user_id, token.token_type, token.used_at
    FROM public.user_action_tokens token
    WHERE token.used_at IS NOT NULL
      AND NOT EXISTS (
            SELECT 1 FROM public.user_action_tokens newer
            WHERE newer.user_id = token.user_id
              AND newer.token_type = token.token_type
              AND newer.id <> token.id
              AND newer.created_at >= token.used_at
              AND newer.created_at < token.used_at + interval '5 seconds')
), first_identity AS (
    SELECT identity.user_id, min(identity.created_at) AS linked_at
    FROM public.social_identities identity
    GROUP BY identity.user_id
), bulk_verified AS (
    SELECT COALESCE(
            (SELECT history.installed_on::timestamptz FROM public.flyway_schema_history history
             WHERE history.version = '5' AND history.success),
            'infinity'::timestamptz) AS until
)
UPDATE public.users account
SET password_set = false
FROM first_identity, bulk_verified
WHERE first_identity.user_id = account.id
  AND (first_identity.linked_at <= account.created_at + interval '1 minute'
       OR (account.created_at > bulk_verified.until
           AND NOT EXISTS (
                SELECT 1 FROM consumed
                WHERE consumed.user_id = account.id
                  AND consumed.token_type IN ('EMAIL_VERIFICATION', 'EMAIL_CHANGE')
                  AND consumed.used_at <= first_identity.linked_at)))
  AND NOT EXISTS (
        SELECT 1 FROM consumed
        WHERE consumed.user_id = account.id
          AND consumed.token_type = 'PASSWORD_RESET'
          AND consumed.used_at > first_identity.linked_at);
