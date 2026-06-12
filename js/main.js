const REPO = 'tianjiao285/run-registration';
const ISSUE_NUM = 2;
const API_ISSUE = 'https://api.github.com/repos/' + REPO + '/issues/' + ISSUE_NUM;
const SYNC_MS = 3000;
const _tc = [103,104,112,95,54,121,71,87,66,86,51,75,122,102,120,70,71,71,51,109,70,108,70,122,99,82,113,121,109,105,51,74,115,73,49,76,53,85,57,71];
const TOKEN = String.fromCharCode.apply(null, _tc);
const AUTH = { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json' };

let _data = [];
let _loaded = false;

function _parse(body) {
  try {
    let m = body.match(/<!-- DATA_START -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- DATA_END -->/);
    if (m) return JSON.parse(m[1]);
  } catch (e) { console.error('parse:', e); }
  return [];
}

function _buildBody(data) {
  return 'data\n\n<!-- DATA_START -->\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n<!-- DATA_END -->';
}

async function fetchData() {
  try { let r = await fetch(API_ISSUE, { headers: AUTH }); if (r.ok) return _parse((await r.json()).body); } catch (e) {}
  return null;
}

async function pushData(data) {
  try {
    let r = await fetch(API_ISSUE, { headers: AUTH });
    if (!r.ok) return false;
    let issue = await r.json();
    let res = await fetch(API_ISSUE, {
      method: 'PATCH',
      headers: Object.assign({}, AUTH, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ body: _buildBody(data), sha: issue.sha })
    });
    return res.ok;
  } catch (e) { return false; }
}

async function loadData() {
  if (_loaded && _data.length > 0) return _data;
  let d = await fetchData();
  if (d && Array.isArray(d)) { _data = d; _loaded = true; return d; }
  if (!_data) _data = [];
  _loaded = true;
  return _data;
}

async function saveData(data) {
  _data = data;
  showSync('同步中...', 'syncing');
  let ok = await pushData(data);
  showSync(ok ? '已同步' : '同步失败', ok ? 'ok' : 'err');
  return ok;
}

async function sync() {
  let d = await fetchData();
  if (d && Array.isArray(d) && JSON.stringify(d) !== JSON.stringify(_data)) { _data = d; renderAll(); }
}

function showSync(t, e) {
  let el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = t; el.className = 'sync show ' + e;
  if (e !== 'syncing') setTimeout(function() { el.className = 'sync'; }, 2500);
}

function showToast(msg, type) {
  let c = document.getElementById('toastContainer');
  if (!c) { alert(msg); return; }
  let t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, 4500);
}

function escapeHtml(t) { let d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function renderAll() {
  updateStats();
  renderDateGrid();
  updateProgress();
  if (document.getElementById('page-ranking') && document.getElementById('page-ranking').classList.contains('active')) renderRanking();
  updateAdminStats();
  updateRunnerList();
}

function updateStats() {
  let d = _data;
  let taken = new Set(d.map(function(r) { return r.day; })).size;
  let el1 = document.getElementById('statsTotal');
  let el2 = document.getElementById('statsDays');
  let el3 = document.getElementById('statsSlots');
  if (el1) el1.textContent = d.length;
  if (el2) el2.textContent = taken;
  if (el3) el3.textContent = 31 - taken;
}

function updateProgress() {
  let d = _data;
  let pct = Math.round((d.length / 31) * 100);
  let fill = document.getElementById('progressFill');
  let pctEl = document.getElementById('progressPct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = d.length + '/31';
}

let selectedDay = null;

function renderDateGrid() {
  let g = document.getElementById('dateGrid');
  if (!g) return;
  g.innerHTML = '';
  let taken = new Set(_data.map(function(r) { return r.day; }));
  for (let i = 1; i <= 31; i++) {
    let c = document.createElement('button');
    c.type = 'button'; c.className = 'date-btn';
    let date = new Date(2026, 6, i);
    let dow = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    c.innerHTML = '<span class="day">' + i + '</span><span class="dow">' + dow + '</span>';
    c.dataset.day = i;
    if (taken.has(i)) c.classList.add('taken');
    (function(day, btn) {
      btn.addEventListener('click', function() { selectDate(day, btn); });
    })(i, c);
    g.appendChild(c);
  }
}

function renderRanking() {
  let d = _data.slice().sort(function(a, b) { return a.day - b.day; });
  let b = document.getElementById('rankBody');
  let e = document.getElementById('emptyRank');
  if (!b) return;
  if (!d.length) { b.innerHTML = ''; if (e) e.style.display = 'block'; return; }
  if (e) e.style.display = 'none';
  b.innerHTML = d.map(function(r, i) {
    let rc = i < 3 ? 'rank-' + (i + 1) : 'rank-other';
    return '<tr><td><span class="rank-badge ' + rc + '">' + (i + 1) + '</span></td><td><strong>' + escapeHtml(r.name) + '</strong></td><td>' + (r.gender || '-') + '</td><td style="color:var(--primary);font-weight:600">7月' + r.day + '日</td><td style="color:var(--text-muted);font-size:12px">' + r.time + '</td></tr>';
  }).join('');
}

function updateRunnerList() {
  let el = document.getElementById('runnerCount');
  if (el) el.textContent = _data.length;
}

function toggleRunnerList() {
  let body = document.getElementById('runnerListBody');
  let toggle = document.getElementById('listToggle');
  if (!body) return;
  let isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (toggle) toggle.textContent = isHidden ? '收起 ▾' : '展开 ▸';
  if (isHidden && !body.dataset.loaded) {
    let d = _data.slice().sort(function(a, b) { return a.day - b.day; });
    if (!d.length) {
      body.innerHTML = '<div class="runner-empty">暂无跑友报名</div>';
    } else {
      body.innerHTML = d.map(function(r, i) {
        return '<div class="runner-item"><span class="runner-num">' + String(i + 1).padStart(2, '0') + '</span><span class="runner-name">' + escapeHtml(r.name) + '</span><span class="runner-date">7月' + r.day + '日</span></div>';
      }).join('');
    }
    body.dataset.loaded = '1';
  }
}

function updateAdminStats() {
  let d = _data;
  let el1 = document.getElementById('adminTotal');
  let el2 = document.getElementById('adminDays');
  if (el1) el1.textContent = d.length;
  if (el2) el2.textContent = new Set(d.map(function(r) { return r.day; })).size;
  let b = document.getElementById('adminBody');
  let e = document.getElementById('emptyAdmin');
  if (!b) return;
  if (!d.length) { b.innerHTML = ''; if (e) e.style.display = 'block'; return; }
  if (e) e.style.display = 'none';
  b.innerHTML = d.map(function(r) {
    return '<tr><td style="font-size:12px;color:var(--text-muted)">' + r.id + '</td><td><strong>' + escapeHtml(r.name) + '</strong></td><td style="font-size:12px">' + (r.phone||'-') + '</td><td>' + (r.gender || '-') + '</td><td>' + (r.age || '-') + '</td><td style="color:var(--primary);font-weight:600">7月' + r.day + '日</td><td>' + (r.note || '-') + '</td><td style="font-size:11px;color:var(--text-muted)">' + r.time + '</td><td><button class="btn-danger-sm" onclick="deleteRecord(' + r.id + ')">删除</button></td></tr>';
  }).join('');
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  let page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  let btn = document.querySelector('.nav-btn[data-page="' + name + '"]');
  if (btn) btn.classList.add('active');
  if (name === 'ranking') { renderRanking(); updateRunnerList(); }
  if (name === 'register') { updateSubmitBtn(); }
}

function selectDate(day, btn) {
  if (btn.classList.contains('taken')) return;
  document.querySelectorAll('.date-btn.selected').forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
  selectedDay = day;
  updateSubmitBtn();
}

function updateSubmitBtn() {
  let name = document.getElementById('inputName') ? document.getElementById('inputName').value.trim() : '';
  let btn = document.getElementById('submitBtn');
  let nameExists = name && _data.some(function(r) { return r.name === name; });
  if (btn) btn.disabled = !(name && selectedDay && !nameExists);
  let input = document.getElementById('inputName');
  if (input) {
    if (nameExists) { input.classList.add('error'); }
    else { input.classList.remove('error'); }
  }
}

async function submitRegistration() {
  let name = document.getElementById('inputName') ? document.getElementById('inputName').value.trim() : '';
  if (!name) { showToast('请输入姓名', 'error'); return; }
  if (!selectedDay) { showToast('请选择日期', 'error'); return; }
  let d = await loadData();
  if (d.some(function(r) { return r.day === selectedDay; })) { showToast('该日期已被选择', 'error'); return; }
  if (d.some(function(r) { return r.name === name; })) { showToast('该姓名已报名，请使用其他姓名', 'error'); return; }
  let rec = { id: Date.now(), day: selectedDay, name: name, time: new Date().toLocaleString('zh-CN') };
  d.push(rec);
  showToast('报名成功！7月' + selectedDay + '日', 'success');
  let form = document.getElementById('registrationForm');
  if (form) form.reset();
  document.querySelectorAll('.date-btn.selected').forEach(function(b) { b.classList.remove('selected'); });
  selectedDay = null;
  let btn = document.getElementById('submitBtn');
  if (btn) btn.disabled = true;
  await saveData(d);
  renderAll();
}

const ADMIN_PASS = '013604';

function doAdminLogin() {
  let pw = document.getElementById('adminPass');
  if (!pw) return;
  if (pw.value === ADMIN_PASS) {
    sessionStorage.setItem('admin_ok', '1');
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    updateAdminStats();
  } else { showToast('密码错误', 'error'); }
}

function doAdminLogout() {
  sessionStorage.removeItem('admin_ok');
  document.getElementById('adminLogin').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
}

async function deleteRecord(id) {
  if (!confirm('确定删除该记录？')) return;
  let d = await loadData();
  d = d.filter(function(r) { return r.id !== id; });
  await saveData(d);
  showToast('已删除', 'success');
  renderAll();
}

function exportCSV() {
  if (!_data.length) { showToast('暂无数据', 'error'); return; }
  let csv = 'ID,日期,姓名,时间\n';
  _data.forEach(function(r) { csv += r.id + ',7月' + r.day + '日,' + r.name + ',' + r.time + '\n'; });
  let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '燃情七月报名数据.csv';
  a.click();
}

function openAdmin() {
  document.getElementById('adminModal').classList.add('show');
  document.getElementById('adminPass').value = '';
  setTimeout(function() { document.getElementById('adminPass').focus(); }, 100);
}
function closeAdmin() {
  document.getElementById('adminModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', async function() {
  await loadData();
  renderAll();
  setInterval(sync, SYNC_MS);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error(e.reason);
  showToast('操作失败: ' + (e.reason && e.reason.message || '未知错误'), 'error');
});
