-- Quiz Board: template game (milik satu pemilik) dan sesi permainan (terpisah dari template).
-- owner_id = hash dari ID perangkat/kunci pemilik. Semua query selalu dibatasi owner_id.

CREATE TABLE quiz_game (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    text NOT NULL,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_game_owner_idx ON quiz_game (owner_id, updated_at DESC);

CREATE TABLE quiz_question (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id   uuid NOT NULL REFERENCES quiz_game(id) ON DELETE CASCADE,
  position  int  NOT NULL CHECK (position >= 0),
  question  text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 1000),
  answer    text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 500),
  points    int  NOT NULL CHECK (points BETWEEN 0 AND 100000),
  image     text            -- data URL (sudah diperkecil di browser), opsional
);
CREATE INDEX quiz_question_game_idx ON quiz_question (game_id, position);

CREATE TABLE quiz_session (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      uuid REFERENCES quiz_game(id) ON DELETE SET NULL,  -- riwayat tetap ada bila game dihapus
  owner_id     text NOT NULL,
  game_title   text NOT NULL,
  mode         text NOT NULL CHECK (mode IN ('single','two')),
  teams        jsonb NOT NULL,                       -- [{name, score, correct, wrong}]
  questions    jsonb NOT NULL,                       -- salinan soal saat sesi dibuat: [{id, question, answer, points, image}]
  played       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"0": {team, correct, points}}
  open_q       int,                                  -- indeks soal yang sedang dibuka
  revealed     boolean NOT NULL DEFAULT false,
  turn         int NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'playing' CHECK (status IN ('playing','paused','finished','abandoned')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_session_owner_idx ON quiz_session (owner_id, started_at DESC);
CREATE INDEX quiz_session_game_idx  ON quiz_session (game_id, status);