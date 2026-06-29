/* ============================================================
   DASHBOARD.JS — Home Dashboard (Hoje & Próximos 7 Dias)
   ============================================================ */
'use strict';
import DB from '../db.js';
import { fmt, today } from '../utils/format.js';
import { countUp } from '../utils/ui.js';
import { barChart } from '../utils/charts.js';

let currentTab = 'hoje'; // 'hoje' ou '7dias'

export function render() {
  const dataRef = today();

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Dashboard Geral</h1>
          <p>Visão de curto prazo — Receitas e Despesas programadas.</p>
        </div>
        <div class="page-header-actions">
          <div class="period-selector" id="dash-tab-sel">
            <button class="period-btn ${currentTab === 'hoje' ? 'active' : ''}" data-tab="hoje">Hoje</button>
            <button class="period-btn ${currentTab === '7dias' ? 'active' : ''}" data-tab="7dias">Próximos 7 Dias</button>
          </div>
        </div>
      </div>

      <!-- Main Widgets Container -->
      <div class="grid grid-3 stagger-children" style="margin-bottom:var(--space-6)" id="dash-kpi-grid">
        <!-- Rendered dynamically -->
      </div>

      <div class="grid grid-2">
        <!-- Scheduled Payments / Receipts -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              <div class="card-icon" style="background:rgba(79,110,247,0.1)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div class="card-title" id="sched-card-title">Lançamentos para Hoje</div>
                <div class="card-subtitle" id="sched-card-sub">Agenda financeira</div>
              </div>
            </div>
          </div>
          <div class="card-body-sm" id="sched-list">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Short-term projection graph -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              <div class="card-icon" style="background:rgba(16,185,129,0.1)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div>
                <div class="card-title">Projeção de Caixa</div>
                <div class="card-subtitle" id="chart-sub-label">Visão diária</div>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height:250px">
              <canvas id="chart-shortterm"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  updateDashboardView();

  // Tab switch listener
  document.querySelectorAll('#dash-tab-sel .period-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#dash-tab-sel .period-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.dataset.tab;
      updateDashboardView();
    });
  });
}

function updateDashboardView() {
  const lancamentos = DB.getAll('lancamentos');
  const dRef = today();
  const dateLimit = new Date();
  
  if (currentTab === '7dias') {
    dateLimit.setDate(dateLimit.getDate() + 7);
  }
  const dateLimitStr = dateLimit.toISOString().split('T')[0];

  // Filters
  const filterFn = (l) => {
    if (currentTab === 'hoje') {
      return l.vencimento === dRef && l.status !== 'cancelado';
    } else {
      return l.vencimento >= dRef && l.vencimento <= dateLimitStr && l.status !== 'cancelado';
    }
  };

  const currentItems = lancamentos.filter(filterFn);
  const totalReceitas = currentItems.filter(l => l.tipo === 'receita').reduce((a, l) => a + l.valor, 0);
  const totalDespesas = currentItems.filter(l => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  // Render KPIs
  const kpiGrid = document.getElementById('dash-kpi-grid');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="kpi-card" style="--kpi-gradient: linear-gradient(90deg, #10B981, #34D399)">
        <div class="kpi-card-top">
          <div class="kpi-icon" style="background:rgba(16,185,129,0.12)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="kpi-label">A Receber ${currentTab === 'hoje' ? 'Hoje' : 'em 7 dias'}</div>
        <div class="kpi-value" id="kpi-rec-val">R$ 0</div>
        <div class="kpi-sub">${currentItems.filter(l => l.tipo === 'receita').length} títulos programados</div>
      </div>

      <div class="kpi-card" style="--kpi-gradient: linear-gradient(90deg, #EF4444, #F87171)">
        <div class="kpi-card-top">
          <div class="kpi-icon" style="background:rgba(239,68,68,0.12)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>
        <div class="kpi-label">A Pagar ${currentTab === 'hoje' ? 'Hoje' : 'em 7 dias'}</div>
        <div class="kpi-value" id="kpi-des-val">R$ 0</div>
        <div class="kpi-sub">${currentItems.filter(l => l.tipo === 'despesa').length} títulos programados</div>
      </div>

      <div class="kpi-card" style="--kpi-gradient: linear-gradient(90deg, #4F6EF7, #7B93FF)">
        <div class="kpi-card-top">
          <div class="kpi-icon" style="background:rgba(79,110,247,0.12)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-label">Saldo Líquido Previsto</div>
        <div class="kpi-value" id="kpi-sld-val" style="color:${saldo>=0?'var(--clr-success)':'var(--clr-danger)'}">R$ 0</div>
        <div class="kpi-sub">${saldo >= 0 ? 'Positivo no período' : 'Atenção ao caixa'}</div>
      </div>
    `;

    setTimeout(() => {
      countUp(document.getElementById('kpi-rec-val'), totalReceitas, 'R$ ', '');
      countUp(document.getElementById('kpi-des-val'), totalDespesas, 'R$ ', '');
      countUp(document.getElementById('kpi-sld-val'), Math.abs(saldo), saldo < 0 ? '- R$ ' : 'R$ ');
    }, 100);
  }

  // Update Scheduled Card Title
  const sTitle = document.getElementById('sched-card-title');
  const sSub = document.getElementById('sched-card-sub');
  if (sTitle) {
    sTitle.textContent = currentTab === 'hoje' ? 'Lançamentos para Hoje' : 'Lançamentos da Semana';
    sSub.textContent = currentTab === 'hoje' ? 'Compromissos agendados' : 'Próximos 7 dias programados';
  }

  // Render Agenda list
  const listContainer = document.getElementById('sched-list');
  if (listContainer) {
    if (currentItems.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center;padding:var(--space-6);color:var(--text-muted)">
          ☕ Nenhum compromisso financeiro programado para este período.
        </div>
      `;
    } else {
      // Sort items by status pending first, then value desc
      const sorted = [...currentItems].sort((a, b) => {
        if (a.status === 'pendente' && b.status !== 'pendente') return -1;
        if (a.status !== 'pendente' && b.status === 'pendente') return 1;
        return b.valor - a.valor;
      });

      listContainer.innerHTML = sorted.map(l => `
        <div class="list-item" style="padding:var(--space-3)">
          <div class="kpi-icon" style="background:${l.tipo==='receita'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'}; width:32px;height:32px;border-radius:var(--radius-md);flex-shrink:0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${l.tipo==='receita'?'#10B981':'#EF4444'}" stroke-width="2.5" width="14" height="14">
              ${l.tipo==='receita' ? '<polyline points="18 15 12 9 6 15"/>' : '<polyline points="18 9 12 15 6 9"/>'}
            </svg>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.descricao}</div>
            <div style="font-size:11px;color:var(--text-secondary)">Vencimento: ${fmt.date(l.vencimento)} | Ref: ${l.clienteNome || 'Geral'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:700;color:${l.tipo==='receita'?'var(--clr-success)':'var(--clr-danger)'}">${l.tipo==='receita'?'+':'-'} ${fmt.currency(l.valor)}</div>
            <span class="badge ${fmt.statusClass(l.status)} badge-dot" style="font-size:10px">${fmt.statusLabel(l.status)}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Draw chart
  const labelSub = document.getElementById('chart-sub-label');
  if (labelSub) {
    labelSub.textContent = currentTab === 'hoje' ? 'Consolidado do Dia' : 'Resumo dos Próximos 7 Dias';
  }

  // Gather chart data
  let labels = [];
  let recs = [];
  let dess = [];

  if (currentTab === 'hoje') {
    labels = ['Entradas', 'Saídas'];
    recs = [totalReceitas, 0];
    dess = [0, totalDespesas];
  } else {
    // Collect next 7 days individual dates
    for (let i = 0; i < 7; i++) {
      const loopDate = new Date();
      loopDate.setDate(loopDate.getDate() + i);
      const str = loopDate.toISOString().split('T')[0];
      
      // Label like "29/Jun"
      labels.push(loopDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }));
      
      const dayRec = lancamentos.filter(l => l.tipo === 'receita' && l.vencimento === str && l.status !== 'cancelado').reduce((a,l)=>a+l.valor,0);
      const dayDes = lancamentos.filter(l => l.tipo === 'despesa' && l.vencimento === str && l.status !== 'cancelado').reduce((a,l)=>a+l.valor,0);
      recs.push(dayRec);
      dess.push(dayDes);
    }
  }

  setTimeout(() => {
    barChart('chart-shortterm', labels, [
      { label: 'Entradas', data: recs, color: '#10B981' },
      { label: 'Saídas', data: dess, color: '#EF4444' },
    ]);
  }, 200);
}
