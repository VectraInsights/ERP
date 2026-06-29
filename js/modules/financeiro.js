/* ============================================================
   FINANCEIRO.JS — Full Financeiro Module (collapsible subcategories)
   ============================================================ */
'use strict';
import DB from '../db.js';
import { fmt, today } from '../utils/format.js';
import { modal, toast, Paginator, buildTable, countUp } from '../utils/ui.js';
import { lineChart, doughnutChart } from '../utils/charts.js';

let paginator = null;
let searchQuery = '';

// Seed new databases for financial accounts and cost centers if not present
function checkSubSeeds() {
  if (!localStorage.getItem('erp_contas_financeiras')) {
    localStorage.setItem('erp_contas_financeiras', JSON.stringify([
      { id: 'cf1', nome: 'Banco Itaú C/C', banco: 'Itaú', saldo: 48500, tipo: 'corrente' },
      { id: 'cf2', nome: 'Caixa Interno da Empresa', banco: 'Nenhum', saldo: 1500, tipo: 'caixa' },
      { id: 'cf3', nome: 'Conta Digital Inter (Pix)', banco: 'Banco Inter', saldo: 12800, tipo: 'corrente' }
    ]));
  }
  if (!localStorage.getItem('erp_centros_custo')) {
    localStorage.setItem('erp_centros_custo', JSON.stringify([
      { id: 'cc1', nome: 'Administrativo', codigo: '01.01', ativo: true },
      { id: 'cc2', nome: 'Comercial & Marketing', codigo: '01.02', ativo: true },
      { id: 'cc3', nome: 'Tecnologia / P&D', codigo: '01.03', ativo: true },
      { id: 'cc4', nome: 'Operacional / Suporte', codigo: '01.04', ativo: true }
    ]));
  }
}

export function render() {
  checkSubSeeds();
  const hash = window.location.hash || '#/financeiro';

  // Subpage dispatching
  if (hash === '#/financeiro/visao-competencia' || hash === '#/financeiro') {
    return renderVisaoCompetencia();
  } else if (hash === '#/financeiro/contas-pagar') {
    return renderContasPagar();
  } else if (hash === '#/financeiro/contas-receber') {
    return renderContasReceber();
  } else if (hash === '#/financeiro/inadimplentes') {
    return renderInadimplentes();
  } else if (hash === '#/financeiro/contas-financeiras') {
    return renderContasFinanceiras();
  } else if (hash === '#/financeiro/extrato') {
    return renderExtrato();
  } else if (hash === '#/financeiro/fluxo-caixa') {
    return renderFluxoCaixaTable();
  } else if (hash === '#/financeiro/historico') {
    return renderHistorico();
  } else if (hash === '#/financeiro/categorias') {
    return renderCategorias();
  } else if (hash === '#/financeiro/centros-custo') {
    return renderCentrosCusto();
  }

  return `<div>Página não encontrada</div>`;
}

export function afterRender() {
  const hash = window.location.hash || '#/financeiro';

  if (hash === '#/financeiro/visao-competencia' || hash === '#/financeiro') {
    afterVisaoCompetencia();
  } else if (hash === '#/financeiro/contas-pagar') {
    afterContasPagar();
  } else if (hash === '#/financeiro/contas-receber') {
    afterContasReceber();
  } else if (hash === '#/financeiro/inadimplentes') {
    afterInadimplentes();
  } else if (hash === '#/financeiro/contas-financeiras') {
    afterContasFinanceiras();
  } else if (hash === '#/financeiro/extrato') {
    afterExtrato();
  } else if (hash === '#/financeiro/fluxo-caixa') {
    // None needed
  } else if (hash === '#/financeiro/historico') {
    afterHistorico();
  } else if (hash === '#/financeiro/categorias') {
    afterCategorias();
  } else if (hash === '#/financeiro/centros-custo') {
    afterCentrosCusto();
  }
}

/* ──────────────────────────────────────────────────────────
   1. VISÃO DE COMPETÊNCIA (Monthly Dashboard moved here)
   ────────────────────────────────────────────────────────── */
function renderVisaoCompetencia() {
  const lancamentos = DB.getAll('lancamentos');
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const isMes = (iso) => {
    const d = new Date(iso);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  };

  const totalReceitas = lancamentos.filter(l => l.tipo === 'receita' && isMes(l.vencimento) && l.status !== 'cancelado').reduce((a, l) => a + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa' && isMes(l.vencimento) && l.status !== 'cancelado').reduce((a, l) => a + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Visão de Competência</h1>
          <p>Visão mensal consolidada baseada em regime de competência (data de vencimento).</p>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-3" style="margin-bottom:var(--space-6)">
        <div class="card card-glass" style="padding:var(--space-5)">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Total Receitado (Mês)</div>
          <div style="font-size:26px;font-weight:800;color:var(--clr-success);margin-top:4px" id="comp-kpi-rec">R$ 0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-5)">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Total Despendido (Mês)</div>
          <div style="font-size:26px;font-weight:800;color:var(--clr-danger);margin-top:4px" id="comp-kpi-des">R$ 0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-5)">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Diferença / Superávit</div>
          <div style="font-size:26px;font-weight:800;color:var(--text-primary);margin-top:4px" id="comp-kpi-sld">R$ 0</div>
        </div>
      </div>

      <!-- Graph Rows -->
      <div class="grid grid-2" style="margin-bottom:var(--space-6)">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Fluxo de Caixa Mensal</div>
            <div class="card-subtitle">Entradas vs Saídas</div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height:250px">
              <canvas id="chart-comp-cashflow"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Distribuição por Categoria</div>
            <div class="card-subtitle">Maiores Receitas</div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height:250px">
              <canvas id="chart-comp-categories"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function afterVisaoCompetencia() {
  const lancamentos = DB.getAll('lancamentos');
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const isMes = (iso) => {
    const d = new Date(iso);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  };

  const totalReceitas = lancamentos.filter(l => l.tipo === 'receita' && isMes(l.vencimento) && l.status !== 'cancelado').reduce((a, l) => a + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa' && isMes(l.vencimento) && l.status !== 'cancelado').reduce((a, l) => a + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  // Animate counts
  setTimeout(() => {
    countUp(document.getElementById('comp-kpi-rec'), totalReceitas, 'R$ ', '');
    countUp(document.getElementById('comp-kpi-des'), totalDespesas, 'R$ ', '');
    countUp(document.getElementById('comp-kpi-sld'), Math.abs(saldo), saldo < 0 ? '- R$ ' : 'R$ ');
    if (saldo < 0) {
      document.getElementById('comp-kpi-sld').style.color = 'var(--clr-danger)';
    } else {
      document.getElementById('comp-kpi-sld').style.color = 'var(--clr-success)';
    }
  }, 100);

  // Cash flow monthly labels
  const labels = [];
  const recData = [];
  const desData = [];
  for (let i = 5; i >= 0; i--) {
    const loopDate = new Date(anoAtual, mesAtual - i, 1);
    labels.push(loopDate.toLocaleString('pt-BR', { month: 'short' }));
    const m = loopDate.getMonth(), y = loopDate.getFullYear();
    
    const recSum = lancamentos.filter(l => l.tipo === 'receita' && new Date(l.vencimento).getMonth() === m && new Date(l.vencimento).getFullYear() === y && l.status !== 'cancelado').reduce((a,x)=>a+x.valor, 0);
    const desSum = lancamentos.filter(l => l.tipo === 'despesa' && new Date(l.vencimento).getMonth() === m && new Date(l.vencimento).getFullYear() === y && l.status !== 'cancelado').reduce((a,x)=>a+x.valor, 0);
    recData.push(recSum);
    desData.push(desSum);
  }

  setTimeout(() => {
    lineChart('chart-comp-cashflow', labels, [
      { label: 'Receitas', data: recData, color: '#10B981' },
      { label: 'Despesas', data: desData, color: '#EF4444' }
    ]);

    // Top categories doughnut
    const catSum = {};
    lancamentos.filter(l => l.tipo === 'receita' && isMes(l.vencimento) && l.status !== 'cancelado').forEach(l => {
      const pc = DB.getById('planoContas', l.conta);
      const name = pc ? pc.nome : 'Outros';
      catSum[name] = (catSum[name] || 0) + l.valor;
    });

    const entries = Object.entries(catSum).sort((a,b) => b[1]-a[1]).slice(0, 5);
    if (entries.length) {
      doughnutChart('chart-comp-categories', entries.map(x=>x[0]), entries.map(x=>x[1]));
    }
  }, 200);
}

/* ──────────────────────────────────────────────────────────
   2. CONTAS A PAGAR (Despesas List)
   ────────────────────────────────────────────────────────── */
function renderContasPagar() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Contas a Pagar</h1>
          <p>Gestão e listagem de despesas, contas fixas, tributos e salários.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-danger" id="btn-nova-desp-p">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Despesa
          </button>
        </div>
      </div>

      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="card-body-sm">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="pagar-search" placeholder="Pesquisar contas a pagar...">
          </div>
        </div>
      </div>

      <div id="pagar-table-container"></div>
      <div id="pagar-pagination" style="display:flex;justify-content:flex-end;margin-top:var(--space-4)"></div>
    </div>
  `;
}

function getPagarItems() {
  let list = DB.getAll('lancamentos').filter(l => l.tipo === 'despesa');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(l => l.descricao.toLowerCase().includes(q) || (l.clienteNome || '').toLowerCase().includes(q));
  }
  return list.sort((a,b) => new Date(b.vencimento) - new Date(a.vencimento));
}

function renderPagarTable() {
  const items = getPagarItems();
  paginator = new Paginator(items, 10);
  const container = document.getElementById('pagar-table-container');
  if (!container) return;

  const cols = [
    { label: 'Status', render: (row) => `<span class="badge ${fmt.statusClass(row.status)} badge-dot">${fmt.statusLabel(row.status)}</span>` },
    { label: 'Fornecedor / Descrição', render: (row) => `<strong>${row.descricao}</strong><div style="font-size:11px;color:var(--text-muted)">${row.clienteNome || 'Geral'}</div>` },
    { label: 'Vencimento', render: (row) => fmt.date(row.vencimento) },
    { label: 'Valor', render: (row) => `<span style="color:var(--clr-danger);font-weight:700">${fmt.currency(row.valor)}</span>` },
    { label: 'Ações', class: 'actions-cell', render: (row) => `
      <button class="btn btn-ghost btn-icon-sm btn-edit-cp" data-id="${row.id}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="btn btn-ghost btn-icon-sm btn-del-cp" data-id="${row.id}" style="color:var(--clr-danger)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      ${row.status !== 'pago' ? `<button class="btn btn-ghost btn-icon-sm btn-pay-cp" data-id="${row.id}" style="color:var(--clr-success)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
    `}
  ];

  container.innerHTML = buildTable(cols, paginator.current, 'Nenhuma conta a pagar.');
  paginator.renderPagination('pagar-pagination', () => renderPagarTable());

  container.querySelectorAll('.btn-edit-cp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const l = DB.getById('lancamentos', e.currentTarget.dataset.id);
      if (l) openForm('despesa', l);
    });
  });
  container.querySelectorAll('.btn-del-cp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      DB.remove('lancamentos', e.currentTarget.dataset.id);
      toast.success('Excluído', 'Lançamento deletado.');
      renderPagarTable();
    });
  });
  container.querySelectorAll('.btn-pay-cp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      DB.update('lancamentos', e.currentTarget.dataset.id, { status: 'pago', pagamento: today() });
      toast.success('Pago', 'Lançamento liquidado.');
      renderPagarTable();
    });
  });
}

function afterContasPagar() {
  searchQuery = '';
  renderPagarTable();
  document.getElementById('pagar-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderPagarTable();
  });
  document.getElementById('btn-nova-desp-p')?.addEventListener('click', () => openForm('despesa'));
}

/* ──────────────────────────────────────────────────────────
   3. CONTAS A RECEBER (Receitas List)
   ────────────────────────────────────────────────────────── */
function renderContasReceber() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Contas a Receber</h1>
          <p>Faturamento, cobranças a receber, mensalidades e vendas faturadas.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-success" id="btn-nova-rec-p">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Receita
          </button>
        </div>
      </div>

      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="card-body-sm">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="receber-search" placeholder="Pesquisar contas a receber...">
          </div>
        </div>
      </div>

      <div id="receber-table-container"></div>
      <div id="receber-pagination" style="display:flex;justify-content:flex-end;margin-top:var(--space-4)"></div>
    </div>
  `;
}

function getReceberItems() {
  let list = DB.getAll('lancamentos').filter(l => l.tipo === 'receita');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(l => l.descricao.toLowerCase().includes(q) || (l.clienteNome || '').toLowerCase().includes(q));
  }
  return list.sort((a,b) => new Date(b.vencimento) - new Date(a.vencimento));
}

function renderReceberTable() {
  const items = getReceberItems();
  paginator = new Paginator(items, 10);
  const container = document.getElementById('receber-table-container');
  if (!container) return;

  const cols = [
    { label: 'Status', render: (row) => `<span class="badge ${fmt.statusClass(row.status)} badge-dot">${fmt.statusLabel(row.status)}</span>` },
    { label: 'Cliente / Descrição', render: (row) => `<strong>${row.descricao}</strong><div style="font-size:11px;color:var(--text-muted)">${row.clienteNome || 'Geral'}</div>` },
    { label: 'Vencimento', render: (row) => fmt.date(row.vencimento) },
    { label: 'Valor', render: (row) => `<span style="color:var(--clr-success);font-weight:700">${fmt.currency(row.valor)}</span>` },
    { label: 'Ações', class: 'actions-cell', render: (row) => `
      <button class="btn btn-ghost btn-icon-sm btn-edit-cr" data-id="${row.id}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="btn btn-ghost btn-icon-sm btn-del-cr" data-id="${row.id}" style="color:var(--clr-danger)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      ${row.status !== 'pago' ? `<button class="btn btn-ghost btn-icon-sm btn-pay-cr" data-id="${row.id}" style="color:var(--clr-success)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
    `}
  ];

  container.innerHTML = buildTable(cols, paginator.current, 'Nenhuma conta a receber.');
  paginator.renderPagination('receber-pagination', () => renderReceberTable());

  container.querySelectorAll('.btn-edit-cr').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const l = DB.getById('lancamentos', e.currentTarget.dataset.id);
      if (l) openForm('receita', l);
    });
  });
  container.querySelectorAll('.btn-del-cr').forEach(btn => {
    btn.addEventListener('click', (e) => {
      DB.remove('lancamentos', e.currentTarget.dataset.id);
      toast.success('Excluído', 'Lançamento deletado.');
      renderReceberTable();
    });
  });
  container.querySelectorAll('.btn-pay-cr').forEach(btn => {
    btn.addEventListener('click', (e) => {
      DB.update('lancamentos', e.currentTarget.dataset.id, { status: 'pago', pagamento: today() });
      toast.success('Recebido', 'Lançamento liquidado.');
      renderReceberTable();
    });
  });
}

function afterContasReceber() {
  searchQuery = '';
  renderReceberTable();
  document.getElementById('receber-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderReceberTable();
  });
  document.getElementById('btn-nova-rec-p')?.addEventListener('click', () => openForm('receita'));
}

/* ──────────────────────────────────────────────────────────
   4. INADIMPLENTES (Beta list)
   ────────────────────────────────────────────────────────── */
function renderInadimplentes() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cobranças Inadimplentes <span class="badge badge-warning" style="font-size:11px">Beta</span></h1>
          <p>Acompanhamento de clientes com parcelas vencidas e atrasos acumulados.</p>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:var(--space-5)">
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase">Montante Inadimplente</div>
          <div style="font-size:24px;font-weight:800;color:var(--clr-danger);margin-top:2px" id="inad-total-sum">R$ 0,00</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase">Títulos Vencidos</div>
          <div style="font-size:24px;font-weight:800;color:var(--clr-warning);margin-top:2px" id="inad-total-cnt">0</div>
        </div>
      </div>

      <div id="inad-table-container"></div>
    </div>
  `;
}

function afterInadimplentes() {
  const items = DB.getAll('lancamentos').filter(l => l.status === 'vencido' && l.tipo === 'receita');
  const total = items.reduce((a,x) => a + x.valor, 0);

  document.getElementById('inad-total-sum').textContent = fmt.currency(total);
  document.getElementById('inad-total-cnt').textContent = items.length;

  const container = document.getElementById('inad-table-container');
  if (!container) return;

  const cols = [
    { label: 'Cliente', render: (row) => `<strong>${row.clienteNome || 'Geral'}</strong>` },
    { label: 'Título / Descrição', key: 'descricao' },
    { label: 'Vencido Em', render: (row) => `<span style="color:var(--clr-danger);font-weight:600">${fmt.date(row.vencimento)}</span>` },
    { label: 'Valor Devido', render: (row) => `<strong style="color:var(--clr-danger)">${fmt.currency(row.valor)}</strong>` },
    { label: 'Ações', render: (row) => `
      <button class="btn btn-ghost btn-sm btn-pay-inad" data-id="${row.id}">Liquidar</button>
    `}
  ];

  container.innerHTML = buildTable(cols, items, 'Parabéns! Nenhuma inadimplência encontrada no período.');

  container.querySelectorAll('.btn-pay-inad').forEach(btn => {
    btn.addEventListener('click', (e) => {
      DB.update('lancamentos', e.target.dataset.id, { status: 'pago', pagamento: today() });
      toast.success('Faturamento Concluído', 'Título liquidado com sucesso.');
      afterInadimplentes();
    });
  });
}

/* ──────────────────────────────────────────────────────────
   5. CONTAS FINANCEIRAS (Bank accounts list)
   ────────────────────────────────────────────────────────── */
function renderContasFinanceiras() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Contas Financeiras</h1>
          <p>Bancos, Caixas Físicos e Carteiras de Pagamento.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-add-conta-f">Nova Conta</button>
        </div>
      </div>

      <div class="grid grid-3" id="contas-f-grid">
        <!-- Dyn -->
      </div>
    </div>
  `;
}

function afterContasFinanceiras() {
  const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
  const grid = document.getElementById('contas-f-grid');
  if (!grid) return;

  grid.innerHTML = list.map(c => `
    <div class="card" style="padding:var(--space-5)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <span class="badge badge-primary">${c.tipo.toUpperCase()}</span>
        <span style="font-size:12px;color:var(--text-muted)">${c.banco}</span>
      </div>
      <h3 style="font-size:16px;color:var(--text-primary);font-weight:600">${c.nome}</h3>
      <div style="font-size:24px;font-weight:800;color:var(--clr-primary-light);margin-top:var(--space-2)">
        ${fmt.currency(c.saldo)}
      </div>
    </div>
  `).join('');

  document.getElementById('btn-add-conta-f')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-add-conta-f',
      title: 'Nova Conta Financeira',
      size: 'sm',
      body: `
        <form id="form-conta-f">
          <div class="form-group">
            <label class="form-label">Nome da Conta <span class="required">*</span></label>
            <input type="text" class="form-control" name="nome" required placeholder="Ex: Banco Itaú C/C">
          </div>
          <div class="form-group">
            <label class="form-label">Instituição / Banco</label>
            <input type="text" class="form-control" name="banco" placeholder="Ex: Itaú, Bradesco, Inter">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Saldo Inicial</label>
              <input type="number" class="form-control" name="saldo" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select class="form-control" name="tipo">
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="caixa">Caixa Físico</option>
              </select>
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="modal.close()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-conta-f">Salvar Conta</button>
      `
    });

    document.getElementById('btn-save-conta-f')?.addEventListener('click', () => {
      const form = document.getElementById('form-conta-f');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      const accounts = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
      accounts.push({
        id: 'cf' + Date.now(),
        nome: fd.get('nome'),
        banco: fd.get('banco') || 'Nenhum',
        saldo: parseFloat(fd.get('saldo')) || 0,
        tipo: fd.get('tipo')
      });
      localStorage.setItem('erp_contas_financeiras', JSON.stringify(accounts));
      toast.success('Conta Registrada', 'Nova conta financeira aberta com sucesso.');
      modal.close();
      afterContasFinanceiras();
    });
  });
}

/* ──────────────────────────────────────────────────────────
   6. EXTRATO DE MOVIMENTAÇÕES (Ledger statement)
   ────────────────────────────────────────────────────────── */
function renderExtrato() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Extrato de Movimentações</h1>
          <p>Listagem em ordem cronológica de todos os recebimentos e pagamentos efetuados.</p>
        </div>
      </div>
      <div id="extrato-table-container"></div>
    </div>
  `;
}

function afterExtrato() {
  const items = DB.getAll('lancamentos')
    .filter(l => l.status === 'pago')
    .sort((a,b) => new Date(b.pagamento || b.vencimento) - new Date(a.pagamento || a.vencimento));

  const container = document.getElementById('extrato-table-container');
  if (!container) return;

  const cols = [
    { label: 'Data Pagto', render: (row) => fmt.date(row.pagamento || row.vencimento) },
    { label: 'Descrição / Detalhe', render: (row) => `<strong>${row.descricao}</strong><div style="font-size:11px;color:var(--text-muted)">${row.clienteNome || 'Geral'}</div>` },
    { label: 'Forma de Pagto', render: (row) => (row.formaPagamento || 'Pix').toUpperCase() },
    { label: 'Valor Pago', render: (row) => `<span style="font-weight:700;color:${row.tipo==='receita'?'var(--clr-success)':'var(--clr-danger)'}">${row.tipo==='receita'?'+':'-'} ${fmt.currency(row.valor)}</span>` }
  ];

  container.innerHTML = buildTable(cols, items, 'Nenhuma movimentação quitada encontrada.');
}

/* ──────────────────────────────────────────────────────────
   7. FLUXO DE CAIXA (Monthly grid matching image 3 DRE logic)
   ────────────────────────────────────────────────────────── */
function renderFluxoCaixaTable() {
  const items = DB.getAll('lancamentos').filter(l => l.status === 'pago');
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anoAtual, mesAtual - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const entradas = items
      .filter(l => l.tipo === 'receita' && new Date(l.vencimento).getMonth() === m && new Date(l.vencimento).getFullYear() === y)
      .reduce((a, l) => a + l.valor, 0);

    const saidas = items
      .filter(l => l.tipo === 'despesa' && new Date(l.vencimento).getMonth() === m && new Date(l.vencimento).getFullYear() === y)
      .reduce((a, l) => a + l.valor, 0);

    data.push({
      mes: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      entradas,
      saidas,
      saldo: entradas - saidas,
    });
  }

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Demonstrativo de Fluxo de Caixa (DFC)</h1>
          <p>Visão de conciliação financeira do último semestre.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr style="background:var(--bg-elevated)">
                  <th>Período</th>
                  <th style="color:var(--clr-success);text-align:right">Entradas (+)</th>
                  <th style="color:var(--clr-danger);text-align:right">Saídas (-)</th>
                  <th style="text-align:right">Saldo Caixa</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr>
                    <td><strong>${row.mes}</strong></td>
                    <td style="text-align:right;color:var(--clr-success)">${fmt.currency(row.entradas)}</td>
                    <td style="text-align:right;color:var(--clr-danger)">${fmt.currency(row.saidas)}</td>
                    <td style="text-align:right;font-weight:700;color:${row.saldo >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)'}">
                      ${fmt.currency(row.saldo)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ──────────────────────────────────────────────────────────
   8. HISTÓRICO (Chronological changes log)
   ────────────────────────────────────────────────────────── */
function renderHistorico() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Histórico do Sistema</h1>
          <p>Logs auditáveis de todas as operações e lançamentos criados no banco local.</p>
        </div>
      </div>
      <div id="hist-table-container"></div>
    </div>
  `;
}

function afterHistorico() {
  const all = [
    ...DB.getAll('lancamentos').map(x => ({ tipo: 'Financeiro', ref: x.descricao, data: x.createdAt, status: x.status })),
    ...DB.getAll('clientes').map(x => ({ tipo: 'Cadastro', ref: x.nome, data: x.createdAt, status: 'criado' })),
    ...DB.getAll('vendas').map(x => ({ tipo: 'Venda / NF-e', ref: x.numero, data: x.createdAt, status: x.status })),
  ].sort((a,b) => new Date(b.data) - new Date(a.data));

  const container = document.getElementById('hist-table-container');
  if (!container) return;

  const cols = [
    { label: 'Data Ocorrência', render: (row) => fmt.datetime(row.data) },
    { label: 'Módulo', render: (row) => `<span class="badge badge-primary">${row.tipo}</span>` },
    { label: 'Referência', key: 'ref' },
    { label: 'Evento / Status', render: (row) => `<code style="text-transform:uppercase">${row.status}</code>` }
  ];

  container.innerHTML = buildTable(cols, all, 'Nenhum log gravado.');
}

/* ──────────────────────────────────────────────────────────
   9. CATEGORIAS FINANCEIRAS (Plano de contas)
   ────────────────────────────────────────────────────────── */
function renderCategorias() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Categorias Financeiras</h1>
          <p>Plano de Contas DRE para classificação de despesas e receitas.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-add-cat-f">Nova Categoria</button>
        </div>
      </div>
      <div id="cat-table-container"></div>
    </div>
  `;
}

function afterCategorias() {
  const list = DB.getAll('planoContas');
  const container = document.getElementById('cat-table-container');
  if (!container) return;

  const cols = [
    { label: 'Código', render: (row) => `<code style="font-weight:700">${row.codigo}</code>` },
    { label: 'Nome da Categoria', key: 'nome' },
    { label: 'Natureza', render: (row) => `<span class="badge ${row.tipo==='receita'?'badge-success':'badge-danger'}">${row.tipo.toUpperCase()}</span>` }
  ];

  container.innerHTML = buildTable(cols, list, 'Nenhuma categoria cadastrada.');

  document.getElementById('btn-add-cat-f')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-add-cat-f',
      title: 'Nova Categoria Financeira',
      size: 'sm',
      body: `
        <form id="form-cat-f">
          <div class="form-group">
            <label class="form-label">Nome da Categoria <span class="required">*</span></label>
            <input type="text" class="form-control" name="nome" required placeholder="Ex: Assinatura de Software">
          </div>
          <div class="form-group">
            <label class="form-label">Código Contábil</label>
            <input type="text" class="form-control" name="codigo" placeholder="Ex: 2.10">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" name="tipo">
              <option value="despesa">Despesa (Saída)</option>
              <option value="receita">Receita (Entrada)</option>
            </select>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="modal.close()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-cat-f">Salvar</button>
      `
    });

    document.getElementById('btn-save-cat-f')?.addEventListener('click', () => {
      const form = document.getElementById('form-cat-f');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      DB.insert('planoContas', {
        nome: fd.get('nome'),
        codigo: fd.get('codigo') || '1.0',
        tipo: fd.get('tipo'),
        pai: null
      });
      toast.success('Categoria Adicionada', 'Categoria DRE salva com sucesso.');
      modal.close();
      afterCategorias();
    });
  });
}

/* ──────────────────────────────────────────────────────────
   10. CENTROS DE CUSTO (Cost centers list)
   ────────────────────────────────────────────────────────── */
function renderCentrosCusto() {
  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Centros de Custo</h1>
          <p>Classificação de custos por setores ou filiais da empresa.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-add-cc-f">Novo Centro de Custo</button>
        </div>
      </div>
      <div id="cc-table-container"></div>
    </div>
  `;
}

function afterCentrosCusto() {
  const list = JSON.parse(localStorage.getItem('erp_centros_custo') || '[]');
  const container = document.getElementById('cc-table-container');
  if (!container) return;

  const cols = [
    { label: 'Código', render: (row) => `<code>${row.codigo}</code>` },
    { label: 'Centro de Custo', key: 'nome' },
    { label: 'Status', render: (row) => `<span class="badge ${row.ativo ? 'badge-success' : 'badge-muted'} badge-dot">${row.ativo ? 'Ativo' : 'Inativo'}</span>` }
  ];

  container.innerHTML = buildTable(cols, list, 'Nenhum Centro de Custo cadastrado.');

  document.getElementById('btn-add-cc-f')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-add-cc-f',
      title: 'Novo Centro de Custo',
      size: 'sm',
      body: `
        <form id="form-cc-f">
          <div class="form-group">
            <label class="form-label">Nome do Centro de Custo <span class="required">*</span></label>
            <input type="text" class="form-control" name="nome" required placeholder="Ex: Setor de Vendas SP">
          </div>
          <div class="form-group">
            <label class="form-label">Código Auxiliar</label>
            <input type="text" class="form-control" name="codigo" placeholder="Ex: 01.05">
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="modal.close()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-cc-f">Salvar</button>
      `
    });

    document.getElementById('btn-save-cc-f')?.addEventListener('click', () => {
      const form = document.getElementById('form-cc-f');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      const list = JSON.parse(localStorage.getItem('erp_centros_custo') || '[]');
      list.push({
        id: 'cc' + Date.now(),
        nome: fd.get('nome'),
        codigo: fd.get('codigo') || '01.00',
        ativo: true
      });
      localStorage.setItem('erp_centros_custo', JSON.stringify(list));
      toast.success('Registrado', 'Novo Centro de Custo cadastrado.');
      modal.close();
      afterCentrosCusto();
    });
  });
}

/* ──────────────────────────────────────────────────────────
   HELPERS & GENERIC FORM MODAL
   ────────────────────────────────────────────────────────── */
function openForm(tipo, data = null) {
  const isEdit = !!data;
  const pContas = DB.getAll('planoContas').filter(pc => pc.tipo === tipo);
  const clientes = DB.getAll('clientes').filter(c => c.status === 'ativo');

  modal.open({
    id: 'modal-financeiro-sub',
    title: isEdit ? `Editar ${tipo === 'receita' ? 'Receita' : 'Despesa'}` : `Nova ${tipo === 'receita' ? 'Receita' : 'Despesa'}`,
    size: 'md',
    body: `
      <form id="form-financeiro-sub">
        <div class="form-group">
          <label class="form-label">Descrição <span class="required">*</span></label>
          <input type="text" class="form-control" name="descricao" value="${data ? data.descricao : ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor <span class="required">*</span></label>
            <input type="number" step="0.01" class="form-control" name="valor" value="${data ? data.valor : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Vencimento <span class="required">*</span></label>
            <input type="date" class="form-control" name="vencimento" value="${data ? data.vencimento : today()}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Categoria DRE <span class="required">*</span></label>
            <select class="form-control" name="conta" required>
              <option value="">Selecione...</option>
              ${pContas.map(pc => `<option value="${pc.id}" ${data && data.conta === pc.id ? 'selected' : ''}>${pc.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${tipo === 'receita' ? 'Cliente' : 'Fornecedor'}</label>
            <select class="form-control" name="clienteId">
              <option value="">Nenhum</option>
              ${clientes.map(c => `<option value="${c.id}" ${data && data.clienteId === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" name="status">
              <option value="pendente" ${data && data.status === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="pago" ${data && data.status === 'pago' ? 'selected' : ''}>Pago / Liquidado</option>
              <option value="vencido" ${data && data.status === 'vencido' ? 'selected' : ''}>Vencido</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Forma de Pagamento</label>
            <select class="form-control" name="formaPagamento">
              <option value="pix" ${data && data.formaPagamento === 'pix' ? 'selected' : ''}>Pix</option>
              <option value="boleto" ${data && data.formaPagamento === 'boleto' ? 'selected' : ''}>Boleto</option>
              <option value="cartao" ${data && data.formaPagamento === 'cartao' ? 'selected' : ''}>Cartão de Crédito</option>
              <option value="transferencia" ${data && data.formaPagamento === 'transferencia' ? 'selected' : ''}>Transferência</option>
            </select>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="modal.close()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-sub-fin">Salvar Registro</button>
    `
  });

  document.getElementById('btn-save-sub-fin')?.addEventListener('click', () => {
    const form = document.getElementById('form-financeiro-sub');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    const cliId = fd.get('clienteId');
    const cli = cliId ? DB.getById('clientes', cliId) : null;

    const payload = {
      tipo,
      descricao: fd.get('descricao'),
      valor: parseFloat(fd.get('valor')),
      vencimento: fd.get('vencimento'),
      conta: fd.get('conta'),
      clienteId: cliId || null,
      clienteNome: cli ? cli.nome : null,
      status: fd.get('status'),
      formaPagamento: fd.get('formaPagamento'),
      pagamento: fd.get('status') === 'pago' ? today() : null
    };

    if (isEdit) {
      DB.update('lancamentos', data.id, payload);
      toast.success('Lançamento Atualizado', 'Os dados do título foram salvos.');
    } else {
      DB.insert('lancamentos', payload);
      toast.success('Lançamento Adicionado', 'Novo registro financeiro lançado com sucesso.');
    }

    modal.close();
    // Reload sub-table based on hash
    const hash = window.location.hash;
    if (hash === '#/financeiro/contas-pagar') renderPagarTable();
    else if (hash === '#/financeiro/contas-receber') renderReceberTable();
    else afterVisaoCompetencia();
  });
}
