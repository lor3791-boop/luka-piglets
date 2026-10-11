

/* ===================== 피그온 미등록 체크 + 카카오톡 알림 ===================== */
// 폐사기록 G열 = 피그온 등록(체크박스), H열 = 체크한 시각
const PYESA_APP = 'https://lor3791-boop.github.io/luka-piglets/pyesa/';
const PYESA_EXEC = 'https://script.google.com/macros/s/AKfycbwmyNqtik9FKDVG2TdNiJxkYDlmX7qIvXm_kcH0Tx_gNc8M56LAfNipZVMWjptc5x3KtQ/exec';
const ALERT_HOUR = 8;   // 매일 알림 시각 (오전 8시)

function ymd_(d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd'); }

function ensureCheckCols_(sh) {
  if (sh.getRange(1, 7).getValue() === '피그온 등록') return;
  sh.getRange(1, 7, 1, 2).setValues([['피그온 등록', '등록 체크시각']]).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
  sh.getRange('H:H').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.setColumnWidths(7, 2, 110);
}

/** 미등록(체크 안 된) 기록을 농장·날짜별로 묶음 + 오늘 체크한 것 */
function checkGroups_() {
  const sh = pyesaSheet_().getSheetByName('폐사기록');
  ensureCheckCols_(sh);
  const last = sh.getLastRow();
  if (last < 2) return { groups: [], done: [] };
  const n = last - 1;
  if (sh.getRange(2, 7).getDataValidation() == null) sh.getRange(2, 7, n, 1).insertCheckboxes();
  const v = sh.getRange(2, 1, n, 8).getValues();
  const rt = sh.getRange(2, 5, n, 1).getRichTextValues();
  const today = ymd_(new Date());
  const pend = {}, done = {};
  v.forEach((r, i) => {
    const d = r[0] instanceof Date ? ymd_(r[0]) : String(r[0]).slice(0, 10);
    const farm = String(r[1] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !farm) return;
    let map;
    if (r[6] === true) {
      if (!(r[7] instanceof Date) || ymd_(r[7]) !== today) return;
      map = done;
    } else map = pend;
    const k = d + '|' + farm;
    const g = map[k] || (map[k] = { date: d, farm, rows: [], total: 0, photos: [] });
    const c = Number(r[3]) || 0;
    g.rows.push({ row: i + 2, dong: String(r[2] || ''), count: c });
    g.total += c;
    const cell = rt[i][0];
    if (cell) cell.getRuns().forEach(run => { const u = run.getLinkUrl(); if (u && !g.photos.includes(u)) g.photos.push(u); });
  });
  const t0 = new Date(today + 'T00:00:00+09:00').getTime();
  const fin = m => Object.values(m).map(g => Object.assign(g, { days: Math.round((t0 - new Date(g.date + 'T00:00:00+09:00').getTime()) / 864e5) }))
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.farm.localeCompare(b.farm, 'ko'));
  return { groups: fin(pend), done: fin(done) };
}

/** 등록완료 체크/취소 */
function markRows_(rows, done) {
  const sh = pyesaSheet_().getSheetByName('폐사기록');
  ensureCheckCols_(sh);
  const last = sh.getLastRow();
  const now = new Date();
  let n = 0;
  (rows || []).map(Number).filter(r => r >= 2 && r <= last).forEach(r => {
    sh.getRange(r, 7).insertCheckboxes().setValue(!!done);
    sh.getRange(r, 8).setValue(done ? now : '');
    n++;
  });
  return { ok: true, n };
}

/* ---------- 카카오톡 '나에게 보내기' ---------- */
function kakaoProps_() { return PropertiesService.getScriptProperties(); }

/** 1단계: 카카오 앱 키 저장 후, 로그에 나온 주소를 열어 동의 */
function 카카오연결() {
  const key = kakaoProps_().getProperty('KAKAO_REST_KEY');
  if (!key) throw new Error('스크립트 속성 KAKAO_REST_KEY에 카카오 REST API 키를 먼저 넣으세요.');
  const url = 'https://kauth.kakao.com/oauth/authorize?response_type=code&scope=talk_message&client_id=' + key + '&redirect_uri=' + encodeURIComponent(PYESA_EXEC);
  Logger.log(url);
  return url;
}

/** 카카오 동의 후 돌아오는 곳 (doGet에서 호출) */
function kakaoCallback_(p) {
  const html = msg => HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width"><div style="font:18px sans-serif;padding:40px 20px;text-align:center">' + msg + '</div>');
  if (p.error) return html('카카오 연결 취소됨: ' + p.error);
  const P = kakaoProps_();
  const payload = { grant_type: 'authorization_code', client_id: P.getProperty('KAKAO_REST_KEY'), redirect_uri: PYESA_EXEC, code: p.code };
  const sec = P.getProperty('KAKAO_SECRET'); if (sec) payload.client_secret = sec;
  const res = UrlFetchApp.fetch('https://kauth.kakao.com/oauth/token', { method: 'post', payload, muteHttpExceptions: true });
  const j = JSON.parse(res.getContentText());
  if (!j.refresh_token) return html('연결 실패: ' + res.getContentText());
  P.setProperty('KAKAO_REFRESH', j.refresh_token);
  P.setProperty('KAKAO_ACCESS', j.access_token);
  P.setProperty('KAKAO_ACCESS_EXP', String(Date.now() + (j.expires_in - 300) * 1000));
  return html('✓ 카카오톡 연결 완료<br><br>이 창은 닫으셔도 됩니다.');
}

function kakaoToken_() {
  const P = kakaoProps_();
  if (Number(P.getProperty('KAKAO_ACCESS_EXP') || 0) > Date.now()) return P.getProperty('KAKAO_ACCESS');
  const payload = { grant_type: 'refresh_token', client_id: P.getProperty('KAKAO_REST_KEY'), refresh_token: P.getProperty('KAKAO_REFRESH') };
  const sec = P.getProperty('KAKAO_SECRET'); if (sec) payload.client_secret = sec;
  const res = UrlFetchApp.fetch('https://kauth.kakao.com/oauth/token', { method: 'post', payload, muteHttpExceptions: true });
  const j = JSON.parse(res.getContentText());
  if (!j.access_token) throw new Error('카카오 토큰 갱신 실패 (다시 연결 필요): ' + res.getContentText());
  if (j.refresh_token) P.setProperty('KAKAO_REFRESH', j.refresh_token);   // 만료 1달 전부터 새 토큰이 옴
  P.setProperty('KAKAO_ACCESS', j.access_token);
  P.setProperty('KAKAO_ACCESS_EXP', String(Date.now() + (j.expires_in - 300) * 1000));
  return j.access_token;
}

function sendKakao_(text, url, button) {
  const tmpl = { object_type: 'text', text: text.length > 200 ? text.slice(0, 199) + '…' : text,
    link: { web_url: url, mobile_web_url: url }, button_title: button || '확인하기' };
  const res = UrlFetchApp.fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'post', headers: { Authorization: 'Bearer ' + kakaoToken_() },
    payload: { template_object: JSON.stringify(tmpl) }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('카카오 발송 실패: ' + res.getContentText());
}

/** 매일 아침: 피그온 미등록 폐사 알림 (없으면 보내지 않음) */
function 폐사미등록알림() {
  const { groups } = checkGroups_();
  if (!groups.length) return;
  const sum = groups.reduce((a, g) => a + g.total, 0);
  const short = f => f.replace(/농장$|농원$/, '');
  const md = d => Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10));
  let text = `[피그온 미등록] ${groups.length}건 · ${sum}두\n`;
  const lines = groups.map(g => `${md(g.date)} ${short(g.farm)} ${g.total}두${g.days >= 2 ? ' (' + g.days + '일째)' : ''}`);
  for (let i = 0; i < lines.length; i++) {
    const rest = lines.length - i;
    if ((text + lines[i]).length > 185 && rest > 1) { text += `…외 ${rest}건`; break; }
    text += lines[i] + '\n';
  }
  sendKakao_(text.trim(), PYESA_APP + '#check&k=' + PYESA_KEY, '등록 체크하기');
}

/** 테스트 발송 (미등록이 없어도 보냄) */
function 카카오테스트() {
  sendKakao_('[폐사 입력] 카카오톡 알림 연결 테스트입니다.', PYESA_APP + '#check&k=' + PYESA_KEY, '등록 체크하기');
}

/** 매일 알림 시각 설정 (한 번만 실행) */
function 알림시간설정() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '폐사미등록알림').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('폐사미등록알림').timeBased().everyDays(1).atHour(ALERT_HOUR).nearMinute(0).inTimezone('Asia/Seoul').create();
}
