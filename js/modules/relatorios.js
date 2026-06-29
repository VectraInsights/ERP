/* ============================================================
   RELATORIOS.JS — Relatórios (DRE & Fluxo de Caixa) Module
   ============================================================ */
'use strict';
import DB from '../db.js';
import { fmt } from '../utils/format.js';

export function render() {
  const lancamentos = DB.getAll('lancamentos');
  const planoContas = DB.getAll('planoContas');

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  // DRE logic (Demonstração do Resultado do Exercício)
  const isPai = (id) => planoContas.find(pc => pc.id === id)?.pai === null;

  // Group by category id
  const grouped = {};
  lancamentos.filter(l => l.status === 'pago').forEach(l => {
    grouped[l.conta] = (grouped[l.conta] || 0) + l.valor;
  });

  // Calculate totals by Category Tree
  const dreLines = [];
  let totalReceitas = 0;
  let totalDespesas = 0;

  // Receitas (Código 1)
  const contasReceita = planoContas.filter(pc => pc.tipo === 'receita');
  const receitasList = contasReceita.map(pc => {
    const val = grouped[pc.id] || 0;
    if (pc.pai) {
      // Child account
      return { nome: pc.nome, valor: val, pai: false };
    } else {
      // Main header
      const sumKids = contasReceita.filter(k => k.pai === pc.id).reduce((a, k) => a + (grouped[k.id] || 0), 0);
      totalReceitas += sumKids;
      return { nome: pc.nome, valor: sumKids, pai: true };
    }
  });

  // Despesas (Código 2)
  const contasDespesa = planoContas.filter(pc => pc.tipo === 'despesa');
  const despesasList = contasDespesa.map(pc => {
    const val = grouped[pc.id] || 0;
    if (pc.pai) {
      return { nome: pc.nome, valor: val, pai: false };
    } else {
      const sumKids = contasDespesa.filter(k => k.pai === pc.id).reduce((a, k) => a + (grouped[k.id] || 0), 0);
      totalDespesas += sumKids;
      return { nome: pc.nome, valor: sumKids, pai: true };
    }
  });

  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Relatórios Gerenciais</h1>
          <p>DRE Simplificado e Fluxo de Caixa Realizado do exercício de ${anoAtual}.</p>
        </div>
      </div>

      <div class="grid grid-2">
        <!-- DRE Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              <div class="card-icon" style="background:rgba(79,110,247,0.1)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div class="card-title">DRE — Demonstrativo de Resultado</div>
            </div>
          </div>
          <div class="card-body">
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:var(--space-4)">
              * Exibe apenas lançamentos consolidados (status: <strong>Pago</strong>) agrupados por Plano de Contas.
            </div>

            <!-- DRE Structure -->
            <div style="display:flex;flex-direction:column;gap:4px">
              <!-- RECEITA BRUTA -->
              <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;color:var(--clr-success);border-bottom:1px solid var(--border-default)">
                <span>( + ) RECEITAS OPERACIONAIS BRUTAS</span>
                <span>${fmt.currency(totalReceitas)}</span>
              </div>

              ${receitasList.filter(r => !r.pai).map(r => `
                <div style="display:flex;justify-content:space-between;padding:6px 0 6px var(--space-4);font-size:13px;color:var(--text-secondary)">
                  <span>${r.nome}</span>
                  <span>${fmt.currency(r.valor)}</span>
                </div>
              `).join('')}

              <!-- DESPESAS OPERACIONAIS -->
              <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;color:var(--clr-danger);border-bottom:1px solid var(--border-default);margin-top:var(--space-4)">
                <span>( - ) DESPESAS OPERACIONAIS</span>
                <span>${fmt.currency(totalDespesas)}</span>
              </div>

              ${despesasList.filter(d => !d.pai).map(d => `
                <div style="display:flex;justify-content:space-between;padding:6px 0 6px var(--space-4);font-size:13px;color:var(--text-secondary)">
                  <span>${d.nome}</span>
                  <span>${fmt.currency(d.valor)}</span>
                </div>
              `).join('')}

              <div class="divider" style="margin:var(--space-4) 0 var(--space-3) 0"></div>

              <!-- LUCRO LIQUIDO -->
              <div style="display:flex;justify-content:space-between;padding:10px var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);font-weight:800;font-size:16px;color:${lucroLiquido >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)'}">
                <span>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                <span>${fmt.currency(lucroLiquido)}</span>
              </div>

              <div style="display:flex;justify-content:space-between;padding:6px var(--space-3);font-size:12px;color:var(--text-muted)">
                <span>Margem Líquida</span>
                <span>${fmt.percent(margemLiquida)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cash Flow Details Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              <div class="card-icon" style="background:rgba(16,185,129,0.1)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="card-title">Fluxo de Caixa Mensal</div>
            </div>
          </div>
          <div class="card-body">
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:var(--space-4)">
              Detalhamento de Entradas, Saídas e Saldo Operacional acumulado mês a mês.
            </div>

            <div class="table-wrapper">
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:var(--bg-elevated);border-bottom:1px solid var(--border-default)">
                    <th style="padding:8px;text-align:left">Mês</th>
                    <th style="padding:8px;text-align:right;color:var(--clr-success)">Entradas</th>
                    <th style="padding:8px;text-align:right;color:var(--clr-danger)">Saídas</th>
                    <th style="padding:8px;text-align:right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  ${getLast6MonthsData().map(row => `
                    <tr style="border-bottom:1px solid var(--border-subtle)">
                      <td style="padding:10px;font-weight:600;color:var(--text-primary)">${row.mes}</td>
                      <td style="padding:10px;text-align:right;color:var(--clr-success)">${fmt.currency(row.entradas)}</td>
                      <td style="padding:10px;text-align:right;color:var(--clr-danger)">${fmt.currency(row.saidas)}</td>
                      <td style="padding:10px;text-align:right;font-weight:700;color:${row.saldo >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)'}">
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
    </div>
  `;
}

function getLast6MonthsData() {
  const lancamentos = DB.getAll('lancamentos').filter(l => l.status === 'pago');
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anoAtual, mesAtual - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const entradas = lancamentos
      .filter(l => l.tipo === 'receita' && new Date(l.vencimento).getMonth() === m && new Date(l.vencimento).getFullYear() === y)
      .reduce((a, l) => a + l.valor, 0);

    const saidas = lancamentos
      .filter(l => l.tipo === 'despesa' && new Date(l.vencimento).getMonth() === m && new Date(l.vencimento).getFullYear() === y)
      .reduce((a, l) => a + l.valor, 0);

    data.push({
      mes: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      entradas,
      saidas,
      saldo: entradas - saidas,
    });
  }
  return data;
}

export function afterRender() {}
