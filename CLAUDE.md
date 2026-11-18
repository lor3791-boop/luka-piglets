# luka-piglets — 작업 규칙

사용자: 비육계열 3팀 지역부장(운영자 이름 **이오름**). 답은 **한국어·짧게**. 모르거나 애매하면 먼저 질문.

## 구성
| 경로 | 내용 | 배포 |
|---|---|---|
| `index.html` | 루카 후기자돈사 전입출 현황판 (Firebase) | main push → GitHub Pages |
| `lukapig.html` | 위 현황판의 Claude Artifact 버전 백업 | Artifact 게시 도구로 따로 |
| `pyesa/` | 폐사 입력 PWA (폰 공유 → 농장·동·두수 → 드라이브·'폐사 기록' 시트) | main push → Pages (`/luka-piglets/pyesa/`) |
| `gas/` | Apps Script 서버(사진 자동분류 + 폐사 앱 백엔드) — clasp | `gas/deploy.sh` |
| `apps-script/` | 예전 조각 코드 사본(참고용). 실제 코드는 `gas/src/` | — |
| `build_template.py` | 입력양식.xlsx 생성 (openpyxl) | — |

## 폐사 앱(pyesa) 수정 규칙
- `pyesa/` 안 파일을 고치면 **`pyesa/sw.js`의 `SHELL` 버전을 반드시 +1** (안 올리면 폰에 옛 화면이 남음).
- 새 파일을 추가하면 `sw.js`의 `FILES` 목록에도 넣는다.
- 화면 기준: 폰 폭 390px, 한국어. 사용법·UI 설명 문구는 넣지 않는다.
- 서버 주소·키: `#k=<키>` 해시로 전달. **키 값은 코드·커밋·답변에 적지 않는다.**

## Apps Script (clasp)
- 프로젝트: 사진분류 (Code.gs — 분류실행_, visitFarm_, 폐사 doGet/doPost, 카카오 알림)
- 웹앱 배포 ID는 `gas/deploy.sh`에 고정 → **같은 주소를 유지한 채 새 버전**으로 올라간다.
- 순서: `gas/pull.sh`(브라우저에서 고친 것 먼저 받기) → `gas/src/` 수정 → `gas/deploy.sh "바뀐 내용"`
- 처음 한 번: https://script.google.com/home/usersettings 에서 **Google Apps Script API 사용** 켜기 → `npx @google/clasp@3 login` (컨테이너에서는 `--no-localhost`).
- 클라우드 작업공간에서 쓰려면 claude.ai 설정 → Capabilities 허용 도메인에 `oauth2.googleapis.com`, `script.googleapis.com`, `www.googleapis.com` 추가 필요 (없으면 로그인·push가 막힘). 노트북에서는 Node 설치 후 바로 사용 가능.
- `gas/src/`는 접속 키가 들어 있어 **git에 올리지 않는다**(.gitignore). 키를 스크립트 속성(`PropertiesService`)으로 옮기면 해제한다.
- 트리거 함수·한 번만 도는 속성(RESCAN_*, PYESA_* 등)은 지우지 말고, 바꾸기 전에 확인한다.
- 시간 트리거로 도는 함수 이름을 바꾸면 트리거가 끊긴다 → 이름 유지.

## 금지
- `.clasprc.json`, 키·토큰, 카카오 인증값을 파일·커밋에 넣지 않는다.
- Firestore 규칙은 README 설명대로 유지(만료 날짜 조건 금지).

## 커밋
- 메시지는 한국어, `영역: 바뀐 점` 형식 (예: `폐사 입력 앱: HEIC 변환`).
