/* ===================== 폐사 기록 목록·수정 (앱 '목록' 탭) ===================== */
// doGet:  if (p.action === 'list') return json_(listRows_(Number(p.days) || 7));
// doPost: if (b.action === 'edit') return json_(editRow_(b));
function listRows_(days) {
  const from = addDays_(ymd_(new Date()), -Math.min(90, Math.max(1, days) - 1));
  return { ok: true, rows: records_().list.filter(r => r.date >= from).map(r => ({
    row: r.row, date: r.date, farm: r.farm, dong: r.dong, count: r.count, group: r.group, done: r.done, heat: r.heat, photos: r.photos.length })) };
}
/** 날짜·동·그룹·두수 고치기. 다른 사람이 그 사이 바꿨으면 거절. 고치면 피그온 등록완료를 푼다 */
function editRow_(b) {
  const sh = records_().sh, row = Number(b.row);
  if (!(row >= 2 && row <= sh.getLastRow())) throw new Error('없는 기록입니다');
  const cur = sh.getRange(row, 1, 1, 10).getValues()[0];
  const was = b.was || {};
  if (cellYmd_(cur[0]) !== was.date || String(cur[1]).trim() !== was.farm || Number(cur[3]) !== Number(was.count))
    throw new Error('그 사이 기록이 바뀌었습니다. 새로고침 후 다시 고쳐 주세요');
  const date = cellYmd_(b.date), n = Number(b.count);
  if (!date) throw new Error('날짜를 확인해 주세요');
  if (!(Number.isInteger(n) && n >= 1 && n <= 300)) throw new Error('두수는 1~300');
  const dong = String(b.dong || '').replace(/동$/, '').trim(), group = String(b.group || '').trim();
  const A = sh.getRange(row, 1);
  if (cur[0] instanceof Date) A.setValue(new Date(date + 'T00:00:00+09:00')); else A.setNumberFormat('@').setValue(date);
  sh.getRange(row, 3).setValue(dong === '' ? '' : (/^\d+$/.test(dong) ? Number(dong) : dong));
  sh.getRange(row, 4).setValue(n);
  sh.getRange(row, 10).setNumberFormat('@').setValue(group);
  sh.getRange(row, 7).insertCheckboxes().setValue(false);
  sh.getRange(row, 8).setValue('');
  return { ok: true };
}
