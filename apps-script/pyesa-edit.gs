/* ===================== 폐사 기록 목록·수정 (앱 '목록' 탭) ===================== */
// doGet:  if (p.action === 'list') return json_(listRows_(Number(p.days) || 7));
// doPost: if (b.action === 'edit') return json_(editRow_(b));
function listRows_(days) {
  const from = addDays_(ymd_(new Date()), -Math.min(150, Math.max(1, days) - 1));
  return { ok: true, rows: records_().list.filter(r => r.date >= from).map(r => ({
    row: r.row, date: r.date, farm: r.farm, dong: r.dong, count: r.count, group: r.group, done: r.done, heat: r.heat, photos: r.photos.length, photoUrls: r.photos })) };
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

// 저장 사진 폴더: path_(ids.root, ['폐사사진', farm, date]) — 농장 폴더 안 날짜별 폴더 (2026-11-06부터)
// 한 번 실행한 정리 함수 '폐사사진날짜정리': 예전 월별 폴더 사진 179장을 날짜별 폴더로 옮김
