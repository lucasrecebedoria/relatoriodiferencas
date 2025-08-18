// app.js - Front-end Firebase + UI logic (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, Timestamp, startAt, endAt } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ==== Firebase config (provided) ====
const firebaseConfig = {
  apiKey: "AIzaSyC4mALGbBqJsJp2Xo5twMImq1hHaSV2HuM",
  authDomain: "caixas18-08.firebaseapp.com",
  projectId: "caixas18-08",
  storageBucket: "caixas18-08.firebasestorage.app",
  messagingSenderId: "41940261133",
  appId: "1:41940261133:web:3d2254aafa02608c2df844",
  measurementId: "G-NF5D2RQYSE"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==== DOM ====
const D = (id)=>document.getElementById(id);
const authSection = D("authSection");
const dashboard = D("dashboard");
const adminControls = D("adminControls");
const btnLogout = D("btnLogout");
const btnChangePassword = D("btnChangePassword");
const welcome = D("welcome");

const geracaoRelatorio = D("geracaoRelatorio");
const listaRelatorios = D("listaRelatorios");
const relatoriosContainer = D("relatoriosContainer");
const resumoWrapper = D("resumoRecebedorWrapper");
const resumoBox = D("resumoRecebedor");
const resumoMatricula = D("resumoMatricula");
const resumoTotalFolha = D("resumoTotalFolha");
const resumoSaldoMes = D("resumoSaldoMes");
const resumoLista = D("resumoLista");

// ==== Helpers ====
const BRL = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const DATE = (d)=> new Date(d.seconds? d.seconds*1000 : d);
const todayStr = ()=> new Date().toISOString().slice(0,10);

function emailFromMatricula(m){ return `${String(m).trim()}@movebuss.local`.toLowerCase(); }

function parseMoneyToNumber(v){
  if (typeof v === 'number') return v;
  if (!v) return 0;
  return Number(String(v).replace(/[^\d,-]/g,'').replace('.','').replace(',','.')) || 0;
}
function formatMoney(v){ return BRL.format(Number(v||0)); }
function setMoneyInput(i, n){ i.value = formatMoney(n); }

function moneyInputBehavior(el){
  el.addEventListener('input', ()=>{
    const n = parseMoneyToNumber(el.value);
    el.value = formatMoney(n);
    if (el.id === 'valorFolha' || el.id === 'valorDinheiro'){
      const folha = parseMoneyToNumber(D('valorFolha').value);
      const dinheiro = parseMoneyToNumber(D('valorDinheiro').value);
      setMoneyInput(D('sobraFalta'), dinheiro - folha);
    }
  });
}

// ==== Roles ====
const ADMIN_MATS = new Set(['6266','4144','70029']);

async function ensureUserDoc(user, matricula, nome){
  const uref = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(uref);
  const role = ADMIN_MATS.has(String(matricula)) ? 'admin' : 'user';
  if (!snap.exists()){
    await setDoc(uref, { uid:user.uid, matricula:String(matricula), nome:nome||'', role, createdAt: serverTimestamp() });
  } else if (ADMIN_MATS.has(String(matricula)) && snap.data().role !== 'admin'){
    await updateDoc(uref, { role:'admin' });
  }
  return role;
}

async function getUserProfile(uid){
  const snap = await getDoc(doc(db,'usuarios', uid));
  return snap.exists()? snap.data() : null;
}

// ==== Auth UI ====
btnLogout.addEventListener('click', ()=> signOut(auth));
btnChangePassword.addEventListener('click', async ()=>{
  const current = prompt('Digite sua senha atual:');
  const nova = prompt('Digite a nova senha:');
  if (!current || !nova) return;
  try{
    const cred = EmailAuthProvider.credential(auth.currentUser.email, current);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, nova);
    alert('Senha alterada com sucesso.');
  }catch(e){ alert('Erro ao alterar senha: '+e.message); }
});

D('btnLogin').addEventListener('click', async ()=>{
  const m = D('loginMatricula').value.trim();
  const s = D('loginSenha').value;
  if (!m || !s) return alert('Informe matrícula e senha.');
  try{
    const userCred = await signInWithEmailAndPassword(auth, emailFromMatricula(m), s);
    await ensureUserDoc(userCred.user, m);
  }catch(e){ alert('Falha no login: '+e.message); }
});

D('btnCadastrar').addEventListener('click', async ()=>{
  const m = D('cadMatricula').value.trim();
  const n = D('cadNome').value.trim();
  const p = D('cadSenha').value;
  if (!m || !n || !p) return alert('Preencha matrícula, nome e senha.');
  try{
    const cred = await createUserWithEmailAndPassword(auth, emailFromMatricula(m), p);
    await setDoc(doc(db,'usuarios', cred.user.uid), { uid: cred.user.uid, matricula: String(m), nome: n, role: ADMIN_MATS.has(String(m))?'admin':'user', createdAt: serverTimestamp() });
    alert('Usuário cadastrado com sucesso.');
  }catch(e){ alert('Erro ao cadastrar: '+e.message); }
});

// ==== Auth state ====
let currentUser = null;
let currentProfile = null;

onAuthStateChanged(auth, async (user)=>{
  currentUser = user;
  if (!user){
    // logged out
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
    btnLogout.classList.add('hidden');
    btnChangePassword.classList.add('hidden');
    return;
  }
  btnLogout.classList.remove('hidden');
  btnChangePassword.classList.remove('hidden');
  authSection.classList.add('hidden');
  dashboard.classList.remove('hidden');

  currentProfile = await getUserProfile(user.uid);
  welcome.innerHTML = `Bem-vindo, <b>${currentProfile?.nome||'Usuário'}</b> (Matrícula ${currentProfile?.matricula||''})`;

  const isAdmin = currentProfile?.role === 'admin';
  // Controls visibility
  adminControls.classList.toggle('hidden', !isAdmin);
  geracaoRelatorio.classList.toggle('hidden', !isAdmin);
  resumoWrapper.classList.toggle('hidden', !isAdmin);

  // Se admin, foco no filtro de matrícula
  if (isAdmin){ D('filtroMatricula').value = ''; }
  else { D('filtroMatricula').value = currentProfile.matricula; }

  await carregarRelatoriosInicial();
});

// ==== Relatórios ====
function reportItemHTML(r, isAdmin){
  const dt = DATE(r.data);
  const title = dt.toLocaleDateString('pt-BR');
  const sobra = Number(r.sobraFalta||0);
  const flag = r.posConferenciaEdited ? `<span class="flag">verificar pós conferência</span>` : ``;

  return `<div class="report-item" data-id="${r.id}">
    <div class="report-header">
      <div class="report-title">${title} • Matrícula ${r.matricula} ${flag}</div>
      <div class="report-actions">
        <button class="btn metal small toggle">Esconder/Exibir</button>
        ${isAdmin? `<button class="btn metal small edit">Editar relatório</button>
        <button class="btn metal small danger delete">Excluir relatório</button>`:``}
        <button class="btn metal small posconf">Pós conferência</button>
      </div>
    </div>
    <div class="report-body">
      <div class="grid2">
        <div><b>Data:</b> ${title}</div>
        <div><b>Valor Folha:</b> ${formatMoney(r.valorFolha)}</div>
        <div><b>Valor em Dinheiro:</b> ${formatMoney(r.valorDinheiro)}</div>
        <div><b>Sobra/Falta:</b> ${formatMoney(sobra)}</div>
      </div>
      <div style="margin-top:6px"><b>Observação:</b> ${r.observacao||'-'}</div>
    </div>
  </div>`;
}

async function carregarRelatoriosInicial(){
  const isAdmin = currentProfile?.role === 'admin';
  if (isAdmin){
    // Admin: listar por matrícula (minimizados). Mostra últimos 20 ao abrir uma matrícula.
    relatoriosContainer.innerHTML = '';
    // Buscar todas as matrículas distintas
    const usuarios = await getDocs(collection(db,'usuarios'));
    const mats = [];
    usuarios.forEach(u=> mats.push(u.data().matricula));
    mats.sort((a,b)=> String(a).localeCompare(String(b)));

    mats.forEach(m=>{
      const wrapper = document.createElement('div');
      wrapper.className = 'report-item';
      wrapper.innerHTML = `
        <div class="report-header">
          <div class="report-title">Matrícula ${m}</div>
          <div class="report-actions">
            <button class="btn metal small abrir">Abrir</button>
          </div>
        </div>
        <div class="report-body"></div>
      `;
      relatoriosContainer.appendChild(wrapper);
      const body = wrapper.querySelector('.report-body');
      wrapper.querySelector('.abrir').addEventListener('click', async ()=>{
        body.style.display = body.style.display==='block'?'none':'block';
        if (body.dataset.loaded==='1') return;
        // últimos 20
        const qRel = query(collection(db,'relatorios'), where('matricula','==', String(m)), orderBy('data','desc'), limit(20));
        const snap = await getDocs(qRel);
        body.innerHTML = '';
        snap.forEach(docu=>{
          const r = { id: docu.id, ...docu.data() };
          const item = document.createElement('div');
          item.innerHTML = reportItemHTML(r, true);
          body.appendChild(item.firstElementChild);
        });
        bindReportActions(body, true);
        body.dataset.loaded = '1';
      });
    });
  } else {
    // Usuário: mostrar últimos 15
    await listarRelatoriosUsuario(currentProfile.matricula, 15);
  }
}

async function listarRelatoriosUsuario(matricula, qtd){
  const qRel = query(collection(db,'relatorios'), where('matricula','==', String(matricula)), orderBy('data','desc'), limit(qtd));
  const snap = await getDocs(qRel);
  relatoriosContainer.innerHTML='';
  snap.forEach(d=>{
    const r = { id:d.id, ...d.data() };
    const item = document.createElement('div');
    item.innerHTML = reportItemHTML(r, false);
    relatoriosContainer.appendChild(item.firstElementChild);
  });
  bindReportActions(relatoriosContainer, false);
}

// Bind actions for a container
function bindReportActions(container, isAdmin){
  container.querySelectorAll('.toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const body = btn.closest('.report-item').querySelector('.report-body');
      body.style.display = body.style.display==='block' ? 'none' : 'block';
    });
  });

  container.querySelectorAll('.edit').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const wrap = btn.closest('.report-item');
      const id = wrap.dataset.id;
      const snap = await getDoc(doc(db,'relatorios', id));
      if (!snap.exists()) return;
      const r = snap.data();
      // Preencher formulário de edição nos campos de geração
      D('dataCaixa').value = DATE(r.data).toISOString().slice(0,10);
      D('matriculaRel').value = r.matricula;
      setMoneyInput(D('valorFolha'), r.valorFolha);
      setMoneyInput(D('valorDinheiro'), r.valorDinheiro);
      setMoneyInput(D('sobraFalta'), r.sobraFalta);
      D('observacao').value = r.observacao||'';
      D('btnSalvarRelatorio').dataset.editing = id;
      window.scrollTo({ top:0, behavior:'smooth' });
    });
  });

  container.querySelectorAll('.delete').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if (!confirm('Excluir este relatório?')) return;
      const id = btn.closest('.report-item').dataset.id;
      await deleteDoc(doc(db,'relatorios', id));
      btn.closest('.report-item').remove();
    });
  });

  container.querySelectorAll('.posconf').forEach(btn=>{
    btn.addEventListener('click', ()=> openPosConf(btn.closest('.report-item').dataset.id, isAdmin));
  });
}

// ==== Salvar relatório ====
['valorFolha','valorDinheiro'].forEach(id=> moneyInputBehavior(D(id)));

D('btnSalvarRelatorio').addEventListener('click', async ()=>{
  const dataStr = D('dataCaixa').value || todayStr();
  const data = Timestamp.fromDate(new Date(dataStr+"T00:00:00"));
  const matricula = String(D('matriculaRel').value || currentProfile.matricula);
  const valorFolha = parseMoneyToNumber(D('valorFolha').value);
  const valorDinheiro = parseMoneyToNumber(D('valorDinheiro').value);
  const sobraFalta = valorDinheiro - valorFolha;
  const observacao = D('observacao').value.trim();
  if (currentProfile.role!=='admin') return alert('Somente administradores podem criar/editar relatórios.');

  const payload = { data, matricula, valorFolha, valorDinheiro, sobraFalta, observacao, posConferenciaTexto: (observacao?null:null), posConferenciaEdited:false, updatedAt: serverTimestamp(), createdBy: currentUser.uid };
  const editingId = D('btnSalvarRelatorio').dataset.editing;

  if (editingId){
    await updateDoc(doc(db,'relatorios', editingId), payload);
    alert('Relatório atualizado.');
    delete D('btnSalvarRelatorio').dataset.editing;
  } else {
    payload.createdAt = serverTimestamp();
    await addDoc(collection(db,'relatorios'), payload);
    alert('Relatório salvo.');
  }

  // Limpa e recarrega
  ['dataCaixa','matriculaRel','valorFolha','valorDinheiro','sobraFalta','observacao'].forEach(id=> D(id).value='');
  await carregarRelatoriosInicial();
});

// ==== Pós conferência ====
const modal = D('modalPosConf');
const posTexto = D('posConfTexto');
const posFile = D('posConfImagem');
const btnAnexar = D('btnAnexarImagem');
const btnVer = D('btnVerImagem');
const btnExcluirImg = D('btnExcluirImagem');
const posAviso = D('posconfAviso');
const btnSalvarPos = D('btnSalvarPosConf');
let posTargetId = null;
let posImageURL = null;

btnAnexar.addEventListener('click', ()=> posFile.click());
posFile.addEventListener('change', ()=>{
  if (posFile.files?.length){ posAviso.textContent = `${posFile.files[0].name} selecionado.`; }
});

btnVer.addEventListener('click', ()=>{
  if (posImageURL) window.open(posImageURL, '_blank');
  else alert('Nenhuma imagem anexada.');
});

async function openPosConf(reportId, isAdmin){
  posTargetId = reportId;
  posTexto.value='';
  posImageURL = null;
  btnSalvarPos.classList.toggle('hidden', !isAdmin);
  btnAnexar.classList.toggle('hidden', !isAdmin);
  btnExcluirImg.classList.toggle('hidden', !isAdmin);
  posTexto.readOnly = !isAdmin;
  posAviso.textContent = isAdmin ? 'Administradores podem editar este campo.' : 'Somente leitura.';

  const snap = await getDoc(doc(db,'relatorios', reportId));
  if (snap.exists()){
    const d = snap.data();
    posTexto.value = d.posConferenciaTexto||'';
    if (d.posConferenciaImagePath){
      try{ posImageURL = await getDownloadURL(sRef(storage, d.posConferenciaImagePath)); }catch(e){}
    }
  }
  modal.showModal();
}

btnExcluirImg.addEventListener('click', async ()=>{
  if (!posTargetId) return;
  if (!confirm('Excluir imagem anexada?')) return;
  const snap = await getDoc(doc(db,'relatorios', posTargetId));
  if (snap.exists() && snap.data().posConferenciaImagePath){
    try{ await deleteObject(sRef(storage, snap.data().posConferenciaImagePath)); }catch(e){}
    await updateDoc(doc(db,'relatorios', posTargetId), { posConferenciaImagePath: null });
    alert('Imagem excluída.');
  }
});

btnSalvarPos.addEventListener('click', async ()=>{
  if (!posTargetId) return;
  const updates = { posConferenciaTexto: posTexto.value, posConferenciaEdited: true, updatedAt: serverTimestamp() };
  // Upload de imagem se houver
  if (posFile.files?.length){
    const f = posFile.files[0];
    const path = `posconferencia/${posTargetId}/${Date.now()}_${f.name}`;
    await uploadBytes(sRef(storage, path), f);
    updates.posConferenciaImagePath = path;
  }
  await updateDoc(doc(db,'relatorios', posTargetId), updates);
  alert('Pós conferência salva.');
  modal.close();
  await carregarRelatoriosInicial();
});

// ==== Filtros ====
D('btnAplicarFiltros').addEventListener('click', async ()=>{
  const mat = D('filtroMatricula').value.trim();
  const dia = D('filtroData').value;
  const mes = D('filtroMes').value;
  await aplicarFiltros(mat, dia, mes);
});

async function aplicarFiltros(matricula, diaISO, mesISO){
  relatoriosContainer.innerHTML='';
  let q = collection(db,'relatorios');
  const conds = [];
  if (matricula) conds.push(where('matricula','==', String(matricula)));
  let from=null,to=null;
  if (diaISO){
    from = Timestamp.fromDate(new Date(diaISO+'T00:00:00'));
    to = Timestamp.fromDate(new Date(diaISO+'T23:59:59'));
  } else if (mesISO){
    const [y,m] = mesISO.split('-').map(Number);
    from = Timestamp.fromDate(new Date(y, m-1, 1));
    to = Timestamp.fromDate(new Date(y, m, 0, 23,59,59));
  }
  // Build query
  let qr = query(q, ...(conds.length?conds:[]), orderBy('data','desc'));
  const snap = await getDocs(qr);
  const filtered = [];
  snap.forEach(d=>{
    const r = { id:d.id, ...d.data() };
    const dt = DATE(r.data);
    if (from && to){
      if (dt>=DATE(from) && dt<=DATE(to)) filtered.push(r);
    } else filtered.push(r);
  });
  // Render
  const isAdmin = currentProfile.role==='admin';
  const maxItems = isAdmin ? 100 : 15;
  filtered.slice(0, maxItems).forEach(r=>{
    const item = document.createElement('div');
    item.innerHTML = reportItemHTML(r, isAdmin);
    relatoriosContainer.appendChild(item.firstElementChild);
  });
  bindReportActions(relatoriosContainer, isAdmin);

  // Se filtro de matrícula está setado, preparar resumo
  if (currentProfile.role==='admin' && matricula){
    resumoMatricula.textContent = matricula;
    resumoWrapper.classList.remove('hidden');
  }
}

// ==== Resumo do Recebedor ====
D('btnToggleResumo').addEventListener('click', ()=>{
  resumoBox.classList.toggle('hidden');
});

D('btnAtualizarResumo').addEventListener('click', async ()=>{
  const mat = resumoMatricula.textContent.trim() || D('filtroMatricula').value.trim() || currentProfile?.matricula;
  const mesISO = D('resumoMes').value || (new Date().toISOString().slice(0,7));
  await montarResumo(mat, mesISO, D('resumoFiltroTipo').value);
});

D('resumoFiltroTipo').addEventListener('change', async ()=>{
  const mat = resumoMatricula.textContent.trim() || D('filtroMatricula').value.trim() || currentProfile?.matricula;
  const mesISO = D('resumoMes').value || (new Date().toISOString().slice(0,7));
  await montarResumo(mat, mesISO, D('resumoFiltroTipo').value);
});

async function montarResumo(matricula, mesISO, tipo='todos'){
  if (currentProfile.role!=='admin'){ resumoWrapper.classList.add('hidden'); return; }
  if (!matricula){ alert('Informe a matrícula para ver o resumo.'); return; }
  const [y,m] = mesISO.split('-').map(Number);
  const from = Timestamp.fromDate(new Date(y, m-1, 1));
  const to = Timestamp.fromDate(new Date(y, m, 0, 23,59,59));

  const qRel = query(collection(db,'relatorios'), where('matricula','==', String(matricula)), orderBy('data','desc'));
  const snap = await getDocs(qRel);
  const rows = [];
  let totalFolha = 0, saldo = 0;
  snap.forEach(d=>{
    const r = d.data();
    const dt = DATE(r.data);
    if (dt<DATE(from) || dt>DATE(to)) return;
    totalFolha += Number(r.valorFolha||0);
    const dif = Number(r.valorDinheiro||0) - Number(r.valorFolha||0);
    saldo += dif;
    rows.push({ data: dt.toLocaleDateString('pt-BR'), folha: r.valorFolha, dinheiro: r.valorDinheiro, sobraFalta: dif });
  });

  // filtro tipo
  const filt = rows.filter(r=>{
    if (tipo==='positivos') return r.sobraFalta>0;
    if (tipo==='negativos') return r.sobraFalta<0;
    return true;
  });

  resumoTotalFolha.textContent = formatMoney(totalFolha);
  resumoSaldoMes.textContent = formatMoney(saldo);

  // render list
  resumoLista.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.className='row';
  hdr.innerHTML = `<div class="col"><b>Data</b></div><div class="col"><b>Folha</b></div><div class="col"><b>Dinheiro</b></div><div class="col"><b>Sobra/Falta</b></div>`;
  resumoLista.appendChild(hdr);
  filt.forEach(r=>{
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<div class="col">${r.data}</div><div class="col">${formatMoney(r.folha)}</div><div class="col">${formatMoney(r.dinheiro)}</div><div class="col">${formatMoney(r.sobraFalta)}</div>`;
    resumoLista.appendChild(row);
  });
}

// ==== Eventos iniciais ====
window.addEventListener('load', ()=>{
  // Padrões
  D('dataCaixa').value = todayStr();
  // dinheiro/folha comportamentos já configurados
});
