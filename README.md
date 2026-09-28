# luka-piglets

루카 후기자돈사 전입출 현황판 — 주차별 전입·전출 물량과 재고를 관리하고, 캘린더로 농장과 공유하기 위한 웹사이트.

두 가지 버전이 있습니다 (서로 자동으로 동기화되지 않는 별개 파일):

- **`index.html`** — GitHub Pages로 서비스되는 공개 버전. Claude 계정 없이 누구나 접속 가능하며, 공유 PIN(입장 시 1회 입력) + Firebase Firestore(공유 데이터 저장)를 사용합니다.
  실제 주소: **https://lor3791-boop.github.io/luka-piglets/**
- **`lukapig.html`** — Claude Artifact 버전 소스 백업. Claude 계정으로 로그인한 같은 조직 구성원끼리 실시간 공동 입력이 가능합니다.
  실제 주소: https://claude.ai/code/artifact/0534fbb2-098f-4b8a-a5a4-480a01d8fa40

기타 파일:
- `입력양식.xlsx` — 전입·전출 내역을 정리해서 웹사이트에 그대로 불러올 수 있는 엑셀 양식
- `build_template.py` — 위 엑셀 양식을 생성하는 스크립트 (openpyxl 필요)

## 참고
- 이 저장소의 파일을 고친다고 두 실제 서비스 링크가 자동으로 갱신되지는 않습니다. `index.html`은 git push하면 GitHub Pages가 자동 재배포하지만, `lukapig.html`은 Claude Artifact 게시 도구로 따로 배포해야 합니다.
- `index.html`의 Firebase 설정값(apiKey 등)은 공개해도 되는 값입니다 — 실제 접근 제어는 Firestore 보안 규칙과 공유 PIN으로 합니다.

### ⚠️ Firestore 보안 규칙 — 반드시 만료 없는 영구 규칙으로 확인/유지할 것
Firestore를 "테스트 모드"로 새로 만들면 기본적으로 생성 후 약 30일 뒤 자동으로 잠기는(모든 읽기/쓰기 거부) 임시 규칙이 걸립니다.
**2026-09-28에 실제로 이 임시 규칙이 만료되어 "이 브라우저에만 저장(공유 불가) — 서버 연결 실패"가 발생한 적이 있습니다** (Firestore REST API로 직접 확인한 원인: `PERMISSION_DENIED: Missing or insufficient permissions`).

재발 방지를 위해 Firebase 콘솔 → Firestore Database → **규칙(Rules)** 탭에서 만료 조건이 없는 아래와 같은 영구 규칙으로 되어 있는지 확인하세요 (접근 제어는 앱의 공유 PIN이 담당하므로 Firestore 규칙 자체는 계속 공개로 둡니다):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

`if request.time < timestamp.date(...)` 처럼 날짜 조건이 들어있는 규칙이 보이면 반드시 위처럼 바꾸고 "게시(Publish)"를 눌러야 합니다. 규칙을 고치면 사이트를 새로고침하거나 화면 상단 동기화 표시의 "다시 시도" 버튼을 누르면 바로 복구됩니다 (앱이 60초마다 자동 재연결도 시도합니다).

만약 연결 실패 중에 새로 입력한 내용이 있었다면 그 내용은 그 브라우저에만 저장되어 있고 클라우드로 자동 동기화되지 않으니, 규칙을 고친 뒤 다시 확인해서 필요하면 재입력하세요.
