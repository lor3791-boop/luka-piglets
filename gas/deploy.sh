#!/usr/bin/env bash
# 사진분류·폐사 앱 서버(Apps Script) 올리기 + 웹앱 새 버전 배포
# 사용: gas/deploy.sh "바뀐 내용 한 줄"
set -euo pipefail
cd "$(dirname "$0")"
DEPLOY_ID="AKfycbwmyNqtik9FKDVG2TdNiJxkYDlmX7qIvXm_kcH0Tx_gNc8M56LAfNipZVMWjptc5x3KtQ"
EXEC="https://script.google.com/macros/s/$DEPLOY_ID/exec"
MSG="${1:?바뀐 내용을 한 줄로 적어 주세요}"
CLASP="npx -y @google/clasp@3"

$CLASP push -f
$CLASP deploy -i "$DEPLOY_ID" -d "$(date +%m/%d) $MSG"

# 동작 확인: 농장 목록이 오면 정상 (키는 환경변수로만 받음, 파일에 적지 않음)
if [ -n "${PYESA_KEY:-}" ]; then
  curl -sL "$EXEC?action=farms&k=$PYESA_KEY" | head -c 300; echo
else
  echo "확인 생략: PYESA_KEY 환경변수 없음"
fi
