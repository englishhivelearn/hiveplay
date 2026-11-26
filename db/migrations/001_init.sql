-- HivePlay: perpustakaan asset pusat dan database kosakata pusat.
CREATE TABLE asset_category (
  id        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name      text NOT NULL,
  slug      text NOT NULL UNIQUE,
  grp       text NOT NULL CHECK (grp IN ('VOCABULARY','CHARACTER','ENVIRONMENT','OBJECT','AUDIO','ANIMATION','UI')),
  parent_id text REFERENCES asset_category(id) ON DELETE SET NULL
);

CREATE TABLE asset (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  category_id text NOT NULL REFERENCES asset_category(id),
  type        text NOT NULL CHECK (type IN ('IMAGE','AUDIO','SPRITESHEET','ANIMATION')),
  variant     text,
  file_path   text NOT NULL,
  format      text NOT NULL,
  size_bytes  integer NOT NULL,
  width       integer,
  height      integer,
  duration_ms integer,
  frames      integer,
  inline_rig  boolean NOT NULL DEFAULT false,
  sha256      text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','DRAFT')),
  source      text NOT NULL DEFAULT 'UPLOAD' CHECK (source IN ('SEED','UPLOAD')),
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_sha256_idx ON asset (sha256);
CREATE INDEX asset_category_status_idx ON asset (category_id, status);

CREATE TABLE vocabulary_category (
  id        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name      text NOT NULL,
  slug      text NOT NULL UNIQUE,
  parent_id text REFERENCES vocabulary_category(id) ON DELETE SET NULL
);

CREATE TABLE vocabulary (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  word          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  category_id   text NOT NULL REFERENCES vocabulary_category(id),
  part_of_speech text,
  definition    text,
  example       text,
  translation   text,
  plural        text,
  sound_text    text,
  difficulty    integer NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  tags          text[] NOT NULL DEFAULT '{}',
  syllables     integer,
  word_length   integer NOT NULL,
  first_letter  text NOT NULL,
  status        text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','DRAFT')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vocabulary_word_category_idx ON vocabulary (lower(word), category_id);
CREATE INDEX vocabulary_category_idx ON vocabulary (category_id);
CREATE INDEX vocabulary_first_letter_idx ON vocabulary (first_letter);

CREATE TABLE vocabulary_asset (
  vocabulary_id text NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  asset_id      text NOT NULL REFERENCES asset(id),
  role          text NOT NULL,
  is_primary    boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (vocabulary_id, asset_id, role)
);
CREATE INDEX vocabulary_asset_asset_idx ON vocabulary_asset (asset_id);

CREATE TABLE vocabulary_set (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        text NOT NULL UNIQUE,
  description text,
  level       text,
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vocabulary_set_item (
  set_id        text NOT NULL REFERENCES vocabulary_set(id) ON DELETE CASCADE,
  vocabulary_id text NOT NULL REFERENCES vocabulary(id),
  sort_order    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (set_id, vocabulary_id)
);

CREATE TABLE game_asset_usage (
  id       text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_key text NOT NULL,
  asset_id text NOT NULL REFERENCES asset(id),
  role     text NOT NULL,
  UNIQUE (game_key, asset_id, role)
);
CREATE INDEX game_asset_usage_asset_idx ON game_asset_usage (asset_id);
