# WORKFLOW.md

## 저장소 구조

이 프로젝트는 두 개의 저장소를 운영합니다.

| 저장소 | 역할 |
|--------|------|
| `sye0ni/kanban-board` | 실제 개발 및 GitHub Pages 배포 (primary) |
| `kosa-vibecoding-2026-3rd` | 수업 과제 제출용 mono-repo |

**`kanban-board`를 단일 소스로 사용하고, 수업 제출 시에만 mono-repo에 동기화합니다.**

---

## 개발 및 배포 흐름

### 1. 로컬 개발

```bash
# config.js 생성 (최초 1회)
cp config/config.example.js frontend/config.js
# frontend/config.js 에 실제 Supabase URL · anon key 입력

# 로컬 서버 실행
python3 -m http.server 8080 --directory frontend
# → http://localhost:8080
```

### 2. GitHub Pages 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 `frontend/` 폴더를 GitHub Pages에 배포합니다.

```bash
git add .
git commit -m "..."
git push origin main
# → GitHub Actions 실행 → https://sye0ni.github.io/kanban-board/ 자동 갱신
```

워크플로우 실행 상태는 `https://github.com/sye0ni/kanban-board/actions` 에서 확인할 수 있습니다.

### 3. mono-repo 동기화 (수업 제출 시)

```bash
bash sync.sh
# frontend/, backend/, config/ 를 mono-repo 경로로 복사

# 이후 mono-repo에서 커밋 및 푸시
cd /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/sye0ni/day03/kanban
git add .
git commit -m "..."
git push origin main
```

> `sync.sh`는 `frontend/config.js`를 제외하고 복사합니다 (gitignore 대상).

---

## GitHub Actions 구조

`.github/workflows/pages.yml`이 배포를 담당합니다.

```
push to main
  → actions/checkout         코드 다운로드
  → actions/configure-pages  Pages 설정 초기화
  → actions/upload-pages-artifact (path: ./frontend)  frontend/ 폴더만 업로드
  → actions/deploy-pages     Pages에 배포
```

`frontend/.nojekyll` 파일이 없으면 GitHub Pages가 Jekyll로 파일을 변환하면서 `README.md`를 인덱스 페이지로 처리합니다. 이를 방지하기 위해 빈 `.nojekyll` 파일을 포함합니다.

---

## 디렉토리 구조

```
kanban-board/
├── .github/workflows/
│   └── pages.yml       GitHub Actions 배포 워크플로우
├── frontend/           GitHub Pages가 서빙하는 정적 파일
│   ├── .nojekyll       Jekyll 비활성화
│   ├── index.html
│   ├── login.html
│   ├── style.css
│   ├── auth.js
│   ├── script.js
│   └── config.js       Supabase 키 (gitignore 대상)
├── backend/
│   └── schema.sql      Supabase 테이블 및 RLS 스키마
├── config/
│   └── config.example.js  config.js 생성 템플릿
├── sync.sh             mono-repo 동기화 스크립트
└── README.md
```
