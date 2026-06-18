# WORKFLOW.md

지금까지 요청한 작업 내용을 정리한 문서입니다.

---

## 1. GitHub Pages 배포 링크 버그 수정

배포된 링크에서 버튼이 동작하지 않는 문제 발생.  
콘솔 오류 확인 결과 두 가지 오류 식별:

- `Uncaught ReferenceError: SUPABASE_URL is not defined` — config.js 미로드
- `Uncaught SyntaxError: Identifier 'supabase' has already been declared` — Supabase CDN이 전역에 `var supabase`를 선언하는데, script.js에서도 `let supabase`로 선언하여 충돌 발생

script.js 내부 변수명을 `supabase` → `_db`로 변경하여 해결.

## 2. 설계 문서 업데이트

버그 수정 및 Supabase 연동 완료 상태를 반영하여 PRD, TRD, DATABASE_DESIGN 등 각종 MD 설계 문서 내용 업데이트.

## 3. 수정 파일 커밋 및 푸시

script.js, auth.js, config.js 등 수정된 파일을 커밋하고 푸시.

## 4. 로컬 실행 확인

로컬 환경에서 칸반보드 정상 동작 여부 확인.

## 5. 폴더 구조 재편

소스 파일을 역할별로 분리하여 구조 개선.

```
(이전)                     (이후)
kanban/                    kanban/
├── index.html             ├── frontend/
├── login.html             │   ├── index.html
├── script.js              │   ├── login.html
├── auth.js                │   ├── script.js
├── style.css              │   ├── auth.js
└── schema.sql             │   └── style.css
                           ├── backend/
                           │   └── schema.sql
                           └── config/
                               └── config.example.js
```

## 6. 배포 레포에도 동일 구조 적용

`sye0ni/kanban-board` 레포에도 동일한 폴더 구조 적용.  
GitHub Actions 워크플로우(`.github/workflows/pages.yml`) 추가 — `main` 브랜치 push 시 `frontend/` 폴더만 GitHub Pages에 자동 배포.

## 7. README.md 출력 문제 해결

폴더 구조 변경 및 GitHub Pages 소스를 GitHub Actions로 전환한 후 사이트에서 README.md 내용이 출력되는 문제 발생.  
`frontend/.nojekyll` 파일 추가로 해결 — Jekyll 처리를 비활성화하여 HTML 파일이 그대로 서빙되도록 수정.

## 8. 두 레포 동기화 방법 정비

배포용 레포(`kanban-board`)와 수업용 mono-repo를 이중으로 관리해야 하는 불편함 해소.  
`kanban-board`를 단일 소스로 유지하고, 수업 제출 시에만 `sync.sh`를 실행해 mono-repo에 동기화하는 방식으로 정리.
