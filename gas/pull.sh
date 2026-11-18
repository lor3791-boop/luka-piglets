#!/usr/bin/env bash
# 브라우저 편집기에서 고친 내용을 로컬로 받아오기 (고치기 전에 항상 먼저 실행)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p src
npx -y @google/clasp@3 pull
