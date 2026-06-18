# Kanban Board

Supabase Auth + DB 기반 칸반보드. GitHub Pages로 정적 배포.

**Live →** https://sye0ni.github.io/kanban-board/

## 기능

- 3개 컬럼 (To-do / In-progress / Done)
- 카드 추가 · 삭제 · 인라인 편집
- 드래그 앤 드롭으로 컬럼 간 이동 (데스크탑 + 모바일 터치)
- 우선순위 라벨 (높음 / 중간 / 낮음)
- Google / GitHub / 이메일 로그인 (Supabase Auth)
- 로그인한 사용자별 카드 격리 (RLS)

## 디렉토리 구조

```
kanban-board/
├── frontend/          GitHub Pages가 서빙하는 정적 파일
│   ├── index.html     칸반 보드 본체
│   ├── login.html     로그인·회원가입 페이지
│   ├── style.css      다크 테마 스타일
│   ├── auth.js        Supabase 세션·OAuth 처리
│   ├── script.js      카드 CRUD·드래그 로직
│   └── config.js      Supabase 키 (아래 참고)
├── backend/
│   └── schema.sql     Supabase 테이블 + RLS 스키마
├── config/
│   └── config.example.js  config.js 생성 템플릿
├── .github/workflows/
│   └── pages.yml      GitHub Actions — frontend/ → Pages 배포
└── README.md
```

## 로컬 실행

```bash
# 1. config.js 생성
cp config/config.example.js frontend/config.js
# frontend/config.js 에 실제 Supabase URL·anon key 입력

# 2. 서버 실행
python3 -m http.server 8080 --directory frontend
# → http://localhost:8080
```

## Supabase 설정

**cards 테이블 스키마** (`backend/schema.sql` 참고)

```sql
create table cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  title       text not null,
  description text,
  status      text check (status in ('todo','inprogress','done')) default 'todo',
  priority    text check (priority in ('high','medium','low')) default 'medium',
  position    integer default 0,
  created_at  timestamptz default now()
);
alter table cards enable row level security;
create policy "own cards" on cards
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Authentication → URL Configuration → Redirect URLs**

```
https://sye0ni.github.io/kanban-board/login.html
https://sye0ni.github.io/kanban-board/
http://localhost:8080/login.html
```
