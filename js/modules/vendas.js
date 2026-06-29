/* ============================================================
   VENDAS.JS — Vendas / Notas Fiscais Module
   ============================================================ */
'use strict';
import DB from '../db.js';
import { fmt, today } from '../utils/format.js';
import { modal, toast, Paginator, buildTable } from '../utils/ui.js';

let paginator = null;
let searchQuery = '';

export function render() {
  const items = getFilteredItems();
  paginator = new Paginator(items, 10);

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Vendas e Faturamento</h1>
          <p>Pedidos de venda, ordens de serviço e emissão de Notas Fiscais.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-nova-venda">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Venda
          </button>
        </div>
      </div>

      <!-- Financial Balance Banner -->
      <div class="grid grid-3" style="margin-bottom:var(--space-6)">
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Faturamento Mensal</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-success);margin-top:2px" id="sales-fat-mes">R$ 0,00</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Vendas no Mês</div>
          <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-top:2px" id="sales-count-mes">0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Aguardando Faturar</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-warning);margin-top:2px" id="sales-pending-fat">0</div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-body-sm">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="sales-search" placeholder="Buscar por número, cliente..." value="${searchQuery}">
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div id="sales-table-container"></div>
      
      <!-- Pagination Container -->
      <div id="sales-pagination" style="display:flex;justify-content:flex-end;margin-top:var(--space-4)"></div>
    </div>
  `;
}

function getFilteredItems() {
  let list = DB.getAll('vendas');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(v => 
      (v.numero || '').toLowerCase().includes(q) ||
      (v.clienteNome || '').toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => (b.numero || '').localeCompare(a.numero || ''));
}

export function afterRender() {
  updateStats();
  renderTable();

  // Search input
  const searchInput = document.getElementById('sales-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const items = getFilteredItems();
      paginator = new Paginator(items, 10);
      renderTable();
    });
  }

  // Nova Venda
  document.getElementById('btn-nova-venda')?.addEventListener('click', () => openVendaForm());
}

function updateStats() {
  const items = DB.getAll('vendas');
  const d = new Date();
  const mes = d.getMonth();
  const ano = d.getFullYear();

  const isMes = (iso) => {
    const x = new Date(iso);
    return x.getMonth() === mes && x.getFullYear() === ano;
  };

  const fat = items.filter(v => v.status !== 'cancelado' && isMes(v.createdAt)).reduce((a, v) => a + v.total, 0);
  const count = items.filter(v => isMes(v.createdAt)).length;
  const pending = items.filter(v => v.status === 'rascunho').length;

  const fatEl = document.getElementById('sales-fat-mes');
  const countEl = document.getElementById('sales-count-mes');
  const pendingEl = document.getElementById('sales-pending-fat');

  if (fatEl) fatEl.textContent = fmt.currency(fat);
  if (countEl) countEl.textContent = count;
  if (pendingEl) pendingEl.textContent = pending;
}

function renderTable() {
  const container = document.getElementById('sales-table-container');
  if (!container) return;

  const currentItems = paginator.current;

  const cols = [
    { label: 'Número', key: 'numero', render: (row) => `<code style="font-weight:700;color:var(--clr-primary-light)">${row.numero}</code>` },
    { label: 'Cliente', key: 'clienteNome', render: (row) => `<div style="font-weight:600;color:var(--text-primary)">${row.clienteNome}</div>` },
    { label: 'Data', key: 'data', render: (row) => fmt.date(row.data) },
    { label: 'Total Venda', key: 'total', render: (row) => `<strong style="color:var(--text-primary)">${fmt.currency(row.total)}</strong>` },
    { label: 'Status NF', key: 'status', render: (row) => `<span class="badge ${fmt.statusClass(row.status)} badge-dot">${fmt.statusLabel(row.status)}</span>` },
    { label: 'Ações', class: 'actions-cell', render: (row) => `
      <button class="btn btn-ghost btn-icon-sm btn-view-nf" data-id="${row.id}" data-tooltip="Visualizar Nota">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      ${row.status === 'rascunho' || row.status === 'faturado' ? `
        <button class="btn btn-ghost btn-icon-sm btn-invoice-nf" data-id="${row.id}" data-tooltip="Simular Emissão NF-e" style="color:var(--clr-success)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </button>
      ` : ''}
      <button class="btn btn-ghost btn-icon-sm btn-del-sale" data-id="${row.id}" data-tooltip="Cancelar Venda" style="color:var(--clr-danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </button>
    `}
  ];

  container.innerHTML = buildTable(cols, currentItems, 'Nenhuma venda encontrada.');

  paginator.renderPagination('sales-pagination', () => renderTable());

  // Attach actions
  container.querySelectorAll('.btn-view-nf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const v = DB.getById('vendas', id);
      if (v) openInvoiceDetail(v);
    });
  });

  container.querySelectorAll('.btn-invoice-nf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      DB.update('vendas', id, { status: 'pago' });
      // Create financial release automatically!
      const v = DB.getById('vendas', id);
      DB.insert('lancamentos', {
        tipo: 'receita',
        descricao: `Venda ${v.numero}`,
        valor: v.total,
        vencimento: today(),
        conta: 'pc2', // Venda de produtos
        clienteId: v.clienteId,
        clienteNome: v.clienteNome,
        status: 'pago',
        formaPagamento: 'pix',
        pagamento: today(),
        obs: `Faturamento automático da venda ${v.numero}`,
      });

      toast.success('NF-e Emitida', `Nota Fiscal ${v.numero} emitida e faturada com sucesso! Contas a receber atualizado.`);
      const items = getFilteredItems();
      paginator = new Paginator(items, 10);
      renderTable();
      updateStats();
    });
  });

  container.querySelectorAll('.btn-del-sale').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      modal.confirm('Cancelar Venda', 'Deseja realmente cancelar esta venda? O status será alterado para cancelado.', () => {
        DB.update('vendas', id, { status: 'cancelado' });
        toast.warning('Venda Cancelada', 'A venda foi marcada como cancelada.');
        const items = getFilteredItems();
        paginator = new Paginator(items, 10);
        renderTable();
        updateStats();
      }, true);
    });
  });
}

function openVendaForm() {
  const clis = DB.getAll('clientes').filter(c => c.status === 'ativo');
  const prods = DB.getAll('produtos').filter(p => p.ativo);
  const num = `NF-${String(DB.getAll('vendas').length + 1001).padStart(5, '0')}`;

  modal.open({
    id: 'modal-venda',
    title: 'Nova Venda',
    size: 'lg',
    body: `
      <form id="form-venda">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Número da Venda</label>
            <input type="text" class="form-control" name="numero" value="${num}" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Data da Venda <span class="required">*</span></label>
            <input type="date" class="form-control" name="data" value="${today()}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cliente <span class="required">*</span></label>
            <select class="form-control" name="clienteId" required id="venda-cli-sel">
              <option value="">Selecione um cliente...</option>
              ${clis.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Adicionar Item <span class="required">*</span></label>
            <div style="display:flex;gap:var(--space-2)">
              <select class="form-control" id="venda-prod-sel" style="flex:1">
                <option value="">Selecione um produto...</option>
                ${prods.map(p => `<option value="${p.id}" data-preco="${p.preco}">${p.nome} — ${fmt.currency(p.preco)}</option>`).join('')}
              </select>
              <input type="number" class="form-control" id="venda-prod-qtd" value="1" style="width:70px" min="1">
              <button class="btn btn-primary" type="button" id="btn-add-item-venda">Add</button>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <h3 class="form-label" style="margin-bottom:var(--space-3)">Itens Selecionados</h3>
        <div id="venda-itens-list" style="margin-bottom:var(--space-4)">
          <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);border:1px dashed var(--border-default);border-radius:var(--radius-md)">
            Nenhum item adicionado à venda.
          </div>
        </div>

        <div class="form-row" style="margin-top:var(--space-4)">
          <div class="form-group">
            <label class="form-label">Observações</label>
            <textarea class="form-control" name="obs" rows="2" placeholder="Informações internas ou rodapé da nota..."></textarea>
          </div>
          <div class="form-group" style="display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end">
            <div style="font-size:13px;color:var(--text-secondary)">Total Geral:</div>
            <div style="font-size:28px;font-weight:800;color:var(--clr-primary-light)" id="venda-total-val">R$ 0,00</div>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-venda">Salvar como Rascunho</button>
      <button class="btn btn-success" id="btn-faturar-venda">Emitir NF-e & Faturar</button>
    `,
  });

  window.ERP_MODAL_CLOSE = () => modal.close();

  const itens = [];
  const renderItensList = () => {
    const list = document.getElementById('venda-itens-list');
    if (!list) return;

    if (itens.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);border:1px dashed var(--border-default);border-radius:var(--radius-md)">
          Nenhum item adicionado à venda.
        </div>
      `;
      document.getElementById('venda-total-val').textContent = fmt.currency(0);
      return;
    }

    const total = itens.reduce((a, x) => a + x.total, 0);
    document.getElementById('venda-total-val').textContent = fmt.currency(total);

    list.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table" style="font-size:12px">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Preço Unitário</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map((it, idx) => `
              <tr>
                <td><strong>${it.produtoNome}</strong></td>
                <td>${it.qtd}</td>
                <td>${fmt.currency(it.preco)}</td>
                <td><strong>${fmt.currency(it.total)}</strong></td>
                <td>
                  <button class="btn btn-ghost btn-icon-sm" type="button" onclick="window.ERP_REMOVE_ITEM(${idx})" style="color:var(--clr-danger)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  window.ERP_REMOVE_ITEM = (idx) => {
    itens.splice(idx, 1);
    renderItensList();
  };

  // Add Item Click
  document.getElementById('btn-add-item-venda')?.addEventListener('click', () => {
    const prodSel = document.getElementById('venda-prod-sel');
    const qtdInput = document.getElementById('venda-prod-qtd');

    if (!prodSel.value) {
      toast.warning('Aviso', 'Selecione um produto.');
      return;
    }

    const opt = prodSel.options[prodSel.selectedIndex];
    const preco = parseFloat(opt.dataset.preco);
    const qtd = parseInt(qtdInput.value) || 1;

    itens.push({
      produtoId: prodSel.value,
      produtoNome: opt.text.split(' — ')[0],
      qtd,
      preco,
      total: qtd * preco,
    });

    prodSel.value = '';
    qtdInput.value = '1';
    renderItensList();
  });

  const saveVenda = (status) => {
    const form = document.getElementById('form-venda');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (itens.length === 0) {
      toast.warning('Aviso', 'Adicione pelo menos um item à venda.');
      return;
    }

    const fd = new FormData(form);
    const cliId = fd.get('clienteId');
    const cli = DB.getById('clientes', cliId);

    const total = itens.reduce((a, x) => a + x.total, 0);

    const payload = {
      numero: fd.get('numero'),
      clienteId,
      clienteNome: cli.nome,
      data: fd.get('data'),
      status,
      itens,
      subtotal: total,
      desconto: 0,
      total,
      obs: fd.get('obs'),
    };

    const v = DB.insert('vendas', payload);

    if (status === 'pago') {
      // Automate financial release
      DB.insert('lancamentos', {
        tipo: 'receita',
        descricao: `Venda ${v.numero}`,
        valor: v.total,
        vencimento: today(),
        conta: 'pc2',
        clienteId: v.clienteId,
        clienteNome: v.clienteNome,
        status: 'pago',
        formaPagamento: 'pix',
        pagamento: today(),
        obs: `Faturamento automático da venda ${v.numero}`,
      });
      toast.success('Venda Emitida', `Nota Fiscal ${v.numero} emitida com sucesso!`);
    } else {
      toast.success('Rascunho Salvo', `Venda ${v.numero} salva com sucesso como rascunho.`);
    }

    modal.close();
    const items = getFilteredItems();
    paginator = new Paginator(items, 10);
    renderTable();
    updateStats();
  };

  document.getElementById('btn-salvar-venda')?.addEventListener('click', () => saveVenda('rascunho'));
  document.getElementById('btn-faturar-venda')?.addEventListener('click', () => saveVenda('pago'));
}

function openInvoiceDetail(v) {
  const config = DB.getAll('config')[0] || {
    empresa: {
      nome: 'TechFlow Soluções LTDA',
      cnpj: '12.345.678/0001-90',
      telefone: '(11) 3456-7890',
      email: 'contato@techflow.com.br',
      endereco: 'Av. Paulista, 1000, São Paulo - SP',
    }
  };

  modal.open({
    id: 'modal-invoice-view',
    title: `Visualizar NF-e — ${v.numero}`,
    size: 'md',
    body: `
      <div style="background:#0F111A;padding:var(--space-5);border-radius:var(--radius-lg);border:1px solid var(--border-default)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">
          <div>
            <h3 style="color:var(--text-primary);font-family:var(--font-display)">${config.empresa.nome}</h3>
            <p style="font-size:11px;color:var(--text-secondary)">CNPJ: ${config.empresa.cnpj}</p>
            <p style="font-size:11px;color:var(--text-secondary)">${config.empresa.endereco}</p>
          </div>
          <div style="text-align:right">
            <h3 style="color:var(--clr-primary-light);font-family:var(--font-display)">NF-e SIMULADA</h3>
            <p style="font-size:11px;color:var(--text-secondary)">Série 001 | Nº ${v.numero.split('-')[1]}</p>
            <p style="font-size:11px;color:var(--text-secondary)">Emissão: ${fmt.date(v.data)}</p>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-3);margin-bottom:var(--space-4)">
          <h4 style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Destinatário</h4>
          <p style="font-weight:600;color:var(--text-primary)">${v.clienteNome}</p>
        </div>

        <h4 style="font-size:12px;color:var(--text-muted);text-transform:uppercase;margin-bottom:var(--space-2)">Itens da Nota</h4>
        <div class="table-wrapper" style="margin-bottom:var(--space-4)">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead>
              <tr style="background:var(--bg-elevated);border-bottom:1px solid var(--border-subtle)">
                <th style="padding:6px;text-align:left">Item</th>
                <th style="padding:6px;text-align:right">Qtd</th>
                <th style="padding:6px;text-align:right">Preço</th>
                <th style="padding:6px;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${v.itens.map(it => `
                <tr style="border-bottom:1px solid var(--border-subtle)">
                  <td style="padding:6px;color:var(--text-primary)">${it.produtoNome}</td>
                  <td style="padding:6px;text-align:right;color:var(--text-primary)">${it.qtd}</td>
                  <td style="padding:6px;text-align:right;color:var(--text-primary)">${fmt.currency(it.preco)}</td>
                  <td style="padding:6px;text-align:right;color:var(--text-primary)">${fmt.currency(it.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <p style="font-size:11px;color:var(--text-muted)">Status de Transmissão: SEFAZ AUTORIZADA</p>
            <p style="font-size:11px;color:var(--text-secondary)">Chave de Acesso: <br><code style="font-size:10px">${Math.random().toString().slice(2,18)}...</code></p>
          </div>
          <div style="text-align:right">
            <p style="font-size:12px;color:var(--text-secondary)">Valor Total da Nota:</p>
            <p style="font-size:20px;font-weight:800;color:var(--clr-success)">${fmt.currency(v.total)}</p>
          </div>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-primary" onclick="window.ERP_MODAL_CLOSE()">Fechar NF-e</button>
    `,
  });
}
