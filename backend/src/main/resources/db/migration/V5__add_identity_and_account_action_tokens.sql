UPDATE public.users
SET email_verified = true
WHERE email_verified = false;

CREATE TABLE public.social_identities (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider varchar(20) NOT NULL,
    provider_subject varchar(255) NOT NULL,
    provider_email varchar(255),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT uq_social_identity_provider_subject UNIQUE (provider, provider_subject),
    CONSTRAINT uq_social_identity_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_social_identities_user_id
    ON public.social_identities (user_id);

CREATE TABLE public.user_action_tokens (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_type varchar(40) NOT NULL,
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL
);

CREATE INDEX idx_user_action_tokens_lookup
    ON public.user_action_tokens (token_hash, token_type, expires_at)
    WHERE used_at IS NULL;

CREATE INDEX idx_user_action_tokens_user_type
    ON public.user_action_tokens (user_id, token_type)
    WHERE used_at IS NULL;
