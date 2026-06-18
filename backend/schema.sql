-- Kanban Board — Supabase PostgreSQL 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행

-- ── cards 테이블 ──────────────────────────────────────────────────────────────

create table cards (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users on delete cascade,
  title       text        not null,
  description text,
  status      text        not null default 'todo'
                check (status in ('todo', 'inprogress', 'done')),
  priority    text        not null default 'medium'
                check (priority in ('high', 'medium', 'low')),
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 인덱스 ────────────────────────────────────────────────────────────────────

create index idx_cards_user_status on cards (user_id, status, position);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table cards enable row level security;

-- 본인 카드만 SELECT · INSERT · UPDATE · DELETE 허용
create policy "own cards"
  on cards for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
