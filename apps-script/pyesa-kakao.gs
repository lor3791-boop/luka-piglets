

/* ===================== 피그온 미등록 체크 + 카카오톡 알림 + 설정 ===================== */
// 폐사기록: G열 = 피그온 등록(체크박스), H열 = 체크 시각, I열 = 구분(폭염)
// 설정 시트: 알림 시각 등 (앱 '설정' 탭에서 바꿈)
// 농장기준 시트: 피그온 순서·코드, 그룹별 전입일·전입두수 (육성율 계산용)
const PYESA_APP = 'https://lor3791-boop.github.io/luka-piglets/pyesa/';
const PYESA_EXEC = 'https://script.google.com/macros/s/AKfycbwmyNqtik9FKDVG2TdNiJxkYDlmX7qIvXm_kcH0Tx_gNc8M56LAfNipZVMWjptc5x3KtQ/exec';
const CHECK_URL_ = () => PYESA_APP + '#check&k=' + PYESA_KEY;
const STATS_URL_ = () => PYESA_APP + '#stats&k=' + PYESA_KEY;

function ymd_(d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd'); }
function addDays_(ymd, n) { const d = new Date(ymd + 'T12:00:00+09:00'); d.setDate(d.getDate() + n); return ymd_(d); }
function dayDiff_(a, b) { return Math.round((new Date(a + 'T12:00:00+09:00') - new Date(b + 'T12:00:00+09:00')) / 864e5); }
function cellYmd_(v) {
  if (v instanceof Date) return ymd_(v);
  const s = String(v || '').trim().replace(/[./]/g, '-');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}
const shortFarm_ = f => String(f).replace(/농장$|농원$/, '');
const md_ = d => Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10));

/* ---------- 설정 ---------- */
const SETTINGS_DEF = [
  { k: '아침알림시각', type: 'hour', def: 8, group: '알림 시각', help: '매일 미등록·주의 알림을 받는 시각' },
  { k: '재알림시각', type: 'hourOpt', def: 17, group: '알림 시각', help: '아침 이후에도 미등록이 남아 있으면 한 번 더 (끔 가능)' },
  { k: '주말알림', type: 'bool', def: true, group: '알림 시각', help: '토·일요일에도 알림 받기' },
  { k: '알림중지시작', type: 'date', def: '', group: '알림 시각', help: '휴가·교육 등 알림을 쉬는 기간 (비우면 계속 받음)' },
  { k: '알림중지끝', type: 'date', def: '', group: '알림 시각', help: '' },
  { k: '육성율경고기준', type: 'num', def: 95, unit: '%', group: '주의 경고', help: '전날 폐사 입력한 농장의 그룹 육성율이 이 값 미만이면 다음날 아침 경고' },
  { k: '급증경보', type: 'bool', def: true, group: '주의 경고', help: '폐사를 저장하는 즉시, 평소보다 많으면 바로 카톡' },
  { k: '급증배수', type: 'num', def: 2, unit: '배', group: '주의 경고', help: '그날 두수가 최근 7일 하루 평균의 몇 배 이상이면 급증' },
  { k: '급증최소두수', type: 'num', def: 3, unit: '두', group: '주의 경고', help: '이 두수 미만이면 급증으로 보지 않음' },
  { k: '미등록강조일수', type: 'num', def: 2, unit: '일', group: '피그온 등록', help: '이 일수 이상 밀린 건은 빨간색·카톡에 "n일째" 표시' },
  { k: '체크화면정렬', type: 'select', opts: ['피그온순', '날짜순'], def: '피그온순', group: '피그온 등록', help: '피그온순 = 피그온 농장 순서대로 묶어서 표시' },
  { k: '주간요약요일', type: 'select', opts: ['월', '화', '수', '목', '금', '토', '일', '끔'], def: '월', group: '주간 요약', help: '지난주 농장별 폐사·육성율 요약 카톡' },
  { k: '주간요약시각', type: 'hour', def: 8, group: '주간 요약', help: '' },
  { k: '폭염표시시작', type: 'mmdd', def: '06-01', group: '폭염', help: '이 기간에만 입력 화면에 폭염 버튼 표시' },
  { k: '폭염표시끝', type: 'mmdd', def: '09-30', group: '폭염', help: '' },
];

function settingsSheet_() {
  const ss = pyesaSheet_();
  let sh = ss.getSheetByName('설정');
  if (!sh) {
    sh = ss.insertSheet('설정');
    sh.getRange(1, 1, 1, 3).setValues([['항목', '값', '설명']]).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
    sh.getRange(2, 1, SETTINGS_DEF.length, 3).setValues(SETTINGS_DEF.map(d => [d.k, settingText_(d, d.def), d.help]));
    sh.getRange('B:B').setNumberFormat('@');
    sh.setColumnWidth(1, 130); sh.setColumnWidth(2, 110); sh.setColumnWidth(3, 480);
    sh.setFrozenRows(1);
  }
  return sh;
}
function settingText_(d, v) {
  if (d.type === 'bool') return v ? '예' : '아니오';
  if (d.type === 'hourOpt' && (v === '' || v == null)) return '끔';
  return String(v == null ? '' : v);
}
function parseSetting_(d, raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (d.type === 'bool') return s === '' ? d.def : /^(예|y|yes|true|1|o|받음|사용)$/i.test(s);
  if (d.type === 'hour') { const n = parseInt(s, 10); return n >= 0 && n <= 23 ? n : d.def; }
  if (d.type === 'hourOpt') { if (/^(끔|없음|-)?$/.test(s)) return ''; const n = parseInt(s, 10); return n >= 0 && n <= 23 ? n : ''; }
  if (d.type === 'num') { const n = parseFloat(s); return isFinite(n) ? n : d.def; }
  if (d.type === 'date') return cellYmd_(raw);
  if (d.type === 'mmdd') { const m = s.match(/(\d{1,2})\D+(\d{1,2})/); return m ? m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : d.def; }
  if (d.type === 'select') return d.opts.includes(s) ? s : d.def;
  return s;
}
let _settings = null;
function settings_() {
  if (_settings) return _settings;
  const sh = settingsSheet_();
  const vals = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).getValues();
  const raw = {}; vals.forEach(r => { if (r[0]) raw[String(r[0]).trim()] = r[1]; });
  const out = {};
  SETTINGS_DEF.forEach(d => { out[d.k] = d.k in raw ? parseSetting_(d, raw[d.k]) : d.def; });
  // 새로 생긴 항목은 시트에 추가
  const missing = SETTINGS_DEF.filter(d => !(d.k in raw));
  if (missing.length) sh.getRange(sh.getLastRow() + 1, 1, missing.length, 3).setValues(missing.map(d => [d.k, settingText_(d, d.def), d.help]));
  return (_settings = out);
}
function saveSettings_(values) {
  const sh = settingsSheet_();
  const cur = settings_();
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim());
  SETTINGS_DEF.forEach(d => {
    if (!(d.k in values)) return;
    const v = parseSetting_(d, d.type === 'bool' ? (values[d.k] ? '예' : '아니오') : values[d.k]);
    cur[d.k] = v;
    const i = rows.indexOf(d.k);
    if (i >= 0) sh.getRange(i + 2, 2).setValue(settingText_(d, v));
  });
  return cur;
}
function heatOn_(S, today) {
  const md = today.slice(5);
  return S.폭염표시시작 <= S.폭염표시끝 ? md >= S.폭염표시시작 && md <= S.폭염표시끝 : md >= S.폭염표시시작 || md <= S.폭염표시끝;
}

/* ---------- 농장기준 (피그온 순서·코드, 그룹 전입) ---------- */
const FARM_SEED = [
  ['골드피그(금종찬)', 'P200183', '골드피그'], ['명임', 'P200132', '명임농장'], ['민서', 'P200060', '민서농장'],
  ['산성농원', 'P200062', '산성농원'], ['세희', 'P200063', '세희농장'], ['아멘', 'P200065', '아멘농장'],
  ['욥', 'P200071', '욥농장'], ['용암농장', 'P200170', '용암농장'], ['원가림', 'P200136', '원가림농장'],
  ['자돈_루카', 'P200165', '루카농장'], ['재성(박상배)', 'P200178', '재성농장'], ['정축산', 'P200160', '정축산'],
  ['평지', 'P200161', '평지농장'],
];
const FARM_HEAD = ['순서', '피그온 농장명', '피그온 코드', '앱 농장명', '그룹', '전입일', '전입두수(실두수)', '동(쉼표, 비우면 전체)', '피그온 누계감소(실두수-전출판매-재고)', '피그온 기준시각', '사용(Y/N)'];
function farmSheet_() {
  const ss = pyesaSheet_();
  let sh = ss.getSheetByName('농장기준');
  if (!sh) {
    sh = ss.insertSheet('농장기준');
    sh.getRange(1, 1, 1, FARM_HEAD.length).setValues([FARM_HEAD]).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF').setWrap(true);
    sh.getRange(2, 1, FARM_SEED.length, 11).setValues(FARM_SEED.map((f, i) => [i + 1, f[0], f[1], f[2], '', '', '', '', '', '', 'Y']));
    sh.getRange('F:F').setNumberFormat('yyyy-mm-dd'); sh.getRange('J:J').setNumberFormat('yyyy-mm-dd');
    sh.getRange('E:E').setNumberFormat('@'); sh.getRange('H:H').setNumberFormat('@');
    sh.setColumnWidths(1, 11, 100); sh.setColumnWidth(7, 150); sh.setColumnWidth(8, 150);
    sh.setFrozenRows(1);
    sh.getRange(FARM_SEED.length + 3, 1).setValue(FARM_NOTE);
  }
  return sh;
}
const FARM_NOTE = '※ 육성율 = (실두수 − 피그온 누계감소 − 기준시각 이후 앱 폐사) ÷ 실두수 = (전출판매+재고) ÷ 실두수. 앱 폐사 중 기준시각 전에 이미 피그온 등록 체크한 것은 누계에 들어 있으므로 빼고 계산합니다. 동을 적으면 그 동 폐사만 그 그룹에 들어가고, 동이 없는 그룹이 여럿이면 재고 비율로 나눕니다(추정). 설정 → 전입현황 올리기로 언제든 다시 맞출 수 있습니다.';
function baseTime_(v) {
  if (v instanceof Date) return v;
  const d = cellYmd_(v);
  return d ? new Date(d + 'T23:59:59+09:00') : null;
}
let _farms = null;
function farmInfo_() {
  if (_farms) return _farms;
  const sh = farmSheet_();
  const last = sh.getLastRow();
  const v = last > 1 ? sh.getRange(2, 1, last - 1, 11).getValues() : [];
  const map = {};
  v.forEach(r => {
    const app = String(r[3] || '').trim(); if (!app) return;
    const f = map[app] || (map[app] = { app, order: Number(r[0]) || 999, pigon: String(r[1] || '').trim(), code: String(r[2] || '').trim(), use: true, groups: [] });
    if (!f.pigon && r[1]) f.pigon = String(r[1]).trim();
    if (!f.code && r[2]) f.code = String(r[2]).trim();
    if (String(r[10]).trim().toUpperCase() === 'N' && !r[4]) f.use = false;
    const inDate = cellYmd_(r[5]), cnt = Number(r[6]) || 0;
    if (inDate && cnt > 0 && String(r[10]).trim().toUpperCase() !== 'N') {
      f.groups.push({ name: String(r[4] || '').trim() || md_(inDate) + ' 전입', inDate, count: cnt,
        dongs: String(r[7] || '').split(/[,\s·/]+/).map(s => s.replace(/동$/, '').trim()).filter(Boolean),
        prev: Number(r[8]) || 0, baseTime: baseTime_(r[9]) });
    }
  });
  return (_farms = map);
}

/* ---------- 폐사기록 읽기 ---------- */
function ensureCheckCols_(sh) {
  if (sh.getRange(1, 9).getValue() === '구분') return;
  sh.getRange(1, 7, 1, 3).setValues([['피그온 등록', '등록 체크시각', '구분']]).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
  sh.getRange('H:H').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.setColumnWidths(7, 3, 100);
}
let _recs = null;
function records_() {
  if (_recs) return _recs;
  const sh = pyesaSheet_().getSheetByName('폐사기록');
  ensureCheckCols_(sh);
  const last = sh.getLastRow();
  if (last < 2) return (_recs = { sh, list: [] });
  const n = last - 1;
  const v = sh.getRange(2, 1, n, 9).getValues();
  const rt = sh.getRange(2, 5, n, 1).getRichTextValues();
  const list = [];
  v.forEach((r, i) => {
    const date = cellYmd_(r[0]), farm = String(r[1] || '').trim();
    if (!date || !farm) return;
    const photos = [];
    const cell = rt[i][0];
    if (cell) cell.getRuns().forEach(run => { const u = run.getLinkUrl(); if (u && !photos.includes(u)) photos.push(u); });
    list.push({ row: i + 2, date, farm, dong: String(r[2] || '').replace(/동$/, '').trim(), count: Number(r[3]) || 0,
      done: r[6] === true, doneAt: r[7] instanceof Date ? r[7] : null, heat: /폭염/.test(String(r[8] || '')), photos });
  });
  return (_recs = { sh, list });
}

/* ---------- 미등록 묶음 ---------- */
function checkGroups_() {
  const recs = records_().list, today = ymd_(new Date());
  const pend = {}, done = {};
  recs.forEach(r => {
    let map;
    if (r.done) { if (!r.doneAt || ymd_(r.doneAt) !== today) return; map = done; } else map = pend;
    const k = r.date + '|' + r.farm;
    const g = map[k] || (map[k] = { date: r.date, farm: r.farm, rows: [], total: 0, heat: 0, photos: [] });
    g.rows.push({ row: r.row, dong: r.dong, count: r.count, heat: r.heat });
    g.total += r.count; if (r.heat) g.heat += r.count;
    r.photos.forEach(u => { if (!g.photos.includes(u)) g.photos.push(u); });
  });
  const fin = m => Object.values(m).map(g => Object.assign(g, { days: dayDiff_(today, g.date) }))
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.farm.localeCompare(b.farm, 'ko'));
  return { groups: fin(pend), done: fin(done) };
}

function markRows_(rows, done) {
  const sh = records_().sh;
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

/* ---------- 육성율 ---------- */
/** 앱 폐사 기록이 이 그룹의 피그온 누계에 아직 안 들어 있으면 true */
function notInPigon_(r, g) {
  if (r.date < g.inDate) return false;
  if (!g.baseTime) return true;
  return !(r.done && r.doneAt && r.doneAt <= g.baseTime);
}
/** 그룹별 누적폐사·육성율. 동이 적힌 그룹은 그 동만, 나머지는 동 없는 그룹에 (여럿이면 재고 비율로 나눔) */
function groupStats_(asOf) {
  const farms = farmInfo_(), recs = records_().list;
  const out = [];
  Object.values(farms).forEach(f => {
    if (!f.groups.length) return;
    const acc = f.groups.map(g => ({ g, dead: g.prev, heat: 0, last: '', est: 0 }));
    const open = acc.filter(a => !a.g.dongs.length);
    recs.forEach(r => {
      if (r.farm !== f.app || r.date > asOf) return;
      let targets = acc.filter(a => a.g.dongs.includes(r.dong) && notInPigon_(r, a.g));
      let shares;
      if (targets.length) shares = targets.map(() => 1 / targets.length);
      else {
        targets = open.filter(a => notInPigon_(r, a.g));
        if (!targets.length) return;
        const alive = targets.map(a => Math.max(a.g.count - a.g.prev, 1));
        const sum = alive.reduce((x, y) => x + y, 0);
        shares = alive.map(x => x / sum);
      }
      targets.forEach((a, i) => {
        a.dead += r.count * shares[i];
        if (r.heat) a.heat += r.count * shares[i];
        if (shares[i] < 1) a.est += r.count * shares[i];
        if (r.date > a.last) a.last = r.date;
      });
    });
    acc.forEach(a => {
      const g = a.g;
      const r1 = x => Math.round(x * 10) / 10;
      out.push({ farm: f.app, order: f.order, group: g.name, inDate: g.inDate, count: g.count,
        dead: r1(a.dead), heat: r1(a.heat), est: r1(a.est),
        rate: r1((g.count - a.dead) / g.count * 100), rateHeat: r1((g.count - a.dead + a.heat) / g.count * 100),
        lastDate: a.last, dongs: g.dongs });
    });
  });
  return out.sort((a, b) => a.order - b.order || (a.inDate < b.inDate ? -1 : 1));
}

/** 피그온 전입현황(앱에서 엑셀을 읽어 보낸 그룹 목록)으로 농장기준 시트 다시 채우기 */
function importGroups_(groups, baseIso) {
  const sh = farmSheet_();
  const base = baseIso ? new Date(baseIso) : new Date();
  const last = sh.getLastRow();
  const old = last > 1 ? sh.getRange(2, 1, last - 1, 11).getValues().filter(r => r[3]) : [];
  const norm = s => String(s || '').replace(/\s/g, '');
  // 피그온 농장명 → 기존 행 정보 (순서·코드·앱 농장명·동·사용)
  const farmsOrder = [], info = {}, dongs = {};
  old.forEach(r => {
    const k = norm(r[1]);
    if (!info[k]) { info[k] = { order: r[0], pigon: r[1], code: r[2], app: r[3], use: String(r[10] || 'Y') }; farmsOrder.push(k); }
    if (r[4] && r[7]) dongs[k + '|' + r[4]] = r[7];
  });
  const byFarm = {};
  let matched = 0, skipped = {};
  (groups || []).forEach(g => {
    const k = norm(g.farm);
    if (!info[k]) { skipped[g.farm] = 1; return; }
    (byFarm[k] = byFarm[k] || []).push(g); matched++;
  });
  const rows = [];
  farmsOrder.forEach(k => {
    const f = info[k], list = (byFarm[k] || []).sort((a, b) => a.inDate < b.inDate ? -1 : 1);
    if (!list.length) { rows.push([f.order, f.pigon, f.code, f.app, '', '', '', '', '', '', /^n$/i.test(f.use) ? 'N' : 'Y']); return; }
    list.forEach(g => rows.push([f.order, f.pigon, f.code, f.app, g.group, new Date(g.inDate + 'T00:00:00+09:00'), g.count,
      dongs[k + '|' + g.group] || '', g.prev, base, 'Y']));
  });
  sh.getRange(2, 1, Math.max(last, 2), 11).clearContent();
  sh.getRange(1, 1, 1, FARM_HEAD.length).setValues([FARM_HEAD]);
  if (rows.length) sh.getRange(2, 1, rows.length, 11).setValues(rows);
  sh.getRange('F:F').setNumberFormat('yyyy-mm-dd'); sh.getRange('J:J').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(rows.length + 3, 1).setValue(FARM_NOTE);
  _farms = null;
  return { ok: true, groups: matched, rows: rows.length, skipped: Object.keys(skipped) };
}

/** 전날 폐사 입력한 농장 중 육성율 기준 미만 그룹 */
function rearingAlerts_(S, today) {
  const y = addDays_(today, -1);
  const farmsY = new Set(records_().list.filter(r => r.date === y).map(r => r.farm));
  return groupStats_(y).filter(g => farmsY.has(g.farm) && g.rate < S.육성율경고기준);
}
/** 전날 입력이 없는 농장 (농장기준 사용=Y) */
function missingFarms_(today) {
  const y = addDays_(today, -1);
  const has = new Set(records_().list.filter(r => r.date === y).map(r => r.farm));
  const farms = farmInfo_();
  const names = farmNames_();
  return names.filter(n => !has.has(n) && !(farms[n] && !farms[n].use))
    .sort((a, b) => ((farms[a] || {}).order || 999) - ((farms[b] || {}).order || 999));
}
const rateTxt_ = g => g.rate.toFixed(1) + '%' + (g.heat ? ` (폭염포함 ${g.rateHeat.toFixed(1)}%)` : '');

/* ---------- 폐사 급증 (저장 즉시) ---------- */
function spikeCheck_(farm, date) {
  const S = settings_();
  if (!S.급증경보 || date !== ymd_(new Date())) return null;
  const recs = records_().list.filter(r => r.farm === farm);
  const day = recs.filter(r => r.date === date).reduce((a, r) => a + r.count, 0);
  const from = addDays_(date, -7);
  const prev = recs.filter(r => r.date >= from && r.date < date).reduce((a, r) => a + r.count, 0);
  const avg = prev / 7;
  if (day < S.급증최소두수 || (avg > 0 && day < avg * S.급증배수)) return null;
  const P = PropertiesService.getScriptProperties(), key = 'SPIKE_' + date + '_' + farm;
  if (Number(P.getProperty(key) || 0) >= day) return null;
  P.setProperty(key, String(day));
  const text = `[⚠ 폐사 급증] ${shortFarm_(farm)} ${md_(date)}\n오늘 ${day}두 (최근 7일 하루평균 ${avg.toFixed(1)}두)\n농장에 원인 확인이 필요합니다.`;
  sendKakao_(text, CHECK_URL_(), '폐사 내역 보기');
  return text;
}

/* ---------- 카카오톡 '나에게 보내기' ---------- */
function kakaoProps_() { return PropertiesService.getScriptProperties(); }

function 카카오연결() { const u = kakaoAuthUrl_(); Logger.log(u); return u; }
function kakaoAuthUrl_() {
  const key = kakaoProps_().getProperty('KAKAO_REST_KEY');
  if (!key) throw new Error('카카오 REST API 키가 아직 등록되지 않았습니다.');
  return 'https://kauth.kakao.com/oauth/authorize?response_type=code&scope=talk_message&client_id=' + key + '&redirect_uri=' + encodeURIComponent(PYESA_EXEC);
}

function kakaoCallback_(p) {
  const html = msg => HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width"><div style="font:18px sans-serif;padding:40px 20px;text-align:center;line-height:1.6">' + msg + '</div>');
  if (p.error) return html('카카오 연결 취소됨: ' + p.error);
  const P = kakaoProps_();
  const payload = { grant_type: 'authorization_code', client_id: P.getProperty('KAKAO_REST_KEY'), redirect_uri: PYESA_EXEC, code: p.code };
  const sec = P.getProperty('KAKAO_SECRET') || P.getProperty('KAKAO_SECRE'); if (sec) payload.client_secret = sec;
  const res = UrlFetchApp.fetch('https://kauth.kakao.com/oauth/token', { method: 'post', payload, muteHttpExceptions: true });
  const j = JSON.parse(res.getContentText());
  if (!j.refresh_token) return html('연결 실패: ' + res.getContentText());
  P.setProperty('KAKAO_REFRESH', j.refresh_token);
  P.setProperty('KAKAO_ACCESS', j.access_token);
  P.setProperty('KAKAO_ACCESS_EXP', String(Date.now() + (j.expires_in - 300) * 1000));
  P.deleteProperty('KAKAO_ERROR');
  try { sendKakao_('[폐사 입력] 카카오톡 알림이 연결되었습니다.', CHECK_URL_(), '앱 열기'); } catch (e) {}
  return html('✓ 카카오톡 연결 완료<br>카톡으로 확인 메시지를 보냈습니다.<br><br>이 창은 닫으셔도 됩니다.');
}

function kakaoToken_() {
  const P = kakaoProps_();
  if (Number(P.getProperty('KAKAO_ACCESS_EXP') || 0) > Date.now()) return P.getProperty('KAKAO_ACCESS');
  if (!P.getProperty('KAKAO_REFRESH')) throw new Error('카카오톡이 아직 연결되지 않았습니다 (설정 → 카카오 연결)');
  const payload = { grant_type: 'refresh_token', client_id: P.getProperty('KAKAO_REST_KEY'), refresh_token: P.getProperty('KAKAO_REFRESH') };
  const sec = P.getProperty('KAKAO_SECRET') || P.getProperty('KAKAO_SECRE'); if (sec) payload.client_secret = sec;
  const res = UrlFetchApp.fetch('https://kauth.kakao.com/oauth/token', { method: 'post', payload, muteHttpExceptions: true });
  const j = JSON.parse(res.getContentText());
  if (!j.access_token) throw new Error('카카오 연결이 끊겼습니다. 설정에서 다시 연결해 주세요. ' + res.getContentText());
  if (j.refresh_token) P.setProperty('KAKAO_REFRESH', j.refresh_token);
  P.setProperty('KAKAO_ACCESS', j.access_token);
  P.setProperty('KAKAO_ACCESS_EXP', String(Date.now() + (j.expires_in - 300) * 1000));
  return j.access_token;
}

function sendKakao_(text, url, button) {
  const P = kakaoProps_();
  try {
    const tmpl = { object_type: 'text', text: text.length > 200 ? text.slice(0, 199) + '…' : text,
      link: { web_url: url, mobile_web_url: url }, button_title: button || '확인하기' };
    const res = UrlFetchApp.fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'post', headers: { Authorization: 'Bearer ' + kakaoToken_() },
      payload: { template_object: JSON.stringify(tmpl) }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('카카오 발송 실패: ' + res.getContentText());
    P.setProperty('KAKAO_LAST', ymd_(new Date()) + ' ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm'));
    P.deleteProperty('KAKAO_ERROR');
  } catch (e) {
    P.setProperty('KAKAO_ERROR', Utilities.formatDate(new Date(), 'Asia/Seoul', 'MM/dd HH:mm') + ' ' + String(e.message || e).slice(0, 300));
    throw e;
  }
}

/** 제목 + 여러 줄을 카톡 200자 제한에 맞춰 나눠 보냄 */
/** 제목 + 여러 줄을 카톡 200자 제한에 맞춰 나눔 (보낼 글 목록) */
function chunkLines_(title, lines) {
  const chunks = []; let cur = title;
  lines.forEach(l => {
    if ((cur + '\n' + l).length > 195) { chunks.push(cur); cur = title + ' (계속)\n' + l; }
    else cur += '\n' + l;
  });
  chunks.push(cur);
  return chunks;
}
function sendLines_(title, lines, url, button) {
  chunkLines_(title, lines).forEach(c => sendKakao_(c, url, button));
}

/* ---------- 알림 내용 ---------- */
function pendingLines_(S) {
  const { groups } = checkGroups_();
  const farms = farmInfo_();
  const ord = f => (farms[f] || {}).order || 999;
  if (S.체크화면정렬 === '피그온순') groups.sort((a, b) => ord(a.farm) - ord(b.farm) || (a.date < b.date ? -1 : 1));
  return { groups, lines: groups.map(g => `${md_(g.date)} ${shortFarm_(g.farm)} ${g.total}두${g.heat ? '(폭염' + g.heat + ')' : ''}${g.days >= S.미등록강조일수 ? ' ⚠' + g.days + '일째' : ''}`) };
}

/** 아침 알림 한 통: ① 피그온 미등록(맨 위) ② 육성율 주의 */
function morningLines_(S, today) {
  const { groups, lines: pl } = pendingLines_(S);
  const lines = [];
  if (groups.length) {
    const sum = groups.reduce((a, g) => a + g.total, 0);
    lines.push(`■ 피그온 미등록 ${groups.length}건 · ${sum}두`, ...pl);
  } else lines.push('■ 피그온 미등록 없음 ✓');
  const ra = rearingAlerts_(S, today);
  if (ra.length) {
    lines.push('', `■ ⚠ 육성율 ${S.육성율경고기준}% 미만 (어제 폐사 입력 농장)`);
    ra.forEach(g => lines.push(`${shortFarm_(g.farm)} ${g.group} ${rateTxt_(g)}`));
  }
  const wd = '일월화수목금토'[new Date(today + 'T12:00:00+09:00').getDay()];
  return { title: `[폐사 아침 알림] ${md_(today)}(${wd})`, lines, pending: groups.length, warn: ra.length };
}
function 아침알림_(S, today) {
  const m = morningLines_(S, today);
  if (!m.pending && !m.warn && m.lines.length <= 1) return;   // 보낼 내용 없음
  sendLines_(m.title, m.lines, m.pending ? CHECK_URL_() : STATS_URL_(), m.pending ? '등록 체크하기' : '육성율 보기');
}
function morningPreview_() {
  const S = settings_(), today = ymd_(new Date(Date.now() + 864e5));   // 내일 아침 기준
  const m = morningLines_(S, today);
  return { ok: true, date: today, messages: chunkLines_(m.title, m.lines), note: '오늘 밤까지 입력·체크한 내용 기준 (내일 아침에 다시 계산)' };
}

function 재알림_(S) {
  const { groups, lines } = pendingLines_(S);
  if (!groups.length) return;
  sendLines_(`[피그온 미등록 · 재알림] ${groups.length}건 남음`, lines, CHECK_URL_(), '등록 체크하기');
}

function 주간요약_(S, today) {
  const recs = records_().list;
  // 어제까지 7일 vs 그 전 7일 (월요일에 받으면 지난주 월~일)
  const a0 = addDays_(today, -7), a1 = addDays_(today, -1), b0 = addDays_(today, -14), b1 = addDays_(today, -8);
  const sum = (f, s, e) => recs.filter(r => r.farm === f && r.date >= s && r.date <= e).reduce((x, r) => x + r.count, 0);
  const farms = farmInfo_();
  const stats = groupStats_(a1);
  const names = farmNames_().sort((a, b) => ((farms[a] || {}).order || 999) - ((farms[b] || {}).order || 999));
  const lines = [];
  let tot = 0;
  names.forEach(f => {
    if (farms[f] && !farms[f].use) return;
    const w = sum(f, a0, a1), p = sum(f, b0, b1); tot += w;
    const diff = w - p ? (w > p ? ` ▲${w - p}` : ` ▼${p - w}`) : '';
    const rates = stats.filter(g => g.farm === f).map(g => g.rate.toFixed(1) + '%' + (g.rate < S.육성율경고기준 ? '⚠' : '')).join('/');
    lines.push(`${shortFarm_(f)} ${w}두${diff}${rates ? ' · ' + rates : ''}`);
  });
  sendLines_(`[주간 폐사] ${md_(a0)}~${md_(a1)} 합계 ${tot}두`, lines, STATS_URL_(), '육성율 보기');
}

/** 매시간 실행: 설정한 시각이 되면 알림 (설정 바꾸면 바로 반영) */
function 알림점검() {
  const S = settings_();
  const now = new Date(), today = ymd_(now);
  const h = Number(Utilities.formatDate(now, 'Asia/Seoul', 'H'));
  const dow = '일월화수목금토'[Number(Utilities.formatDate(now, 'Asia/Seoul', 'u')) % 7];
  if (S.알림중지시작 && S.알림중지끝 && today >= S.알림중지시작 && today <= S.알림중지끝) return;
  if (!S.주말알림 && (dow === '토' || dow === '일')) return;
  const P = PropertiesService.getScriptProperties();
  const once = (tag, fn) => {
    const k = 'SENT_' + tag;
    if (P.getProperty(k) === today) return;
    try { fn(); P.setProperty(k, today); } catch (e) { Logger.log(tag + ' 실패: ' + e); }
  };
  if (h === S.아침알림시각) once('AM', () => 아침알림_(S, today));
  if (S.재알림시각 !== '' && h === S.재알림시각 && h !== S.아침알림시각) once('PM', () => 재알림_(S));
  if (S.주간요약요일 === dow && h === S.주간요약시각) once('WEEK', () => 주간요약_(S, today));
}

/** 처음 한 번 실행: 매시간 알림 점검 트리거 설치 */
function 알림설치() {
  ScriptApp.getProjectTriggers().filter(t => ['폐사미등록알림', '알림점검'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('알림점검').timeBased().everyHours(1).create();
  settings_(); farmSheet_();
}

/** 지금 바로 아침 알림 내용을 보냄 (테스트용) */
function 아침알림테스트() { 아침알림_(settings_(), ymd_(new Date())); }

/* ---------- 앱 API ---------- */
function apiPending_() {
  const S = settings_(), today = ymd_(new Date());
  const farms = farmInfo_();
  const order = {};
  Object.values(farms).forEach(f => { order[f.app] = { order: f.order, code: f.code, pigon: f.pigon }; });
  const stats = groupStats_(today);
  return Object.assign({ ok: true }, checkGroups_(), {
    order, sort: S.체크화면정렬, lateDays: S.미등록강조일수, threshold: S.육성율경고기준,
    alerts: rearingAlerts_(S, today), stats,
  });
}
function apiSettings_() {
  const P = kakaoProps_();
  return { ok: true, defs: SETTINGS_DEF, values: settings_(),
    kakao: { key: !!P.getProperty('KAKAO_REST_KEY'), connected: !!P.getProperty('KAKAO_REFRESH'), last: P.getProperty('KAKAO_LAST') || '', error: P.getProperty('KAKAO_ERROR') || '' },
    sheetUrl: pyesaSheet_().getUrl(), farmSheetGid: farmSheet_().getSheetId(), settingSheetGid: settingsSheet_().getSheetId() };
}
