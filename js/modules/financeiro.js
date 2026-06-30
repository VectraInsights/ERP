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
let globalShortcutsBound = false;

function getContasFinanceiras() {
  return JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
}

function setupQuickLaunchShortcuts() {
  if (globalShortcutsBound) return;
  globalShortcutsBound = true;

  const handleShortcut = (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const key = (event.key || '').toLowerCase();
    const code = event.code || '';
    const isD = key === 'd' || code === 'KeyD';
    const isR = key === 'r' || code === 'KeyR';

    const openAfterNavigation = (targetHash, type) => {
      if (window.location.hash === targetHash) {
        openForm(type);
        return;
      }
      const onHashChange = () => {
        if (window.location.hash === targetHash) {
          openForm(type);
          window.removeEventListener('hashchange', onHashChange);
        }
      };
      window.addEventListener('hashchange', onHashChange);
      window.location.hash = targetHash;
    };

    if (isD) {
      event.preventDefault();
      openAfterNavigation('#/financeiro/contas-pagar', 'despesa');
    } else if (isR) {
      event.preventDefault();
      openAfterNavigation('#/financeiro/contas-receber', 'receita');
    }
  };

  document.addEventListener('keydown', handleShortcut);
}

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
  setupQuickLaunchShortcuts();

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
   5. CONTAS FINANCEIRAS (Bank accounts — full CRUD + OFX + Open Banking)
   ────────────────────────────────────────────────────────── */

function bankIcon(banco) {
  return getBankLogo(banco, 20);
}

function normalizeBankName(banco) {
  if (!banco) return 'Nenhum';
  const normalized = String(banco).trim();
  const lower = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mapping = [
    [/\bbanco do brasil\b|\bbb\b/, 'Banco do Brasil'],
    [/\bbanco inter\b|\binter\b/, 'Banco Inter'],
    [/\bitau\b|banco itau/, 'Itaú'],
    [/bradesco/, 'Bradesco'],
    [/santander/, 'Santander'],
    [/caixa (economica|economica federal)?|\bcaixa\b/, 'Caixa'],
    [/nubank/, 'Nubank'],
    [/\bc6\b|c6 bank/, 'C6 Bank'],
    [/sicoob/, 'Sicoob'],
    [/btg/, 'BTG Pactual'],
    [/nenhum|sem banco|caixa fisico|caixa fisica/, 'Nenhum']
  ];

  for (const [pattern, bank] of mapping) {
    if (pattern.test(lower)) return bank;
  }

  return normalized;
}

function tipoLabel(t) {
  return { corrente: 'Conta Corrente', poupanca: 'Poupança', caixa: 'Caixa Físico', investimento: 'Investimento', digital: 'Conta Digital' }[t] || t;
}

function getBankLogo(banco, size = 28) {
  const baseSize = Number(size) || 28;
  const uid = Math.random().toString(36).slice(2, 8);
  const bankKey = normalizeBankName(banco);
  const normalizedBank = String(banco || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const logos = {
    'Itaú': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="itau-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#003d82;stop-opacity:1" /><stop offset="100%" style="stop-color:#0066cc;stop-opacity:1" /></linearGradient></defs><rect width="28" height="28" rx="6" fill="url(#itau-grad-${uid})"/><text x="14" y="17" font-size="12" font-weight="900" fill="#FFD700" text-anchor="middle" font-family="Arial, sans-serif">Itaú</text></svg>`,
    'Bradesco': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><defs><radialGradient id="brad-grad-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#ff3333;stop-opacity:1" /><stop offset="100%" style="stop-color:#cc0000;stop-opacity:1" /></radialGradient></defs><rect width="28" height="28" rx="6" fill="url(#brad-grad-${uid})"/><path d="M8 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="none" stroke="white" stroke-width="2"/><path d="M8 14h12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Santander': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="sant-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#cb1e1e;stop-opacity:1" /><stop offset="100%" style="stop-color:#a50f0f;stop-opacity:1" /></linearGradient></defs><rect width="28" height="28" rx="6" fill="url(#sant-grad-${uid})"/><path d="M8 10c0-2 2-4 6-4s6 2 6 4c0 2-2 3-6 4-4 1-6 2-6 4" stroke="white" stroke-width="2" fill="none"/></svg>`,
    'Caixa': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="caixa-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#003d7a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1d4f8b;stop-opacity:1" /></linearGradient></defs><rect width="28" height="28" rx="6" fill="url(#caixa-grad-${uid})"/><path d="M9 10h10v8H9z" fill="#ffd600"/><path d="M9 10h10v4H9z" fill="#003d7a"/></svg>`,
    'Banco do Brasil': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="bb-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" /><stop offset="100%" style="stop-color:#ffce00;stop-opacity:1" /></linearGradient></defs><rect width="28" height="28" rx="6" fill="url(#bb-grad-${uid})"/><path d="M8 8h4v4H8V8zm8 0h4v4h-4V8z" fill="#003d7a"/><path d="M10 10h8v8h-8V10z" fill="none" stroke="#003d7a" stroke-width="2"/></svg>`,
    'Banco Inter': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><defs><linearGradient id="inter-grad-${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff7117;stop-opacity:1" /><stop offset="100%" style="stop-color:#ff8d1c;stop-opacity:1" /></linearGradient></defs><rect width="28" height="28" rx="6" fill="url(#inter-grad-${uid})"/><path d="M8 20l6-12 6 12" stroke="#0e9349" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
    'Nubank': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#8300b0"/><path d="M10 12c0-1.5 1-3 4-3s4 1.5 4 3c0 1.5-1 3-4 3s-4-1.5-4-3zm0 0v4c0 1.5 1 3 4 3s4-1.5 4-3v-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    'C6 Bank': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#000"/><text x="14" y="18" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">C6</text></svg>`,
    'Sicoob': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#1ea915"/><path d="M9 9h10v10H9z" fill="white"/><path d="M10 10h8v8h-8z" fill="#1ea915"/></svg>`,
    'BTG Pactual': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#000"/><text x="14" y="18" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">BTG</text></svg>`,
    'Nenhum': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#555"/><path d="M9 9h10v10H9z" fill="#777"/><path d="M10 12h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M10 16h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Outro': `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#666"/><text x="14" y="18" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">?</text></svg>`
  };

  return logos[bankKey] || `<svg width="${baseSize}" height="${baseSize}" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#999"/><text x="14" y="18" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif">🏦</text></svg>`;
}

function formatDateInputValue(iso) {
  return iso ? fmt.date(iso) : fmt.date(today());
}

function parseDateValue(value) {
  if (!value) return new Date();
  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
}

function toIsoDate(value) {
  return parseDateValue(value).toISOString().split('T')[0];
}

function createCalendarPopover(input) {
  if (!input) return;
  input.readOnly = true;
  input.classList.add('custom-date-picker');

  let currentDate = parseDateValue(input.value || formatDateInputValue(null));
  let selectedIso = toIsoDate(input.value || formatDateInputValue(null));
  let popover = null;

  const removePopover = () => {
    if (popover) {
      popover.remove();
      popover = null;
      document.removeEventListener('click', outsideClick);
      window.removeEventListener('resize', repositionPopover);
      window.removeEventListener('scroll', repositionPopover, true);
    }
  };

  const outsideClick = (event) => {
    if (!popover) return;
    if (event.target === input || popover.contains(event.target)) return;
    removePopover();
  };

  const repositionPopover = () => {
    if (!popover) return;
    const rect = input.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;
  };

  const buildCalendar = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const days = [];
    const startDate = new Date(year, month, 1 - startOffset);

    const monthName = firstDay.toLocaleString('pt-BR', { month: 'long' });
    const header = `
      <div class="calendar-header">
        <button type="button" class="calendar-nav" data-action="prev">◀</button>
        <div class="calendar-title">${monthName} ${year}</div>
        <button type="button" class="calendar-nav" data-action="next">▶</button>
      </div>
      <div class="calendar-weekdays">${['D','S','T','Q','Q','S','S'].map(d => `<div>${d}</div>`).join('')}</div>
      <div class="calendar-days"></div>
      <div class="calendar-footer">
        <button type="button" class="btn btn-ghost btn-sm" data-action="clear">Limpar</button>
        <button type="button" class="btn btn-primary btn-sm" data-action="today">Hoje</button>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'calendar-popover';
    wrapper.innerHTML = header;

    const daysContainer = wrapper.querySelector('.calendar-days');
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const iso = day.toISOString().split('T')[0];
      const dayEl = document.createElement('button');
      dayEl.type = 'button';
      dayEl.className = 'calendar-day';
      dayEl.textContent = String(day.getDate());
      if (day.getMonth() !== month) dayEl.classList.add('disabled');
      if (iso === selectedIso) dayEl.classList.add('selected');
      dayEl.addEventListener('click', () => {
        if (day.getMonth() !== month) return;
        selectedIso = iso;
        input.value = fmt.date(selectedIso);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        removePopover();
      });
      daysContainer.appendChild(dayEl);
    }

    wrapper.querySelector('[data-action="prev"]').addEventListener('click', () => {
      currentDate = new Date(year, month - 1, 1);
      wrapper.replaceWith(buildCalendar(currentDate));
      popover = document.querySelector('.calendar-popover');
      document.addEventListener('click', outsideClick);
    });

    wrapper.querySelector('[data-action="next"]').addEventListener('click', () => {
      currentDate = new Date(year, month + 1, 1);
      wrapper.replaceWith(buildCalendar(currentDate));
      popover = document.querySelector('.calendar-popover');
      document.addEventListener('click', outsideClick);
    });

    wrapper.querySelector('[data-action="clear"]').addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      removePopover();
    });

    wrapper.querySelector('[data-action="today"]').addEventListener('click', () => {
      const todayValue = fmt.date(today());
      selectedIso = today();
      input.value = todayValue;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      removePopover();
    });

    return wrapper;
  };

  const openPopover = () => {
    removePopover();
    currentDate = parseDateValue(input.value || formatDateInputValue(null));
    selectedIso = toIsoDate(input.value || formatDateInputValue(null));
    popover = buildCalendar(currentDate);
    document.body.appendChild(popover);
    repositionPopover();
    document.addEventListener('click', outsideClick);
    window.addEventListener('resize', repositionPopover);
    window.addEventListener('scroll', repositionPopover, true);
  };

  input.addEventListener('click', openPopover);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPopover();
    }
  });
}

function renderContasFinanceiras() {
  return `
    <div class="page-enter">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h1>Contas Financeiras</h1>
          <p>Gerencie bancos, caixas e carteiras. Importe extratos OFX e conecte via Open Banking.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="btn-import-ofx" style="gap:6px">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Importar OFX
          </button>
          <button class="btn btn-ghost" id="btn-open-banking" style="gap:6px">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Integrar Banco
          </button>
          <button class="btn btn-primary" id="btn-add-conta-f" style="gap:6px">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Conta
          </button>
        </div>
      </div>

      <!-- Summary bar -->
      <div id="cf-summary-bar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:var(--space-4);margin-bottom:var(--space-6)"></div>

      <!-- Accounts Table -->
      <div id="cf-table-container" class="cf-table-wrapper"></div>

      <!-- Reconciliation Section -->
      <div id="cf-reconciliation-section" style="display:none;margin-top:var(--space-6)">
        <div class="reconciliation-panel">
          <div class="reconciliation-header">
            <div class="reconciliation-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M9 11l3 3L22 4"/><path d="M9 11l3 3L22 4"/></svg>
              Conciliação Bancária
            </div>
            <button class="btn btn-ghost btn-sm" id="btn-close-reconciliation">Fechar</button>
          </div>
          <div id="cf-reconciliation-content"></div>
        </div>
      </div>

      <!-- OFX Log -->
      <div id="ofx-log-section" style="display:none;margin-top:var(--space-6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
          <h2 style="font-size:16px;font-weight:700;color:var(--text-primary)">Lançamentos importados via OFX</h2>
          <button class="btn btn-ghost btn-sm" id="btn-clear-ofx-log">Limpar</button>
        </div>
        <div id="ofx-log-table"></div>
      </div>
    </div>
  `;
}

function afterContasFinanceiras() {
  _renderCFTable();
  _renderCFSummary();

  // ── Add new account ──────────────────────────────
  document.getElementById('btn-add-conta-f')?.addEventListener('click', () => openContaModal());

  // ── Import OFX ───────────────────────────────────
  document.getElementById('btn-import-ofx')?.addEventListener('click', () => openOFXModal());

  // ── Open Banking ─────────────────────────────────
  document.getElementById('btn-open-banking')?.addEventListener('click', () => openBankingModal());

  // ── Clear OFX log ────────────────────────────────
  document.getElementById('btn-clear-ofx-log')?.addEventListener('click', () => {
    localStorage.removeItem('erp_ofx_importados');
    document.getElementById('ofx-log-section').style.display = 'none';
    toast.info('Log Limpo', 'Histórico de importação OFX removido.');
  });

  // ── Close reconciliation ─────────────────────────
  document.getElementById('btn-close-reconciliation')?.addEventListener('click', () => {
    document.getElementById('cf-reconciliation-section').style.display = 'none';
    _renderCFTable();
  });

  // Restore OFX log if exists
  const ofxData = JSON.parse(localStorage.getItem('erp_ofx_importados') || '[]');
  if (ofxData.length) _renderOFXLog(ofxData);
}

// ─── Render account cards ────────────────────────────────────────
function _renderCFCards() {
  const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
  const grid = document.getElementById('contas-f-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:var(--space-8);color:var(--text-muted)">Nenhuma conta cadastrada. Clique em <strong>Nova Conta</strong> para começar.</div>`;
    return;
  }

  grid.innerHTML = list.map(c => {
    const connected = c.openBanking ? `<span style="font-size:10px;color:var(--clr-success);font-weight:600;display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:var(--clr-success);display:inline-block"></span>Conectado</span>` : '';
    return `
    <div class="card cf-card" data-id="${c.id}" style="padding:var(--space-5);position:relative;overflow:hidden">
      <!-- Decorative bg stripe -->
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--clr-primary),var(--clr-accent))"></div>
      
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3)">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">${bankIcon(c.banco)}</span>
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.6px">${tipoLabel(c.tipo)}</div>
            <div style="font-size:11px;color:var(--text-secondary)">${c.banco}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${connected}
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm btn-edit-cf" data-id="${c.id}" title="Editar" style="padding:4px 8px;font-size:11px">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-del-cf" data-id="${c.id}" title="Excluir" style="padding:4px 8px;font-size:11px;color:var(--clr-danger)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <h3 style="font-size:15px;color:var(--text-primary);font-weight:700;margin-bottom:var(--space-3)">${c.nome}</h3>

      <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-3);display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Saldo disponível</div>
          <div style="font-size:22px;font-weight:800;color:${c.saldo >= 0 ? 'var(--clr-primary-light)' : 'var(--clr-danger)'}">${fmt.currency(c.saldo)}</div>
        </div>
        <button class="btn btn-ghost btn-sm btn-ofx-single" data-id="${c.id}" style="font-size:11px;opacity:.7">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          OFX
        </button>
      </div>
    </div>
  `}).join('');

  // Edit buttons
  grid.querySelectorAll('.btn-edit-cf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
      const conta = list.find(c => c.id === id);
      if (conta) openContaModal(conta);
    });
  });

  // Delete buttons
  grid.querySelectorAll('.btn-del-cf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Deseja excluir esta conta financeira? Esta ação não pode ser desfeita.')) return;
      const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
      localStorage.setItem('erp_contas_financeiras', JSON.stringify(list.filter(c => c.id !== id)));
      toast.success('Conta Excluída', 'A conta foi removida do sistema.');
      _renderCFTable();
      _renderCFSummary();
    });
  });

  // Per-card OFX import
  grid.querySelectorAll('.btn-ofx-single').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openOFXModal(btn.dataset.id);
    });
  });
}

// ─── Render account table (NEW) ──────────────────────────────────
function _renderCFTable() {
  const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
  const container = document.getElementById('cf-table-container');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-10);color:var(--text-muted)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="margin-bottom:var(--space-3);opacity:0.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        <p style="font-size:14px;margin-bottom:var(--space-3)">Nenhuma conta financeira cadastrada</p>
        <button class="btn btn-primary" onclick="document.getElementById('btn-add-conta-f').click()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Criar Primeira Conta
        </button>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <table class="cf-table">
      <thead>
        <tr>
          <th>Banco</th>
          <th>Nome da Conta</th>
          <th>Agência / Conta</th>
          <th>Tipo</th>
          <th>Saldo</th>
          <th>Conciliações</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(c => {
          const connected = c.openBanking ? '🔗' : '';
          return `
          <tr>
            <td>
              <div class="bank-logo">
                ${getBankLogo(c.banco)}
                <span>${c.banco}</span>
              </div>
            </td>
            <td>
              <div style="color:var(--text-primary);font-weight:500">${c.nome}</div>
              ${c.obs ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${c.obs}</div>` : ''}
            </td>
            <td>
              <div style="font-size:13px;font-weight:600;color:var(--text-secondary)">
                ${c.agencia ? `Ag: ${c.agencia}` : '—'}
              </div>
              <div style="font-size:11px;color:var(--text-muted)">
                ${c.numeroConta ? `CC: ${c.numeroConta}` : 'Sem dados'}
              </div>
            </td>
            <td>
              <span class="account-type-badge ${c.tipo}">
                ${tipoLabel(c.tipo)}
              </span>
            </td>
            <td>
              <div class="account-balance ${c.saldo >= 0 ? 'positive' : 'negative'}">
                ${fmt.currency(c.saldo)}
              </div>
            </td>
            <td style="text-align:center">
              ${c.conciliada ? `<span class="badge badge-success" title="Conta conciliada em ${fmt.date(c.conciliacaoEm)}">Conciliada</span>` : `<button class="btn btn-action-sm btn-reconcile-cf" data-id="${c.id}" title="Conciliação Bancária">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                Reconciliar
              </button>`}
            </td>
            <td>
              <div class="cf-actions">
                <button class="btn-action-sm btn-edit-cf" data-id="${c.id}" title="Editar">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-action-sm btn-ofx-single" data-id="${c.id}" title="Importar OFX">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button class="btn-action-sm danger btn-del-cf" data-id="${c.id}" title="Excluir">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;

  // ─── Edit buttons ───────────────────────────────────────────
  container.querySelectorAll('.btn-edit-cf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
      const conta = list.find(c => c.id === id);
      if (conta) openContaModal(conta);
    });
  });

  // ─── Delete buttons ──────────────────────────────────────────
  container.querySelectorAll('.btn-del-cf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
      const conta = list.find(c => c.id === id);
      if (!confirm(`Deseja realmente excluir a conta "${conta?.nome}"? Esta ação não pode ser desfeita.`)) return;
      localStorage.setItem('erp_contas_financeiras', JSON.stringify(list.filter(c => c.id !== id)));
      toast.success('Conta Excluída', 'A conta foi removida do sistema.');
      _renderCFTable();
      _renderCFSummary();
    });
  });

  // ─── OFX import buttons ──────────────────────────────────────
  container.querySelectorAll('.btn-ofx-single').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openOFXModal(btn.dataset.id);
    });
  });

  // ─── Reconciliation buttons ──────────────────────────────────
  container.querySelectorAll('.btn-reconcile-cf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
      const conta = list.find(c => c.id === id);
      if (conta) openReconciliationModal(conta);
    });
  });
}

// ─── Summary bar ─────────────────────────────────────────────────
function _renderCFSummary() {
  const list = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
  const bar = document.getElementById('cf-summary-bar');
  if (!bar) return;
  const total = list.reduce((a, c) => a + c.saldo, 0);
  const positivas = list.filter(c => c.saldo >= 0).length;
  const conectadas = list.filter(c => c.openBanking).length;
  bar.innerHTML = [
    { label: 'Saldo Total Consolidado', value: fmt.currency(total), color: total >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)', icon: '💰' },
    { label: 'Contas com saldo positivo', value: `${positivas} de ${list.length}`, color: 'var(--clr-primary-light)', icon: '✅' },
    { label: 'Contas com Open Banking', value: `${conectadas} conectada${conectadas !== 1 ? 's' : ''}`, color: 'var(--clr-warning)', icon: '🔗' },
  ].map(s => `
    <div class="card" style="padding:var(--space-4);display:flex;align-items:center;gap:var(--space-3)">
      <span style="font-size:28px">${s.icon}</span>
      <div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${s.label}</div>
        <div style="font-size:18px;font-weight:800;color:${s.color}">${s.value}</div>
      </div>
    </div>
  `).join('');
}

// ─── Add / Edit modal ─────────────────────────────────────────────
function openContaModal(conta = null) {
  const isEdit = !!conta;
  modal.open({
    id: 'modal-conta-f',
    title: isEdit ? 'Editar Conta Financeira' : 'Nova Conta Financeira',
    size: 'md',
    body: `
      <form id="form-conta-f">
        <div class="form-group">
          <label class="form-label">Nome da Conta <span class="required">*</span></label>
          <input type="text" class="form-control" name="nome" required placeholder="Ex: Banco Itaú C/C" value="${isEdit ? conta.nome : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Banco / Instituição</label>
            <select class="form-control" name="banco">
              <option value="Nenhum">Caixa Físico (sem banco)</option>
              <option value="Itaú"${isEdit && conta.banco === 'Itaú' ? ' selected' : ''}>Itaú</option>
              <option value="Bradesco"${isEdit && conta.banco === 'Bradesco' ? ' selected' : ''}>Bradesco</option>
              <option value="Santander"${isEdit && conta.banco === 'Santander' ? ' selected' : ''}>Santander</option>
              <option value="Caixa"${isEdit && conta.banco === 'Caixa' ? ' selected' : ''}>Caixa Econômica Federal</option>
              <option value="Banco do Brasil"${isEdit && conta.banco === 'Banco do Brasil' ? ' selected' : ''}>Banco do Brasil</option>
              <option value="Banco Inter"${isEdit && conta.banco === 'Banco Inter' ? ' selected' : ''}>Banco Inter</option>
              <option value="Nubank"${isEdit && conta.banco === 'Nubank' ? ' selected' : ''}>Nubank</option>
              <option value="C6 Bank"${isEdit && conta.banco === 'C6 Bank' ? ' selected' : ''}>C6 Bank</option>
              <option value="Sicoob"${isEdit && conta.banco === 'Sicoob' ? ' selected' : ''}>Sicoob</option>
              <option value="BTG Pactual"${isEdit && conta.banco === 'BTG Pactual' ? ' selected' : ''}>BTG Pactual</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" name="tipo">
              <option value="corrente"${isEdit && conta.tipo === 'corrente' ? ' selected' : ''}>Conta Corrente</option>
              <option value="poupanca"${isEdit && conta.tipo === 'poupanca' ? ' selected' : ''}>Poupança</option>
              <option value="digital"${isEdit && conta.tipo === 'digital' ? ' selected' : ''}>Conta Digital</option>
              <option value="investimento"${isEdit && conta.tipo === 'investimento' ? ' selected' : ''}>Investimento</option>
              <option value="caixa"${isEdit && conta.tipo === 'caixa' ? ' selected' : ''}>Caixa Físico</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Agência</label>
            <input type="text" class="form-control" name="agencia" placeholder="0000" value="${isEdit ? (conta.agencia || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Conta / Dígito</label>
            <input type="text" class="form-control" name="numeroConta" placeholder="00000-0" value="${isEdit ? (conta.numeroConta || '') : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${isEdit ? 'Saldo Atual' : 'Saldo Inicial'}</label>
            <input type="number" class="form-control" name="saldo" step="0.01" value="${isEdit ? conta.saldo : 0}">
          </div>
          <div class="form-group">
            <label class="form-label">Cor de identificação</label>
            <input type="color" class="form-control" name="cor" value="${isEdit ? (conta.cor || '#4f6ef7') : '#4f6ef7'}" style="height:42px;padding:4px">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observações</label>
          <textarea class="form-control" name="obs" rows="2" placeholder="Informações adicionais sobre esta conta...">${isEdit ? (conta.obs || '') : ''}</textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.getElementById('modal-conta-f-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-conta-f">${isEdit ? 'Salvar Alterações' : 'Criar Conta'}</button>
    `
  });

  document.getElementById('btn-save-conta-f')?.addEventListener('click', () => {
    const form = document.getElementById('form-conta-f');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const accounts = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');

    if (isEdit) {
      const idx = accounts.findIndex(c => c.id === conta.id);
      if (idx > -1) {
        accounts[idx] = { ...accounts[idx],
          nome: fd.get('nome'), banco: fd.get('banco'), tipo: fd.get('tipo'),
          agencia: fd.get('agencia'), numeroConta: fd.get('numeroConta'),
          saldo: parseFloat(fd.get('saldo')) || 0, cor: fd.get('cor'), obs: fd.get('obs')
        };
      }
      toast.success('Conta Atualizada', 'Os dados da conta foram salvos com sucesso.');
    } else {
      accounts.push({
        id: 'cf' + Date.now(), nome: fd.get('nome'), banco: fd.get('banco'),
        tipo: fd.get('tipo'), agencia: fd.get('agencia'), numeroConta: fd.get('numeroConta'),
        saldo: parseFloat(fd.get('saldo')) || 0, cor: fd.get('cor'), obs: fd.get('obs')
      });
      toast.success('Conta Criada', 'Nova conta financeira registrada com sucesso.');
    }

    localStorage.setItem('erp_contas_financeiras', JSON.stringify(accounts));
    modal.close();
    _renderCFTable();
    _renderCFSummary();
  });
}

// ─── OFX Import modal ────────────────────────────────────────────
function openOFXModal(preSelectedId = null) {
  const contas = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
  const contaOptions = contas.map(c => `<option value="${c.id}"${preSelectedId === c.id ? ' selected' : ''}>${c.nome}</option>`).join('');

  modal.open({
    id: 'modal-ofx',
    title: 'Importar Extrato OFX',
    size: 'md',
    body: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4)">
        <div style="background:rgba(79,110,247,.08);border:1px solid rgba(79,110,247,.2);border-radius:var(--radius-md);padding:var(--space-4)">
          <p style="font-size:13px;color:var(--text-secondary);margin:0;line-height:1.6">
            📄 Faça download do arquivo <strong>.OFX</strong> no internet banking do seu banco e importe aqui. Os lançamentos serão vinculados à conta selecionada e adicionados ao extrato automaticamente.
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Conta de destino <span class="required">*</span></label>
          <select class="form-control" id="ofx-conta-destino">
            <option value="">— Selecione a conta —</option>
            ${contaOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Arquivo OFX <span class="required">*</span></label>
          <div id="ofx-dropzone" style="border:2px dashed var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-6);text-align:center;cursor:pointer;transition:all .2s;position:relative">
            <input type="file" id="ofx-file-input" accept=".ofx,.OFX" style="position:absolute;inset:0;opacity:0;cursor:pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="color:var(--text-muted);margin-bottom:var(--space-2)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div id="ofx-file-name" style="font-size:13px;color:var(--text-muted)">Arraste o arquivo aqui ou <span style="color:var(--clr-primary-light);font-weight:600">clique para selecionar</span></div>
          </div>
        </div>

        <div id="ofx-preview" style="display:none">
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:var(--space-2)">Preview dos lançamentos encontrados:</div>
          <div id="ofx-preview-table" style="max-height:220px;overflow-y:auto"></div>
          <div id="ofx-preview-count" style="font-size:11px;color:var(--text-muted);margin-top:var(--space-2)"></div>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.getElementById('modal-ofx-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btn-confirmar-ofx" disabled>Importar Lançamentos</button>
    `
  });

  let parsedTransactions = [];

  // File selection
  const fileInput = document.getElementById('ofx-file-input');
  const dropzone = document.getElementById('ofx-dropzone');

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--clr-primary-light)'; });
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border-subtle)'; });
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) processOFXFile(e.dataTransfer.files[0]); });

  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) processOFXFile(e.target.files[0]); });

  function processOFXFile(file) {
    document.getElementById('ofx-file-name').innerHTML = `📄 <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB) — Lendo...`;
    dropzone.style.borderColor = 'var(--clr-success)';
    const reader = new FileReader();
    reader.onload = (e) => {
      parsedTransactions = parseOFX(e.target.result);
      showOFXPreview(parsedTransactions);
      document.getElementById('ofx-file-name').innerHTML = `✅ <strong>${file.name}</strong> — ${parsedTransactions.length} transações encontradas`;
    };
    reader.readAsText(file, 'windows-1252');
  }

  function parseOFX(text) {
    const transactions = [];
    const stmtMatch = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
    stmtMatch.forEach(block => {
      const get = (tag) => { const m = block.match(new RegExp(`<${tag}>([^<\n\r]+)`, 'i')); return m ? m[1].trim() : ''; };
      const trntype = get('TRNTYPE');
      const dtposted = get('DTPOSTED');
      const trnamt = get('TRNAMT');
      const memo = get('MEMO') || get('NAME');
      if (!trnamt) return;
      const dateStr = dtposted ? `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}` : today();
      const valor = parseFloat(trnamt.replace(',', '.'));
      transactions.push({ tipo: valor >= 0 ? 'receita' : 'despesa', valor: Math.abs(valor), descricao: memo || trntype, vencimento: dateStr, status: 'pago', pagamento: dateStr, formaPagamento: 'OFX', origem: 'ofx' });
    });
    // Fallback: try SGML format
    if (!transactions.length) {
      const lines = text.split(/\n/);
      let cur = {};
      lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('<STMTTRN')) { cur = {}; }
        else if (line.startsWith('</STMTTRN')) {
          if (cur.TRNAMT) {
            const v = parseFloat(cur.TRNAMT.replace(',', '.'));
            transactions.push({ tipo: v >= 0 ? 'receita' : 'despesa', valor: Math.abs(v), descricao: cur.MEMO || cur.NAME || cur.TRNTYPE || 'OFX', vencimento: cur._date || today(), status: 'pago', pagamento: cur._date || today(), formaPagamento: 'OFX', origem: 'ofx' });
          }
          cur = {};
        } else {
          const m = line.match(/^<([A-Z]+)>(.+)$/);
          if (m) {
            if (m[1] === 'DTPOSTED') cur._date = `${m[2].slice(0,4)}-${m[2].slice(4,6)}-${m[2].slice(6,8)}`;
            else cur[m[1]] = m[2].trim();
          }
        }
      });
    }
    return transactions;
  }

  function showOFXPreview(txns) {
    const preview = document.getElementById('ofx-preview');
    const table = document.getElementById('ofx-preview-table');
    const count = document.getElementById('ofx-preview-count');
    if (!txns.length) {
      table.innerHTML = `<div style="color:var(--clr-warning);font-size:13px;padding:var(--space-3)">⚠️ Nenhuma transação encontrada no arquivo. Verifique se é um OFX válido.</div>`;
    } else {
      table.innerHTML = buildTable(
        [
          { label: 'Data', render: r => fmt.date(r.vencimento) },
          { label: 'Descrição', render: r => r.descricao },
          { label: 'Tipo', render: r => `<span class="badge badge-${r.tipo === 'receita' ? 'success' : 'danger'}">${r.tipo}</span>` },
          { label: 'Valor', render: r => `<span style="font-weight:700;color:${r.tipo==='receita'?'var(--clr-success)':'var(--clr-danger)'}">${r.tipo==='receita'?'+':'-'} ${fmt.currency(r.valor)}</span>` }
        ],
        txns,
        'Sem transações'
      );
      count.textContent = `${txns.length} lançamento(s) serão importados.`;
      document.getElementById('btn-confirmar-ofx').disabled = false;
    }
    preview.style.display = 'block';
  }

  // Confirm import
  document.getElementById('btn-confirmar-ofx')?.addEventListener('click', () => {
    const contaId = document.getElementById('ofx-conta-destino').value;
    if (!contaId) { toast.warning('Atenção', 'Selecione uma conta de destino antes de importar.'); return; }
    if (!parsedTransactions.length) { toast.warning('Atenção', 'Nenhuma transação para importar.'); return; }

    const contas = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
    const conta = contas.find(c => c.id === contaId);
    const saldoImport = parsedTransactions.reduce((a, t) => t.tipo === 'receita' ? a + t.valor : a - t.valor, 0);

    // Save to OFX log
    const prev = JSON.parse(localStorage.getItem('erp_ofx_importados') || '[]');
    const withMeta = parsedTransactions.map(t => ({ ...t, id: 'ofx' + Date.now() + Math.random(), contaNome: conta?.nome || '' }));
    localStorage.setItem('erp_ofx_importados', JSON.stringify([...prev, ...withMeta]));

    // Update account balance
    const idx = contas.findIndex(c => c.id === contaId);
    if (idx > -1) { contas[idx].saldo = (contas[idx].saldo || 0) + saldoImport; }
    localStorage.setItem('erp_contas_financeiras', JSON.stringify(contas));

    toast.success('OFX Importado!', `${parsedTransactions.length} transações importadas para "${conta?.nome || 'conta'}"`);
    modal.close();
    _renderCFTable();
    _renderCFSummary();
    _renderOFXLog(JSON.parse(localStorage.getItem('erp_ofx_importados') || '[]'));
  });
}

// ─── OFX Log table ───────────────────────────────────────────────
function _renderOFXLog(data) {
  const section = document.getElementById('ofx-log-section');
  const table = document.getElementById('ofx-log-table');
  if (!section || !table) return;
  section.style.display = 'block';
  table.innerHTML = buildTable(
    [
      { label: 'Data', render: r => fmt.date(r.vencimento) },
      { label: 'Conta', render: r => `<span style="font-size:11px;color:var(--text-muted)">${r.contaNome}</span>` },
      { label: 'Descrição', render: r => r.descricao },
      { label: 'Tipo', render: r => `<span class="badge badge-${r.tipo === 'receita' ? 'success' : 'danger'}">${r.tipo}</span>` },
      { label: 'Valor', render: r => `<span style="font-weight:700;color:${r.tipo==='receita'?'var(--clr-success)':'var(--clr-danger)'}">${r.tipo==='receita'?'+':'-'} ${fmt.currency(r.valor)}</span>` }
    ],
    data.slice(-50),
    'Nenhuma importação OFX realizada.'
  );
}

// ─── Open Banking modal ──────────────────────────────────────────
function openBankingModal() {
  const SUPPORTED_BANKS = [
    { nome: 'Itaú', icon: '🟠', status: 'disponível', color: 'var(--clr-success)' },
    { nome: 'Bradesco', icon: '🔴', status: 'disponível', color: 'var(--clr-success)' },
    { nome: 'Banco do Brasil', icon: '🟡', status: 'disponível', color: 'var(--clr-success)' },
    { nome: 'Santander', icon: '🔴', status: 'disponível', color: 'var(--clr-success)' },
    { nome: 'Caixa', icon: '🔵', status: 'disponível', color: 'var(--clr-success)' },
    { nome: 'Banco Inter', icon: '🟠', status: 'beta', color: 'var(--clr-warning)' },
    { nome: 'Nubank', icon: '🟣', status: 'beta', color: 'var(--clr-warning)' },
    { nome: 'C6 Bank', icon: '⚫', status: 'beta', color: 'var(--clr-warning)' },
    { nome: 'Sicoob', icon: '🟢', status: 'em breve', color: 'var(--text-muted)' },
    { nome: 'BTG Pactual', icon: '⚫', status: 'em breve', color: 'var(--text-muted)' },
    { nome: 'XP Investimentos', icon: '⚫', status: 'em breve', color: 'var(--text-muted)' },
    { nome: 'Sicredi', icon: '🟢', status: 'em breve', color: 'var(--text-muted)' },
  ];

  const contas = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');
  const contaOptions = contas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

  modal.open({
    id: 'modal-open-banking',
    title: '🏦 Integração Bancária — Open Banking',
    size: 'lg',
    body: `
      <div style="display:flex;flex-direction:column;gap:var(--space-5)">
        <!-- Info banner -->
        <div style="background:linear-gradient(135deg,rgba(79,110,247,.12),rgba(139,92,246,.08));border:1px solid rgba(79,110,247,.25);border-radius:var(--radius-md);padding:var(--space-4)">
          <div style="font-weight:700;color:var(--clr-primary-light);margin-bottom:4px">🔒 Conexão segura via Open Finance Brasil</div>
          <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.6">A integração utiliza o protocolo Open Finance regulamentado pelo Banco Central do Brasil (Res. BCB nº 32/2020). Seus dados são acessados com seu consentimento e criptografados em trânsito.</p>
        </div>

        <!-- Step indicator -->
        <div style="display:flex;gap:0;align-items:center">
          <div class="ob-step ob-step-active" id="ob-step-1" style="flex:1">
            <div class="ob-step-num">1</div><div class="ob-step-label">Selecionar Banco</div>
          </div>
          <div style="height:1px;width:32px;background:var(--border-subtle)"></div>
          <div class="ob-step" id="ob-step-2" style="flex:1">
            <div class="ob-step-num">2</div><div class="ob-step-label">Vincular Conta</div>
          </div>
          <div style="height:1px;width:32px;background:var(--border-subtle)"></div>
          <div class="ob-step" id="ob-step-3" style="flex:1">
            <div class="ob-step-num">3</div><div class="ob-step-label">Autorizar Acesso</div>
          </div>
          <div style="height:1px;width:32px;background:var(--border-subtle)"></div>
          <div class="ob-step" id="ob-step-4" style="flex:1">
            <div class="ob-step-num">4</div><div class="ob-step-label">Concluído</div>
          </div>
        </div>

        <!-- Step 1: Bank selection -->
        <div id="ob-panel-1">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-3)">Selecione o banco que deseja conectar:</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
            ${SUPPORTED_BANKS.map(b => `
              <button class="btn-bank-select card" data-bank="${b.nome}" data-available="${b.status !== 'em breve'}" style="padding:var(--space-3);text-align:left;cursor:${b.status === 'em breve' ? 'not-allowed' : 'pointer'};opacity:${b.status === 'em breve' ? '.5' : '1'};border:1px solid var(--border-subtle);background:none;border-radius:var(--radius-md);transition:all .15s;position:relative">
                <div style="font-size:20px;margin-bottom:4px">${b.icon}</div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${b.nome}</div>
                <div style="font-size:10px;color:${b.color};font-weight:600;margin-top:2px">${b.status.toUpperCase()}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Step 2: Link account -->
        <div id="ob-panel-2" style="display:none">
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:var(--space-3)">Banco selecionado: <span id="ob-selected-bank-label" style="color:var(--clr-primary-light)"></span></div>
          <div class="form-group">
            <label class="form-label">Vincular à conta no Vectra ERP</label>
            <select class="form-control" id="ob-conta-vincular">
              <option value="">— Criar nova conta automaticamente —</option>
              ${contaOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sincronização automática</label>
            <select class="form-control" id="ob-sync-freq">
              <option value="diaria">Diária (recomendado)</option>
              <option value="semanal">Semanal</option>
              <option value="manual">Somente manual</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Período inicial de importação</label>
            <select class="form-control" id="ob-periodo">
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">Últimos 6 meses</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>

        <!-- Step 3: Auth -->
        <div id="ob-panel-3" style="display:none">
          <div style="text-align:center;padding:var(--space-4)">
            <div style="font-size:40px;margin-bottom:var(--space-3)">🔐</div>
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:var(--space-2)">Autorização necessária</div>
            <p style="font-size:13px;color:var(--text-secondary);max-width:400px;margin:0 auto var(--space-4)">
              Uma janela segura do banco <strong id="ob-auth-bank-name"></strong> será aberta para que você autorize o acesso à sua conta. O processo é totalmente seguro e controlado pelo banco.
            </p>
            <div style="background:rgba(255,255,255,.04);border-radius:var(--radius-md);padding:var(--space-4);text-align:left;font-size:12px;color:var(--text-secondary);line-height:1.8">
              <div>✅ Apenas <strong>leitura</strong> de saldo e extrato</div>
              <div>✅ Sem acesso a dados de pagamento</div>
              <div>✅ Consentimento revogável a qualquer momento</div>
              <div>✅ Criptografia de ponta a ponta (TLS 1.3)</div>
            </div>
            <button class="btn btn-primary" id="btn-ob-autorizar" style="margin-top:var(--space-4);gap:8px">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Abrir janela de autorização do banco
            </button>
          </div>
        </div>

        <!-- Step 4: Done -->
        <div id="ob-panel-4" style="display:none">
          <div style="text-align:center;padding:var(--space-6)">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--clr-success)" stroke-width="2.5" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style="font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:var(--space-2)">Conta conectada com sucesso!</div>
            <p style="font-size:13px;color:var(--text-secondary);max-width:360px;margin:0 auto var(--space-3)">
              O saldo e as transações do banco serão sincronizados automaticamente conforme o período configurado.
            </p>
            <div id="ob-done-summary" style="background:rgba(255,255,255,.04);border-radius:var(--radius-md);padding:var(--space-4);font-size:12px;color:var(--text-secondary);text-align:left"></div>
          </div>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="btn-ob-back" style="display:none">← Voltar</button>
      <button class="btn btn-ghost" onclick="document.getElementById('modal-open-banking-overlay').remove()">Fechar</button>
      <button class="btn btn-primary" id="btn-ob-next" disabled>Próximo →</button>
    `
  });

  let obStep = 1;
  let selectedBank = null;

  function goToStep(step) {
    [1,2,3,4].forEach(s => {
      document.getElementById(`ob-panel-${s}`).style.display = s === step ? 'block' : 'none';
      const stepEl = document.getElementById(`ob-step-${s}`);
      if (stepEl) {
        stepEl.querySelector('.ob-step-num').style.background = s <= step ? 'var(--clr-primary)' : 'var(--border-subtle)';
        stepEl.querySelector('.ob-step-num').style.color = s <= step ? '#fff' : 'var(--text-muted)';
      }
    });
    obStep = step;
    document.getElementById('btn-ob-back').style.display = step > 1 && step < 4 ? 'inline-flex' : 'none';
    document.getElementById('btn-ob-next').style.display = step < 4 ? 'inline-flex' : 'none';
    document.getElementById('btn-ob-next').disabled = step === 1 ? !selectedBank : false;
  }

  // Bank selection
  document.querySelectorAll('.btn-bank-select').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.available === 'false') return;
      document.querySelectorAll('.btn-bank-select').forEach(b => b.style.borderColor = 'var(--border-subtle)');
      btn.style.borderColor = 'var(--clr-primary-light)';
      selectedBank = btn.dataset.bank;
      document.getElementById('btn-ob-next').disabled = false;
    });
  });

  document.getElementById('btn-ob-next')?.addEventListener('click', () => {
    if (obStep === 1) {
      document.getElementById('ob-selected-bank-label').textContent = selectedBank;
      document.getElementById('ob-auth-bank-name').textContent = selectedBank;
      goToStep(2);
    } else if (obStep === 2) {
      goToStep(3);
    }
  });

  document.getElementById('btn-ob-back')?.addEventListener('click', () => { goToStep(obStep - 1); });

  document.getElementById('btn-ob-autorizar')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-ob-autorizar');
    btn.textContent = '⏳ Aguardando autorização...';
    btn.disabled = true;
    // Simulate auth flow
    setTimeout(() => {
      const contaId = document.getElementById('ob-conta-vincular').value;
      const syncFreq = document.getElementById('ob-sync-freq').value;
      const periodo = document.getElementById('ob-periodo').value;
      const contas = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');

      if (contaId) {
        const idx = contas.findIndex(c => c.id === contaId);
        if (idx > -1) contas[idx].openBanking = { banco: selectedBank, sync: syncFreq, connectedAt: today() };
      } else {
        contas.push({
          id: 'cf' + Date.now(), nome: `${selectedBank} (Open Banking)`, banco: selectedBank,
          tipo: 'corrente', saldo: 0, openBanking: { banco: selectedBank, sync: syncFreq, connectedAt: today() }
        });
      }
      localStorage.setItem('erp_contas_financeiras', JSON.stringify(contas));

      const summary = document.getElementById('ob-done-summary');
      if (summary) summary.innerHTML = `
        <div>🏦 <strong>Banco:</strong> ${selectedBank}</div>
        <div>🔄 <strong>Sincronização:</strong> ${syncFreq}</div>
        <div>📅 <strong>Período importado:</strong> Últimos ${periodo} dias</div>
        <div>🕐 <strong>Próxima sync:</strong> ${syncFreq === 'diaria' ? 'Amanhã às 06:00' : syncFreq === 'semanal' ? 'Próxima segunda-feira' : 'Manual'}</div>
      `;

      goToStep(4);
      _renderCFTable();
      _renderCFSummary();
      toast.success('Open Banking Conectado!', `${selectedBank} integrado com sucesso.`);
    }, 2200);
  });

  // Init styles for steps
  goToStep(1);
}

// ─── Bank Reconciliation Modal (NEW) ─────────────────────────────
function openReconciliationModal(conta) {
  // Get imported OFX transactions
  const ofxData = JSON.parse(localStorage.getItem('erp_ofx_importados') || '[]');
  const contaOFX = ofxData.filter(t => t.contaNome === conta.nome);
  
  // Get system transactions (lancamentos)
  const lancamentos = JSON.parse(localStorage.getItem('erp_lancamentos') || '[]');
  const contaLancamentos = lancamentos.filter(l => l.contaId === conta.id);

  // Calculate totals
  const totalOFX = contaOFX.reduce((a, t) => t.tipo === 'receita' ? a + t.valor : a - t.valor, 0);
  const totalLancamentos = contaLancamentos.filter(l => l.status !== 'cancelado').reduce((a, l) => l.tipo === 'receita' ? a + l.valor : a - l.valor, 0);
  const systemBalance = conta.saldo;
  const ofxBalance = totalOFX;
  const difference = Math.abs(systemBalance - ofxBalance);
  const isReconciled = difference < 0.01;

  modal.open({
    id: 'modal-reconciliation',
    title: `Conciliação Bancária — ${conta.nome}`,
    size: 'lg',
    body: `
      <div class="reconciliation-modal-content">
        <!-- Status Summary -->
        <div style="background:${isReconciled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'};border:1px solid ${isReconciled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'};border-radius:var(--radius-md);padding:var(--space-4);display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" style="color:${isReconciled ? 'var(--clr-success)' : 'var(--clr-warning)'}"><path d="M9 11l3 3L22 4"/></svg>
            <div>
              <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${isReconciled ? '✅ Conciliação OK' : '⚠️ Diferença Detectada'}</div>
              <div style="font-size:12px;color:var(--text-secondary)">${isReconciled ? 'Saldo do sistema está de acordo com o banco.' : `Diferença de R$ ${fmt.currency(difference)}`}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">DIFERENÇA</div>
            <div style="font-size:18px;font-weight:800;color:${isReconciled ? 'var(--clr-success)' : 'var(--clr-warning)'}">${fmt.currency(difference)}</div>
          </div>
        </div>

        <!-- Balance Comparison -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div class="reconciliation-section">
            <div class="reconciliation-section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
              Saldo do Sistema
            </div>
            <div style="font-size:20px;font-weight:800;color:var(--clr-primary-light)">${fmt.currency(systemBalance)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Baseado em lançamentos do ERP</div>
          </div>
          
          <div class="reconciliation-section">
            <div class="reconciliation-section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Saldo do Banco (OFX)
            </div>
            <div style="font-size:20px;font-weight:800;color:${ofxBalance >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)'}">${fmt.currency(ofxBalance)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Baseado em extratos importados</div>
          </div>
        </div>

        <!-- Transactions from Bank (OFX) -->
        <div class="reconciliation-section">
          <div class="reconciliation-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 11l3 3L22 4"/></svg>
            Transações Importadas do Banco (${contaOFX.length})
          </div>
          ${contaOFX.length > 0 ? `
            <div class="transaction-list">
              ${contaOFX.map(t => `
                <div class="transaction-item" data-ofx-id="${t.id}" onclick="this.classList.toggle('selected')">
                  <div class="transaction-info">
                    <div class="transaction-date">${fmt.date(t.vencimento)}</div>
                    <div class="transaction-desc">${t.descricao}</div>
                  </div>
                  <div class="transaction-amount ${t.tipo === 'receita' ? 'credit' : 'debit'}">
                    ${t.tipo === 'receita' ? '+' : '−'} ${fmt.currency(t.valor)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);font-size:13px">
              Nenhuma transação importada do banco para esta conta.
            </div>
          `}
        </div>

        <!-- System Transactions -->
        <div class="reconciliation-section">
          <div class="reconciliation-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Lançamentos no Sistema (${contaLancamentos.length})
          </div>
          ${contaLancamentos.length > 0 ? `
            <div class="transaction-list">
              ${contaLancamentos.slice(-20).reverse().map(l => `
                <div class="transaction-item" data-lancamento-id="${l.id}" onclick="this.classList.toggle('selected')">
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);font-size:13px">
              Nenhum lançamento no sistema para esta conta.
            </div>
          `}
        </div>

        <!-- Tips -->
        <div style="background:rgba(79, 110, 247, 0.08);border:1px solid rgba(79, 110, 247, 0.2);border-radius:var(--radius-md);padding:var(--space-4);font-size:12px;color:var(--text-secondary)">
          <strong style="color:var(--clr-primary-light)">💡 Dica:</strong> Compare as transações acima. Clique nos itens para marcá-los como conciliados. Se houver diferença, verifique se não há lançamentos pendentes, futuros ou cancelados.
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="document.getElementById('modal-reconciliation-overlay').remove()">Fechar</button>
      <button class="btn btn-primary" id="btn-save-reconciliation" onclick="saveReconciliation('${conta.id}')">Salvar Conciliação</button>
    `
  });
}

function saveReconciliation(contaId) {
  const modalEl = document.getElementById('modal-reconciliation-overlay');
  if (!modalEl) return;

  const selectedOFX = Array.from(modalEl.querySelectorAll('.transaction-item[data-ofx-id].selected'))
    .map(el => el.dataset.ofxId);
  const selectedLancamentos = Array.from(modalEl.querySelectorAll('.transaction-item[data-lancamento-id].selected'))
    .map(el => el.dataset.lancamentoId);

  const ofxData = JSON.parse(localStorage.getItem('erp_ofx_importados') || '[]');
  const lancamentos = JSON.parse(localStorage.getItem('erp_lancamentos') || '[]');
  const contas = JSON.parse(localStorage.getItem('erp_contas_financeiras') || '[]');

  const matchedOFX = ofxData.filter(t => selectedOFX.includes(t.id));
  const matchedLancamentos = lancamentos.filter(l => selectedLancamentos.includes(l.id));

  // Marca transações selecionadas como conciliadas
  matchedOFX.forEach(tx => tx.conciliado = true);
  matchedLancamentos.forEach(l => l.conciliado = true);

  // Atualiza os dados no localStorage
  const newOFX = ofxData.map(t => selectedOFX.includes(t.id) ? { ...t, conciliado: true } : t);
  const newLancamentos = lancamentos.map(l => selectedLancamentos.includes(l.id) ? { ...l, conciliado: true } : l);
  localStorage.setItem('erp_ofx_importados', JSON.stringify(newOFX));
  localStorage.setItem('erp_lancamentos', JSON.stringify(newLancamentos));

  // Marca a conta financeira como conciliada, se houver correspondência
  const contaIndex = contas.findIndex(c => c.id === contaId);
  if (contaIndex > -1) {
    contas[contaIndex] = { ...contas[contaIndex], conciliada: true, conciliacaoEm: new Date().toISOString() };
    localStorage.setItem('erp_contas_financeiras', JSON.stringify(contas));
  }

  toast.success('Conciliação Salva', 'Status de conciliação atualizado com sucesso.');
  modal.close();
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
  const container = document.getElementById('cat-table-container');
  if (!container) return;

  let sortKey = 'codigo';
  let sortAsc = true;

  const compare = (a, b) => {
    if (a == null) return -1;
    if (b == null) return 1;
    return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
  };

  const renderTable = () => {
    const list = DB.getAll('planoContas').slice();
    list.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      return (compare(left, right) || compare(a.nome, b.nome)) * (sortAsc ? 1 : -1);
    });

    const cols = [
      { label: 'Código', key: 'codigo', sortable: true, render: (row) => `<code style="font-weight:700">${row.codigo}</code>` },
      { label: 'Nome da Categoria', key: 'nome', sortable: true },
      { label: 'Natureza', key: 'tipo', sortable: true, render: (row) => `<span class="badge ${row.tipo==='receita'?'badge-success':'badge-danger'}">${row.tipo.toUpperCase()}</span>` }
    ];

    container.innerHTML = buildTable(cols, list, 'Nenhuma categoria cadastrada.');

    container.querySelectorAll('thead th').forEach((th, index) => {
      const column = cols[index];
      if (!column.sortable) return;
      th.classList.add('sortable');
      th.title = 'Clique para ordenar';
      th.classList.toggle('sort-asc', sortKey === column.key && sortAsc);
      th.classList.toggle('sort-desc', sortKey === column.key && !sortAsc);
      th.addEventListener('click', () => {
        if (sortKey === column.key) {
          sortAsc = !sortAsc;
        } else {
          sortKey = column.key;
          sortAsc = true;
        }
        renderTable();
      });
    });
  };

  renderTable();

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
  const contasFinanceiras = getContasFinanceiras();
  const contaFinanceiraSelecionada = (data && (data.contaFinanceiraId || data.contaId)) || '';

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
            <input type="text" class="form-control" name="vencimento" value="${formatDateInputValue(data ? data.vencimento : today())}" placeholder="DD/MM/AAAA" required readonly>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Categoria DRE</label>
            <select class="form-control" name="conta">
              <option value="">Selecione...</option>
              ${pContas.map(pc => `<option value="${pc.id}" ${data && data.conta === pc.id ? 'selected' : ''}>${pc.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Banco / Conta</label>
            <select class="form-control" name="contaFinanceira">
              <option value="">Nenhuma</option>
              ${contasFinanceiras.map(c => `<option value="${c.id}" ${contaFinanceiraSelecionada === c.id ? 'selected' : ''}>${c.nome}${c.banco ? ` (${c.banco})` : ''}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${tipo === 'receita' ? 'Cliente' : 'Fornecedor'}</label>
          <select class="form-control" name="clienteId">
            <option value="">Nenhum</option>
            ${clientes.map(c => `<option value="${c.id}" ${data && data.clienteId === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
          </select>
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
      <button class="btn btn-ghost" type="button" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
      <button class="btn btn-primary" type="button" id="btn-save-sub-fin">Salvar Registro</button>
    `
  });

  createCalendarPopover(document.querySelector('#form-financeiro-sub input[name="vencimento"]'));

  document.getElementById('btn-save-sub-fin')?.addEventListener('click', () => {
    const form = document.getElementById('form-financeiro-sub');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    const cliId = fd.get('clienteId');
    const cli = cliId ? DB.getById('clientes', cliId) : null;
    const contaFinanceiraId = fd.get('contaFinanceira');
    const contaFinanceira = contaFinanceiraId ? getContasFinanceiras().find(c => c.id === contaFinanceiraId) : null;

    const payload = {
      tipo,
      descricao: fd.get('descricao'),
      valor: parseFloat(fd.get('valor')),
      vencimento: fd.get('vencimento'),
      conta: fd.get('conta') || null,
      contaId: contaFinanceiraId || null,
      contaFinanceiraId: contaFinanceiraId || null,
      contaFinanceiraNome: contaFinanceira ? contaFinanceira.nome : null,
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
