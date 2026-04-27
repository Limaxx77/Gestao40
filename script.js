// ============================
// DATA STORE
// ============================
let salarios = JSON.parse(localStorage.getItem('40g_salarios') || '[]');
let contas   = JSON.parse(localStorage.getItem('40g_contas')   || '[]');
let scans    = JSON.parse(localStorage.getItem('40g_scans')    || '[]');
let users    = JSON.parse(localStorage.getItem('40g_users')    || '[]');
let session  = JSON.parse(localStorage.getItem('40g_session')  || 'null');
let editId   = null;
let editType = null;
let currentTab = 'dashboard';

function save() {
  localStorage.setItem('40g_salarios', JSON.stringify(salarios));
  localStorage.setItem('40g_contas',   JSON.stringify(contas));
  localStorage.setItem('40g_scans',    JSON.stringify(scans));
  localStorage.setItem('40g_users',    JSON.stringify(users));
}

function uid() { return Date.now() + Math.random().toString(36).slice(2); }
function fmt(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2}); }
function daysUntil(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr + 'T00:00:00');
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.round((d - n) / 86400000);
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ============================
// NAVIGATION
// ============================
const tabTitles = { dashboard:'Dashboard', salarios:'Pagamento de Salários', contas:'Contas & Boletos', scanner:'Escanear Boleto', relatorios:'Relatórios', acessos:'Controle de Acessos' };
const addLabels = { dashboard:null, salarios:'Funcionário', contas:'Conta / Boleto', scanner:null, relatorios:null, acessos:null };

function switchTab(name) {
  if (name === 'acessos' && (!session || session.role !== 'admin')) { showToast('Apenas administradores podem acessar esta aba.', 'error'); return; }
  currentTab = name;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => { if (n.textContent.trim().toLowerCase().includes(name === 'relatorios' ? 'relat' : name === 'contas' ? 'contas' : name === 'scanner' ? 'escan' : name === 'acessos' ? 'acessos' : name)) n.classList.add('active'); });
  document.getElementById('pageTitle').textContent = tabTitles[name];
  const addBtn = document.getElementById('addBtn');
  if (addLabels[name]) { addBtn.style.display=''; addBtn.textContent = '＋ ' + addLabels[name]; }
  else addBtn.style.display = 'none';
  if (name === 'dashboard') renderDashboard();
  if (name === 'salarios') renderSalarios();
  if (name === 'contas') renderContas();
  if (name === 'scanner') renderScans();
  if (name === 'relatorios') renderRelatorios();
  if (name === 'acessos') renderAccessUsers();
  checkAlerts();
}

// ============================
// ADD MODAL ROUTER
// ============================
function openAddModal() {
  editId = null; editType = null;
  if (currentTab === 'salarios') openSalModal();
  else if (currentTab === 'contas') openContModal();
}

// ============================
// SALÁRIOS
// ============================
function openSalModal(id) {
  editId = id || null;
  const s = id ? salarios.find(x=>x.id===id) : {};
  document.getElementById('salModalTitle').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';
  document.getElementById('sal_nome').value    = s.nome    || '';
  document.getElementById('sal_cargo').value   = s.cargo   || '';
  document.getElementById('sal_salario').value = s.salario || '';
  document.getElementById('sal_data').value    = s.data    || '';
  document.getElementById('sal_status').value  = s.status  || 'Pendente';
  openModal('modalSalario');
}
function saveSalario() {
  const nome    = document.getElementById('sal_nome').value.trim();
  const cargo   = document.getElementById('sal_cargo').value.trim();
  const salario = parseFloat(document.getElementById('sal_salario').value);
  const data    = document.getElementById('sal_data').value;
  const status  = document.getElementById('sal_status').value;
  if (!nome || !salario) return showToast('Preencha nome e salário.','error');
  if (editId) {
    const i = salarios.findIndex(x=>x.id===editId);
    salarios[i] = {...salarios[i], nome, cargo, salario, data, status};
  } else {
    salarios.push({id:uid(), nome, cargo, salario, data, status});
  }
  save(); closeModal('modalSalario'); renderSalarios(); checkAlerts();
  showToast(editId ? 'Funcionário atualizado!' : 'Funcionário cadastrado!', 'success');
}
function deleteSalario(id) {
  if (!confirm('Remover este funcionário?')) return;
  salarios = salarios.filter(x=>x.id!==id);
  save(); renderSalarios(); checkAlerts();
  showToast('Removido.','success');
}
function renderSalarios() {
  const tb = document.getElementById('salTable');
  if (!salarios.length) { tb.innerHTML='<tr><td colspan="6" class="empty"><div class="empty-icon">👥</div>Nenhum funcionário.</td></tr>'; updateSalStats(); return; }
  tb.innerHTML = salarios.map(s => {
    const badge = s.status==='Pago' ? 'badge-green' : 'badge-amber';
    return `<tr>
      <td><strong>${s.nome}</strong></td>
      <td>${s.cargo||'—'}</td>
      <td class="mono">${fmt(s.salario)}</td>
      <td>${fmtDate(s.data)}</td>
      <td><span class="badge ${badge}">${s.status}</span></td>
      <td>
        <button class="btn btn-icon btn-sm" onclick="openSalModal('${s.id}')" title="Editar">✏️</button>
        <button class="btn btn-icon btn-sm btn-danger" onclick="deleteSalario('${s.id}')" title="Remover">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  updateSalStats();
}
function updateSalStats() {
  const total = salarios.reduce((a,s)=>a+s.salario,0);
  const pagos = salarios.filter(s=>s.status==='Pago').length;
  const pend  = salarios.filter(s=>s.status!=='Pago').length;
  document.getElementById('sal-total').textContent = fmt(total);
  document.getElementById('sal-pagos').textContent = pagos;
  document.getElementById('sal-pendentes').textContent = pend;
}

// ============================
// CONTAS
// ============================
function openContModal(id) {
  editId = id || null;
  const c = id ? contas.find(x=>x.id===id) : {};
  document.getElementById('contModalTitle').textContent = id ? 'Editar Conta' : 'Nova Conta / Boleto';
  document.getElementById('cont_desc').value    = c.desc    || '';
  document.getElementById('cont_cat').value     = c.cat     || 'Outros';
  document.getElementById('cont_valor').value   = c.valor   || '';
  document.getElementById('cont_venc').value    = c.venc    || '';
  document.getElementById('cont_status').value  = c.status  || 'Pendente';
  document.getElementById('cont_barcode').value = c.barcode || '';
  openModal('modalConta');
}
function saveConta() {
  const desc    = document.getElementById('cont_desc').value.trim();
  const cat     = document.getElementById('cont_cat').value;
  const valor   = parseFloat(document.getElementById('cont_valor').value);
  const venc    = document.getElementById('cont_venc').value;
  const status  = document.getElementById('cont_status').value;
  const barcode = document.getElementById('cont_barcode').value.trim();
  if (!desc || !valor) return showToast('Preencha descrição e valor.','error');
  if (editId) {
    const i = contas.findIndex(x=>x.id===editId);
    contas[i] = {...contas[i], desc, cat, valor, venc, status, barcode};
  } else {
    contas.push({id:uid(), desc, cat, valor, venc, status, barcode});
  }
  save(); closeModal('modalConta'); renderContas(); checkAlerts();
  showToast(editId ? 'Conta atualizada!' : 'Conta cadastrada!', 'success');
}
function deleteConta(id) {
  if (!confirm('Remover esta conta?')) return;
  contas = contas.filter(x=>x.id!==id);
  save(); renderContas(); checkAlerts();
  showToast('Removida.','success');
}
function renderContas() {
  const tb = document.getElementById('contTable');
  if (!contas.length) { tb.innerHTML='<tr><td colspan="6" class="empty"><div class="empty-icon">📋</div>Nenhuma conta.</td></tr>'; updateContStats(); return; }
  tb.innerHTML = contas.map(c => {
    const days = daysUntil(c.venc);
    let badge = 'badge-green', bText = c.status;
    if (c.status === 'Pendente') badge = days < 0 ? 'badge-red' : days <= 7 ? 'badge-amber' : 'badge-blue';
    if (c.status === 'Atrasado') badge = 'badge-red';
    const autoStatus = c.status === 'Pendente' && days < 0 ? 'Atrasado' : c.status;
    return `<tr>
      <td><strong>${c.desc}</strong>${c.barcode ? `<br><small class="mono" style="color:var(--text3);font-size:10px;">${c.barcode.slice(0,30)}…</small>` : ''}</td>
      <td><span class="badge badge-purple">${c.cat}</span></td>
      <td class="mono">${fmt(c.valor)}</td>
      <td>${fmtDate(c.venc)}${days>=0&&days<=7&&c.status!='Pago'?`<br><small style="color:var(--accent)">⚠ ${days}d</small>`:''}</td>
      <td><span class="badge ${badge}">${autoStatus}</span></td>
      <td>
        <button class="btn btn-icon btn-sm" onclick="openContModal('${c.id}')" title="Editar">✏️</button>
        <button class="btn btn-icon btn-sm btn-danger" onclick="deleteConta('${c.id}')" title="Remover">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  updateContStats();
}
function updateContStats() {
  const pending = contas.filter(c=>c.status!=='Pago');
  const paid    = contas.filter(c=>c.status==='Pago');
  const semana  = contas.filter(c=>c.status==='Pendente'&&daysUntil(c.venc)<=7&&daysUntil(c.venc)>=0).length;
  document.getElementById('cont-pendente').textContent = fmt(pending.reduce((a,c)=>a+c.valor,0));
  document.getElementById('cont-semana').textContent   = semana;
  document.getElementById('cont-pagas').textContent    = fmt(paid.reduce((a,c)=>a+c.valor,0));
}

// ============================
// SCANNER
// ============================
function handleScan(e) {
  const file = e.target.files[0]; if (!file) return;
  document.getElementById('sc_arquivo').value = file.name;
  document.getElementById('sc_desc').value = '';
  document.getElementById('sc_valor').value = '';
  document.getElementById('sc_venc').value = '';
  openModal('modalScanner');
  e.target.value = '';
}
function confirmScan() {
  const arquivo = document.getElementById('sc_arquivo').value;
  const desc    = document.getElementById('sc_desc').value.trim();
  const valor   = parseFloat(document.getElementById('sc_valor').value);
  const venc    = document.getElementById('sc_venc').value;
  if (!desc || !valor) return showToast('Preencha descrição e valor.','error');
  scans.push({id:uid(), arquivo, desc, valor, venc, status:'Pendente'});
  contas.push({id:uid(), desc:`[Boleto] ${desc}`, cat:'Boleto Bancário', valor, venc, status:'Pendente', barcode:''});
  save(); closeModal('modalScanner'); renderScans(); checkAlerts();
  showToast('Boleto adicionado com sucesso!','success');
}
function deleteScan(id) {
  if (!confirm('Remover este boleto?')) return;
  scans = scans.filter(x=>x.id!==id);
  save(); renderScans();
  showToast('Removido.','success');
}
function renderScans() {
  const tb = document.getElementById('scanTable');
  if (!scans.length) { tb.innerHTML='<tr><td colspan="6" class="empty"><div class="empty-icon">📷</div>Nenhum boleto escaneado.</td></tr>'; return; }
  tb.innerHTML = scans.map(s => {
    const days = daysUntil(s.venc);
    const badge = s.status==='Pago' ? 'badge-green' : days<0 ? 'badge-red' : days<=7 ? 'badge-amber' : 'badge-blue';
    return `<tr>
      <td>📄 ${s.arquivo}</td>
      <td>${s.desc}</td>
      <td class="mono">${fmt(s.valor)}</td>
      <td>${fmtDate(s.venc)}</td>
      <td><span class="badge ${badge}">${s.status}</span></td>
      <td><button class="btn btn-icon btn-sm btn-danger" onclick="deleteScan('${s.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

// ============================
// DASHBOARD
// ============================
function renderDashboard() {
  const folha  = salarios.reduce((a,s)=>a+s.salario,0);
  const pendContas = contas.filter(c=>c.status!=='Pago');
  const paidContas = contas.filter(c=>c.status==='Pago');
  const semana = contas.filter(c=>c.status==='Pendente'&&daysUntil(c.venc)<=7&&daysUntil(c.venc)>=0).length;

  document.getElementById('dash-folha').textContent       = fmt(folha);
  document.getElementById('dash-folha-sub').textContent   = `${salarios.length} funcionário(s)`;
  document.getElementById('dash-contas').textContent      = fmt(pendContas.reduce((a,c)=>a+c.valor,0));
  document.getElementById('dash-contas-sub').textContent  = `${pendContas.length} pendente(s)`;
  document.getElementById('dash-pagas').textContent       = fmt(paidContas.reduce((a,c)=>a+c.valor,0));
  document.getElementById('dash-pagas-sub').textContent   = `${paidContas.length} quitada(s)`;
  document.getElementById('dash-vencendo').textContent    = semana;

  // Bar chart
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun'];
  const now = new Date();
  const bars = months.map((m,i) => {
    const idx = (now.getMonth() - 5 + i + 12) % 12;
    const base = (i === 5) ? contas.filter(c=>c.status!=='Pago').reduce((a,c)=>a+c.valor,0) + folha : Math.random()*8000+3000;
    return {label:m, val:Math.round(base)};
  });
  const maxV = Math.max(...bars.map(b=>b.val));
  document.getElementById('barChart').innerHTML = bars.map((b,i)=>`
    <div class="bar-group">
      <div class="bar-wrap">
        <div class="bar" style="height:${Math.round(b.val/maxV*130)}px;background:${i===5?'var(--accent)':'var(--surface3)'};" title="${fmt(b.val)}"></div>
      </div>
      <div class="bar-label">${b.label}</div>
    </div>`).join('');

  // Próximos vencimentos
  const upcoming = contas.filter(c=>c.status!=='Pago').sort((a,b)=>daysUntil(a.venc)-daysUntil(b.venc)).slice(0,5);
  const dv = document.getElementById('dashVencimentos');
  if (!upcoming.length) { dv.innerHTML='<tr><td colspan="4" class="empty">Nenhuma conta pendente.</td></tr>'; return; }
  dv.innerHTML = upcoming.map(c=>{
    const days=daysUntil(c.venc);
    const badge = days<0?'badge-red':days<=3?'badge-amber':'badge-blue';
    const label = days<0?`Atrasado ${Math.abs(days)}d`:days===0?'Hoje':days<=7?`${days}d`:fmtDate(c.venc);
    return `<tr><td>${c.desc}</td><td class="mono">${fmt(c.valor)}</td><td>${fmtDate(c.venc)}</td><td><span class="badge ${badge}">${label}</span></td></tr>`;
  }).join('');
}

// ============================
// RELATÓRIOS
// ============================
function renderRelatorios() {
  const all    = [...contas, ...salarios.map(s=>({...s, desc:s.nome, cat:'Salário', valor:s.salario, venc:s.data}))];
  const total  = all.reduce((a,x)=>a+x.valor,0);
  const aberto = all.filter(x=>x.status==='Pendente').reduce((a,x)=>a+x.valor,0);
  const pago   = all.filter(x=>x.status==='Pago').reduce((a,x)=>a+x.valor,0);
  const atras  = all.filter(x=>x.status==='Atrasado'||(x.status==='Pendente'&&daysUntil(x.venc)<0)).reduce((a,x)=>a+x.valor,0);

  document.getElementById('rel-total').textContent   = fmt(total);
  document.getElementById('rel-aberto').textContent  = fmt(aberto);
  document.getElementById('rel-quitado').textContent = fmt(pago);
  document.getElementById('rel-atrasado').textContent= fmt(atras);

  // Categorias
  const cats = {};
  contas.forEach(c=>{ cats[c.cat]=(cats[c.cat]||0)+c.valor; });
  cats['Salários'] = salarios.reduce((a,s)=>a+s.salario,0);
  const maxCat = Math.max(...Object.values(cats),1);
  document.getElementById('catReport').innerHTML = Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span>${k}</span><span class="mono">${fmt(v)}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(v/maxCat*100)}%;background:var(--accent);"></div></div>
    </div>`).join('');

  // Resumo
  document.getElementById('resumoReport').innerHTML = [
    {l:'Total de Funcionários',v:salarios.length,u:''},
    {l:'Total de Contas',v:contas.length,u:''},
    {l:'Boletos Escaneados',v:scans.length,u:''},
    {l:'Contas Vencendo (7d)',v:contas.filter(c=>c.status==='Pendente'&&daysUntil(c.venc)<=7&&daysUntil(c.venc)>=0).length,u:''},
  ].map(i=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
    <span style="color:var(--text2)">${i.l}</span>
    <strong>${i.v}${i.u}</strong>
  </div>`).join('');
}

// ============================
// ALERTS
// ============================
function checkAlerts() {
  const urgent = contas.filter(c=>c.status==='Pendente'&&daysUntil(c.venc)<=3&&daysUntil(c.venc)>=0);
  const overdue = contas.filter(c=>c.status==='Pendente'&&daysUntil(c.venc)<0);
  const badge = document.getElementById('alertBadge');
  const total = urgent.length + overdue.length;
  badge.textContent = total;
  badge.style.display = total > 0 ? '' : 'none';

  const bar = document.getElementById('alertsBar');
  if (total === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let html = '';
  if (overdue.length) html += `<div class="alert-item">⛔ <strong>${overdue.length} conta(s) vencida(s):</strong> ${overdue.map(c=>c.desc).join(', ')}</div>`;
  if (urgent.length)  html += `<div class="alert-item">⚠️ <strong>${urgent.length} conta(s) vencendo em breve:</strong> ${urgent.map(c=>`${c.desc} (${daysUntil(c.venc)}d)`).join(', ')}</div>`;
  document.getElementById('alertsContent').innerHTML = html;
}

// ============================
// FILTER TABLE
// ============================
function filterTable(tbId, q) {
  const rows = document.querySelectorAll(`#${tbId} tr`);
  rows.forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

// ============================
// EXPORT & PRINT
// ============================
function exportCSV() {
  let csv = 'Tipo,Descrição,Valor,Vencimento,Status\n';
  contas.forEach(c=>{ csv += `Conta,"${c.desc}",${c.valor},${c.venc},${c.status}\n`; });
  salarios.forEach(s=>{ csv += `Salário,"${s.nome} – ${s.cargo}",${s.salario},${s.data},${s.status}\n`; });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = '40graus_relatorio.csv'; a.click();
  showToast('CSV exportado!','success');
}
function printReport() { window.print(); }

// ============================
// MODAL HELPERS
// ============================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ============================
// TOAST
// ============================
function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${type==='success'?'✅':type==='error'?'❌':'⚠️'} ${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(()=>t.remove(), 3500);
}



// ============================
// LOGIN / CONTROLE DE ACESSOS
// ============================
function ensureDefaultAdmin() {
  if (!users.length) {
    users.push({ id: uid(), nome: 'Administrador', username: 'admin', password: '123456', role: 'admin', active: true });
    save();
  }
}

function login() {
  const username = document.getElementById('login_user').value.trim();
  const password = document.getElementById('login_pass').value.trim();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return showToast('Usuário ou senha incorretos.', 'error');
  if (!user.active) return showToast('Este usuário está bloqueado pelo administrador.', 'error');

  session = { id: user.id, nome: user.nome, username: user.username, role: user.role };
  localStorage.setItem('40g_session', JSON.stringify(session));
  applySession();
  showToast('Login realizado com sucesso!', 'success');
}

function logout() {
  localStorage.removeItem('40g_session');
  session = null;
  document.body.classList.add('locked');
  document.getElementById('login_pass').value = '';
}

function applySession() {
  if (!session) { document.body.classList.add('locked'); return; }
  const validUser = users.find(u => u.id === session.id && u.active);
  if (!validUser) return logout();

  session = { id: validUser.id, nome: validUser.nome, username: validUser.username, role: validUser.role };
  localStorage.setItem('40g_session', JSON.stringify(session));
  document.body.classList.remove('locked');
  document.getElementById('currentUserLabel').textContent = `${session.nome} · ${session.role === 'admin' ? 'Admin' : 'Funcionário'}`;

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = session.role === 'admin' ? '' : 'none';
  });

  if (currentTab === 'acessos' && session.role !== 'admin') switchTab('dashboard');
}

function saveAccessUser() {
  if (!session || session.role !== 'admin') return showToast('Apenas administradores podem liberar acessos.', 'error');

  const nome = document.getElementById('acc_nome').value.trim();
  const username = document.getElementById('acc_user').value.trim();
  const password = document.getElementById('acc_pass').value.trim();
  const role = document.getElementById('acc_role').value;
  const active = document.getElementById('acc_active').value === 'true';

  if (!nome || !username || !password) return showToast('Preencha nome, usuário e senha.', 'error');
  if (users.some(u => u.username === username)) return showToast('Já existe um usuário com esse login.', 'error');

  users.push({ id: uid(), nome, username, password, role, active });
  save();
  document.getElementById('acc_nome').value = '';
  document.getElementById('acc_user').value = '';
  document.getElementById('acc_pass').value = '';
  document.getElementById('acc_role').value = 'user';
  document.getElementById('acc_active').value = 'true';
  renderAccessUsers();
  showToast('Acesso liberado com sucesso!', 'success');
}

function toggleAccessUser(id) {
  if (!session || session.role !== 'admin') return;
  const user = users.find(u => u.id === id);
  if (!user) return;
  if (user.username === 'admin') return showToast('O administrador principal não pode ser bloqueado.', 'error');
  user.active = !user.active;
  save();
  renderAccessUsers();
  showToast(user.active ? 'Usuário liberado.' : 'Usuário bloqueado.', 'success');
}

function deleteAccessUser(id) {
  if (!session || session.role !== 'admin') return;
  const user = users.find(u => u.id === id);
  if (!user) return;
  if (user.username === 'admin') return showToast('O administrador principal não pode ser excluído.', 'error');
  if (!confirm('Excluir este acesso?')) return;
  users = users.filter(u => u.id !== id);
  save();
  renderAccessUsers();
  showToast('Acesso removido.', 'success');
}

function renderAccessUsers() {
  const tb = document.getElementById('accessTable');
  if (!tb) return;
  tb.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.nome}</strong></td>
      <td class="mono">${u.username}</td>
      <td><span class="${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role === 'admin' ? 'Administrador' : 'Funcionário'}</span></td>
      <td><span class="${u.active ? 'status-active' : 'status-blocked'}">${u.active ? 'Liberado' : 'Bloqueado'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="toggleAccessUser('${u.id}')">${u.active ? 'Bloquear' : 'Liberar'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAccessUser('${u.id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

// ============================
// INIT
// ============================
window.addEventListener('DOMContentLoaded', () => {
  ensureDefaultAdmin();
  applySession();
  switchTab('dashboard');
  // Hide addBtn initially
  document.getElementById('addBtn').style.display = 'none';
});