-- AgriShield database schema (PostgreSQL)

CREATE TYPE user_role AS ENUM ('farmer', 'admin', 'oracle', 'auditor');
CREATE TYPE policy_status AS ENUM ('active', 'paid', 'expired');

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    wallet_address  VARCHAR(42),
    role            user_role NOT NULL DEFAULT 'farmer',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE regions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    geo_description TEXT
);

CREATE TABLE policy_templates (
    id                  SERIAL PRIMARY KEY,
    on_chain_template_id BIGINT UNIQUE,
    threshold_mm        INTEGER NOT NULL,
    premium_wei         NUMERIC(78, 0) NOT NULL,
    payout_wei          NUMERIC(78, 0) NOT NULL,
    season_start        TIMESTAMPTZ NOT NULL,
    season_end          TIMESTAMPTZ NOT NULL,
    region_id           INTEGER NOT NULL REFERENCES regions(id),
    active              BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE policies (
    id                  SERIAL PRIMARY KEY,
    on_chain_policy_id  BIGINT UNIQUE,
    farmer_user_id      INTEGER NOT NULL REFERENCES users(id),
    template_id         INTEGER NOT NULL REFERENCES policy_templates(id),
    purchased_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    tx_hash             VARCHAR(66),
    status              policy_status NOT NULL DEFAULT 'active'
);

CREATE TABLE oracle_readings (
    id              SERIAL PRIMARY KEY,
    region_id       INTEGER NOT NULL REFERENCES regions(id),
    rainfall_mm     INTEGER NOT NULL,
    window_start    BIGINT NOT NULL,
    submitted_by    VARCHAR(42) NOT NULL,
    tx_hash         VARCHAR(66),
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payouts (
    id              SERIAL PRIMARY KEY,
    policy_id       INTEGER NOT NULL REFERENCES policies(id),
    amount_wei      NUMERIC(78, 0) NOT NULL,
    tx_hash         VARCHAR(66),
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blockchain_tx_log (
    id              SERIAL PRIMARY KEY,
    tx_hash         VARCHAR(66) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    related_entity_id BIGINT,
    block_number    BIGINT,
    raw_event_json  JSONB,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id              SERIAL PRIMARY KEY,
    actor_user_id   INTEGER REFERENCES users(id),
    action          VARCHAR(255) NOT NULL,
    entity_type     VARCHAR(100),
    entity_id       BIGINT,
    "timestamp"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed a couple of demo regions
INSERT INTO regions (name, geo_description) VALUES
    ('Guntur District', 'Andhra Pradesh, IN - rainfed groundnut/cotton belt'),
    ('Krishna Delta', 'Andhra Pradesh, IN - paddy growing region');
