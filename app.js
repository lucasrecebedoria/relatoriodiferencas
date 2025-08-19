function el(id){ return document.getElementById(id); }
function formatDateBR(date){ return new Date(date).toLocaleDateString('pt-BR'); }
const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

async function carregarResumoAdmin(){
  const rows = [
    {matricula: "123", dataCaixa: Date.now(), valorFolha: 100, valorDinheiro: 200},
    {matricula: "123", dataCaixa: Date.now(), valorFolha: 150, valorDinheiro: 100}
  ];

  const totalFolha = rows.reduce((acc,r)=> acc + (r.valorFolha||0), 0);
  const saldo = rows.reduce((acc,r)=> acc + ((r.valorDinheiro||0)-(r.valorFolha||0)), 0);

  el('resumoTotalFolha').textContent = BRL.format(totalFolha);
  el('resumoSaldo').textContent = BRL.format(saldo);

  const resumoSituacao = el('resumoSituacao');
  resumoSituacao.textContent = saldo>=0 ? "POSITIVO" : "NEGATIVO";
  resumoSituacao.className = saldo>=0 ? "texto-verde" : "texto-vermelho";

  const cont = el('resumoLista'); 
  cont.innerHTML = "";
  rows.forEach(r=>{
    const sf = (r.valorDinheiro||0)-(r.valorFolha||0);
    const saldoClass = sf >= 0 ? "texto-verde" : "texto-vermelho";
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="item-header">
        <div class="item-title">${formatDateBR(r.dataCaixa)} — Matrícula ${r.matricula}</div>
        <span class="badge">
          ${BRL.format(r.valorFolha||0)} | 
          ${BRL.format(r.valorDinheiro||0)} | 
          <strong class="${saldoClass}">${BRL.format(sf)}</strong>
        </span>
      </div>`;
    cont.appendChild(div);
  });
}

window.onload = carregarResumoAdmin;
