/* ===================== 중복 저장 막기 · 기록 삭제 ===================== */
// doPost 저장 앞: const dupMsg = dupCheck_(b); if (dupMsg) return json_({ ok: false, dup: true, error: dupMsg }); dupRemember_(b);
// doPost:        if (b.action === 'delete') return json_(deleteRow_(b));
const PH_KEY_ = 'PYESA_PH', PH_HOURS_ = 48;
function phLoad_() {
  let H = {}; try { H = JSON.parse(PropertiesService.getScriptProperties().getProperty(PH_KEY_) || '{}'); } catch (e) {}
  const now = Date.now(); Object.keys(H).forEach(k => { if (now - H[k].t > PH_HOURS_ * 3600e3) delete H[k]; });
  return H;
}
/** 같은 사진(48시간 안) 또는 같은 농장·날짜·동/그룹·두수(10분 안)면 막는다. force면 통과 */
function dupCheck_(b) {
  if (b.force) return null;
  const H = phLoad_();
  const hit = (b.ph || []).map(h => H[h]).find(Boolean);
  if (hit) return `같은 사진이 ${hit.at}에 ${hit.what}(으)로 이미 저장됐습니다`;
  const farm0 = String(b.farm || '').trim(), farm = (typeof PYESA_MERGE !== 'undefined' && PYESA_MERGE[farm0]) || farm0;
  const key = (dong, group, count) => [String(dong || '').replace(/동$/, '').trim(), String(group || '').trim(), Number(count)].join('|');
  const want = (b.rows || []).filter(r => Number(r.count) > 0).map(r => key(r.dong, r.group, r.count)).sort().join(',');
  const sh = records_().sh, last = sh.getLastRow();
  if (last < 2 || !want) return null;
  const n = Math.min(60, last - 1), v = sh.getRange(last - n + 1, 1, n, 10).getValues(), now = Date.now(), by = {};
  v.forEach(r => {
    if (String(r[1]).trim() !== farm || cellYmd_(r[0]) !== b.date) return;
    const t = r[5] instanceof Date ? r[5].getTime() : Date.parse(String(r[5]).trim().replace(' ', 'T') + ':00+09:00');
    if (!(now - t < 10 * 60e3)) return;
    (by[t] = by[t] || []).push(key(r[2], r[9], r[3]));
  });
  return Object.values(by).some(L => L.sort().join(',') === want) ? '같은 내용이 10분 안에 이미 저장됐습니다' : null;
}
function dupRemember_(b) {
  const ph = (b.ph || []).filter(Boolean); if (!ph.length) return;
  const H = phLoad_(), now = Date.now();
  const at = Utilities.formatDate(new Date(), 'Asia/Seoul', 'M/d HH:mm');
  const what = String(b.farm || '').trim() + ' ' + (b.rows || []).filter(r => Number(r.count) > 0).map(r => (r.dong ? r.dong + '동 ' : '') + r.count + '두').join('·');
  ph.forEach(h => { H[h] = { t: now, at, what }; });
  const keys = Object.keys(H).sort((a, c) => H[c].t - H[a].t).slice(0, 90);
  const out = {}; keys.forEach(k => (out[k] = H[k]));
  PropertiesService.getScriptProperties().setProperty(PH_KEY_, JSON.stringify(out));
}
/** 기록 한 줄 삭제 — 그 기록에만 쓰인 사진은 드라이브 휴지통으로 (30일 안에 복구 가능) */
function deleteRow_(b) {
  const recs = records_(), sh = recs.sh, row = Number(b.row);
  if (!(row >= 2 && row <= sh.getLastRow())) throw new Error('없는 기록입니다');
  const cur = sh.getRange(row, 1, 1, 10).getValues()[0], was = b.was || {};
  if (cellYmd_(cur[0]) !== was.date || String(cur[1]).trim() !== was.farm || Number(cur[3]) !== Number(was.count))
    throw new Error('그 사이 기록이 바뀌었습니다. 새로고침 후 다시 해 주세요');
  const me = recs.list.find(r => r.row === row), others = new Set();
  recs.list.forEach(r => { if (r.row !== row) r.photos.forEach(u => others.add(u)); });
  let trashed = 0;
  (me ? me.photos : []).filter(u => !others.has(u)).forEach(u => {
    const id = (String(u).match(/[-\w]{25,}/) || [])[0]; if (!id) return;
    try { DriveApp.getFileById(id).setTrashed(true); trashed++; } catch (e) {}
  });
  sh.deleteRow(row);
  return { ok: true, trashed };
}
