-- Per-environment allocations are deliberately smaller than the account-wide R2 free tier.
CREATE TABLE storage_operation_budgets (
    scope varchar(80) NOT NULL,
    period varchar(10) NOT NULL,
    operations bigint NOT NULL DEFAULT 0 CHECK (operations >= 0),
    bytes_reserved bigint NOT NULL DEFAULT 0 CHECK (bytes_reserved >= 0),
    PRIMARY KEY (scope, period)
);
CREATE TABLE managed_cover_images (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL,
    ready boolean NOT NULL DEFAULT false,
    storage_provider varchar(10) NOT NULL CHECK (storage_provider IN ('local', 's3', 'r2')),
    kind varchar(20) NOT NULL CHECK (kind IN ('EVENT', 'WINE_ROUTE')),
    image_url varchar(500) NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_managed_cover_owner ON managed_cover_images(owner_id, created_at);
CREATE TABLE r2_avatar_inventory (
    image_url varchar(500) PRIMARY KEY,
    owner_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_r2_avatar_inventory_owner ON r2_avatar_inventory(owner_id, created_at);
