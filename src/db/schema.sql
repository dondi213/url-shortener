CREATE TABLE IF NOT EXISTS links (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(32) NOT NULL UNIQUE,
    url         TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clicks (
    id          SERIAL PRIMARY KEY,
    link_id     INTEGER     NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referrer    TEXT,
    user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_link_id_clicked_at ON clicks (link_id, clicked_at);
