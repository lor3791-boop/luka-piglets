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
- Firestore는 "테스트 모드"로 생성되어 **2026-09-28 무렵 자동으로 잠깁니다.** 그 전에 Firebase 콘솔에서 영구 규칙으로 바꿔야 계속 동작합니다.
