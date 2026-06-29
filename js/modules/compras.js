/* ============================================================
   COMPRAS.JS — Compras / Fornecedores Module
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
          <h1>Compras e Fornecedores</h1>
          <p>Pedidos de compra, reposição de estoque e gestão de fornecedores.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline-primary" id="btn-fornecedores">
            Ver Fornecedores
          </button>
          <button class="btn btn-primary" id="btn-nova-compra">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Compra
          </button>
        </div>
      </div>

      <!-- Quick KPI metrics -->
      <div class="grid grid-3" style="margin-bottom:var(--space-6)">
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Total Compras</div>
          <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-top:2px" id="comp-total-cnt">0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Total Gasto (Histórico)</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-danger);margin-top:2px" id="comp-gasto-val">R$ 0,00</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Fornecedores Homologados</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-primary-light);margin-top:2px" id="comp-forn-cnt">0</div>
        </div>
      </div>

      <!-- Search Filters -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-body-sm">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="comp-search" placeholder="Buscar por número ou fornecedor..." value="${searchQuery}">
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div id="comp-table-container"></div>
      
      <!-- Pagination Container -->
      <div id="comp-pagination" style="display:flex;justify-content:flex-end;margin-top:var(--space-4)"></div>
    </div>
  `;
}

function getFilteredItems() {
  let list = DB.getAll('compras');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c => 
      (c.numero || '').toLowerCase().includes(q) ||
      (c.fornecedorNome || '').toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => (b.numero || '').localeCompare(a.numero || ''));
}

export function afterRender() {
  updateStats();
  renderTable();

  // Search input
  const searchInput = document.getElementById('comp-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const items = getFilteredItems();
      paginator = new Paginator(items, 10);
      renderTable();
    });
  }

  // Action Buttons
  document.getElementById('btn-nova-compra')?.addEventListener('click', () => openCompraForm());
  document.getElementById('btn-fornecedores')?.addEventListener('click', () => openFornecedoresList());
}

function updateStats() {
  const items = DB.getAll('compras');
  const forns = DB.getAll('fornecedores');
  const gasto = items.filter(c => c.status === 'recebido').reduce((a, c) => a + c.total, 0);

  const totalEl = document.getElementById('comp-total-cnt');
  const gastoEl = document.getElementById('comp-gasto-val');
  const fornEl = document.getElementById('comp-forn-cnt');

  if (totalEl) totalEl.textContent = items.length;
  if (gastoEl) gastoEl.textContent = fmt.currency(gasto);
  if (fornEl) fornEl.textContent = forns.length;
}

function renderTable() {
  const container = document.getElementById('comp-table-container');
  if (!container) return;

  const currentItems = paginator.current;

  const cols = [
    { label: 'Número', key: 'numero', render: (row) => `<code style="font-weight:700;color:var(--clr-primary-light)">${row.numero}</code>` },
    { label: 'Fornecedor', key: 'fornecedorNome', render: (row) => `<div style="font-weight:600;color:var(--text-primary)">${row.fornecedorNome}</div>` },
    { label: 'Data Pedido', key: 'data', render: (row) => fmt.date(row.data) },
    { label: 'Total Compra', key: 'total', render: (row) => `<strong style="color:var(--text-primary)">${fmt.currency(row.total)}</strong>` },
    { label: 'Status', key: 'status', render: (row) => `<span class="badge ${fmt.statusClass(row.status)} badge-dot">${fmt.statusLabel(row.status)}</span>` },
    { label: 'Ações', class: 'actions-cell', render: (row) => `
      ${row.status === 'aguardando' ? `
        <button class="btn btn-ghost btn-icon-sm btn-receive-comp" data-id="${row.id}" data-tooltip="Marcar como Recebido" style="color:var(--clr-success)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      ` : ''}
      <button class="btn btn-ghost btn-icon-sm btn-del-comp" data-id="${row.id}" data-tooltip="Cancelar Compra" style="color:var(--clr-danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </button>
    `}
  ];

  container.innerHTML = buildTable(cols, currentItems, 'Nenhum pedido de compra registrado.');

  paginator.renderPagination('comp-pagination', () => renderTable());

  // Attach action triggers
  container.querySelectorAll('.btn-receive-comp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const c = DB.getById('compras', id);

      // 1. Update purchase status
      DB.update('compras', id, { status: 'recebido' });

      // 2. Increment stock in products catalog
      c.itens?.forEach(item => {
        const prod = DB.getById('produtos', item.produtoId);
        if (prod) {
          DB.update('produtos', item.produtoId, { estoque: (prod.estoque || 0) + item.qtd });
        }
      });

      // 3. Automated debit release in Financeiro
      DB.insert('lancamentos', {
        tipo: 'despesa',
        descricao: `Compra Ref: ${c.numero}`,
        valor: c.total,
        vencimento: today(),
        conta: 'pc7', // Categoria Fornecedores
        clienteId: null,
        clienteNome: c.fornecedorNome,
        status: 'pago',
        formaPagamento: 'transferencia',
        pagamento: today(),
        obs: `Lançamento automático referente à compra recebida ${c.numero}`,
      });

      toast.success('Estoque Atualizado', `Compra ${c.numero} recebida. Estoque incrementado e débito lançado.`);
      const items = getFilteredItems();
      paginator = new Paginator(items, 10);
      renderTable();
      updateStats();
    });
  });

  container.querySelectorAll('.btn-del-comp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      modal.confirm('Cancelar Compra', 'Deseja realmente cancelar este pedido de compra?', () => {
        DB.update('compras', id, { status: 'cancelado' });
        toast.warning('Compra Cancelada', 'O pedido de compra foi cancelado.');
        const items = getFilteredItems();
        paginator = new Paginator(items, 10);
        renderTable();
        updateStats();
      }, true);
    });
  });
}

function openCompraForm() {
  const forns = DB.getAll('fornecedores').filter(f => f.status === 'ativo');
  const prods = DB.getAll('produtos').filter(p => p.ativo && p.unidade !== 'HR' && p.unidade !== 'MÊS');
  const num = `PC-${String(DB.getAll('compras').length + 2001).padStart(5, '0')}`;

  modal.open({
    id: 'modal-compra',
    title: 'Novo Pedido de Compra',
    size: 'lg',
    body: `
      <form id="form-compra">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Número do Pedido</label>
            <input type="text" class="form-control" name="numero" value="${num}" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Data do Pedido <span class="required">*</span></label>
            <input type="date" class="form-control" name="data" value="${today()}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fornecedor <span class="required">*</span></label>
            <select class="form-control" name="fornecedorId" required>
              <option value="">Selecione um fornecedor...</option>
              ${forns.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Adicionar Item para Estoque <span class="required">*</span></label>
            <div style="display:flex;gap:var(--space-2)">
              <select class="form-control" id="comp-prod-sel" style="flex:1">
                <option value="">Selecione um item...</option>
                ${prods.map(p => `<option value="${p.id}" data-custo="${p.custo}">${p.nome} — Custo Ref: ${fmt.currency(p.custo)}</option>`).join('')}
              </select>
              <input type="number" class="form-control" id="comp-prod-qtd" value="5" style="width:70px" min="1">
              <button class="btn btn-primary" type="button" id="btn-add-item-comp">Add</button>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <h3 class="form-label" style="margin-bottom:var(--space-3)">Itens do Pedido</h3>
        <div id="comp-itens-list" style="margin-bottom:var(--space-4)">
          <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);border:1px dashed var(--border-default);border-radius:var(--radius-md)">
            Nenhum item adicionado à compra.
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;align-items:flex-end;margin-top:var(--space-4)">
          <div style="text-align:right">
            <div style="font-size:13px;color:var(--text-secondary)">Total da Compra:</div>
            <div style="font-size:28px;font-weight:800;color:var(--clr-danger)" id="comp-total-val">R$ 0,00</div>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-compra-aguardar">Apenas Criar Pedido</button>
      <button class="btn btn-success" id="btn-salvar-compra-recebido">Receber e Lançar</button>
    `,
  });

  window.ERP_MODAL_CLOSE = () => modal.close();

  const itens = [];
  const renderItensList = () => {
    const list = document.getElementById('comp-itens-list');
    if (!list) return;

    if (itens.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:var(--space-4);color:var(--text-muted);border:1px dashed var(--border-default);border-radius:var(--radius-md)">
          Nenhum item adicionado à compra.
        </div>
      `;
      document.getElementById('comp-total-val').textContent = fmt.currency(0);
      return;
    }

    const total = itens.reduce((a, x) => a + x.total, 0);
    document.getElementById('comp-total-val').textContent = fmt.currency(total);

    list.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table" style="font-size:12px">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Custo Unitário</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map((it, idx) => `
              <tr>
                <td><strong>${it.produtoNome}</strong></td>
                <td>${it.qtd}</td>
                <td>${fmt.currency(it.custo)}</td>
                <td><strong>${fmt.currency(it.total)}</strong></td>
                <td>
                  <button class="btn btn-ghost btn-icon-sm" type="button" onclick="window.ERP_REMOVE_COMP_ITEM(${idx})" style="color:var(--clr-danger)">
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

  window.ERP_REMOVE_COMP_ITEM = (idx) => {
    itens.splice(idx, 1);
    renderItensList();
  };

  // Add Item click
  document.getElementById('btn-add-item-comp')?.addEventListener('click', () => {
    const prodSel = document.getElementById('comp-prod-sel');
    const qtdInput = document.getElementById('comp-prod-qtd');

    if (!prodSel.value) {
      toast.warning('Aviso', 'Selecione um item do catálogo.');
      return;
    }

    const opt = prodSel.options[prodSel.selectedIndex];
    const custo = parseFloat(opt.dataset.custo) || 0;
    const qtd = parseInt(qtdInput.value) || 1;

    itens.push({
      produtoId: prodSel.value,
      produtoNome: opt.text.split(' — ')[0],
      qtd,
      custo,
      total: qtd * custo,
    });

    prodSel.value = '';
    qtdInput.value = '5';
    renderItensList();
  });

  const submitCompra = (status) => {
    const form = document.getElementById('form-compra');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (itens.length === 0) {
      toast.warning('Aviso', 'Adicione pelo menos um item ao pedido de compra.');
      return;
    }

    const fd = new FormData(form);
    const fornId = fd.get('fornecedorId');
    const forn = DB.getById('fornecedores', fornId);

    const total = itens.reduce((a, x) => a + x.total, 0);

    const payload = {
      numero: fd.get('numero'),
      fornecedorId,
      fornecedorNome: forn.nome,
      data: fd.get('data'),
      status,
      itens,
      total,
    };

    DB.insert('compras', payload);

    if (status === 'recebido') {
      // Direct integration
      itens.forEach(item => {
        const prod = DB.getById('produtos', item.produtoId);
        if (prod) {
          DB.update('produtos', item.produtoId, { estoque: (prod.estoque || 0) + item.qtd });
        }
      });
      DB.insert('lancamentos', {
        tipo: 'despesa',
        descricao: `Compra Ref: ${payload.numero}`,
        valor: total,
        vencimento: today(),
        conta: 'pc7',
        clienteId: null,
        clienteNome: forn.nome,
        status: 'pago',
        formaPagamento: 'transferencia',
        pagamento: today(),
        obs: `Lançamento automático referente à compra recebida ${payload.numero}`,
      });
      toast.success('Compra Recebida', `Estoque atualizado e despesa paga lançada no Financeiro.`);
    } else {
      toast.success('Pedido Criado', `Pedido de Compra ${payload.numero} registrado aguardando recebimento.`);
    }

    modal.close();
    const items = getFilteredItems();
    paginator = new Paginator(items, 10);
    renderTable();
    updateStats();
  };

  document.getElementById('btn-salvar-compra-aguardar')?.addEventListener('click', () => submitCompra('aguardando'));
  document.getElementById('btn-salvar-compra-recebido')?.addEventListener('click', () => submitCompra('recebido'));
}

function openFornecedoresList() {
  const forns = DB.getAll('fornecedores');

  modal.open({
    id: 'modal-fornecedores-list',
    title: 'Lista de Fornecedores',
    size: 'lg',
    body: `
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-4)">
        <h4 style="font-size:13px;color:var(--text-secondary)">Homologação e contatos</h4>
        <button class="btn btn-primary btn-sm" id="btn-novo-fornecedor">Cadastrar Fornecedor</button>
      </div>
      <div class="table-wrapper">
        <table class="data-table" style="font-size:12px">
          <thead>
            <tr>
              <th>Nome / Razão</th>
              <th>CNPJ</th>
              <th>Contato</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${forns.map(f => `
              <tr>
                <td><strong>${f.nome}</strong></td>
                <td><code>${f.cnpjCpf}</code></td>
                <td>${f.email} | ${f.telefone}</td>
                <td><span class="badge ${fmt.statusClass(f.status)} badge-dot">${fmt.statusLabel(f.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Fechar</button>
    `,
  });

  document.getElementById('btn-novo-fornecedor')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-novo-fornecedor',
      title: 'Cadastrar Fornecedor',
      size: 'md',
      body: `
        <form id="form-novo-fornecedor">
          <div class="form-group">
            <label class="form-label">Razão Social / Nome <span class="required">*</span></label>
            <input type="text" class="form-control" name="nome" required placeholder="Nome do Fornecedor">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">CNPJ <span class="required">*</span></label>
              <input type="text" class="form-control" name="cnpjCpf" required placeholder="00.000.000/0001-00">
            </div>
            <div class="form-group">
              <label class="form-label">Telefone <span class="required">*</span></label>
              <input type="text" class="form-control" name="telefone" required placeholder="(00) 0000-0000">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">E-mail <span class="required">*</span></label>
            <input type="email" class="form-control" name="email" required placeholder="fornecedor@email.com">
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-new-forn">Salvar Fornecedor</button>
      `,
    });

    const cnpjCpfInput = document.querySelector('#form-novo-fornecedor input[name="cnpjCpf"]');
    const telInput = document.querySelector('#form-novo-fornecedor input[name="telefone"]');

    if (cnpjCpfInput) {
      cnpjCpfInput.addEventListener('input', (e) => {
        const cleanVal = e.target.value.replace(/\D/g, '');
        e.target.value = fmt.cnpj(e.target.value);
        if (cleanVal.length === 14) {
          handleCNPJLookup(cleanVal);
        }
      });
    }
    if (telInput) {
      fmt.maskInput(telInput, 'phone');
    }

    const handleCNPJLookup = async (cnpjClean) => {
      if (cnpjClean.length !== 14) return;
      toast.info('Consultando CNPJ...', 'Buscando dados cadastrais na Receita.');
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
        if (!res.ok) throw new Error('Não encontrado');
        const data = await res.json();
        
        const nomeInput = document.querySelector('#form-novo-fornecedor input[name="nome"]');
        const emailInput = document.querySelector('#form-novo-fornecedor input[name="email"]');
        
        if (nomeInput) nomeInput.value = data.razao_social || data.nome_fantasia || '';
        if (emailInput) emailInput.value = data.email || '';
        if (telInput && (data.ddd_telefone_1 || data.telefone)) {
          telInput.value = fmt.phone(data.ddd_telefone_1 || data.telefone || '');
        }
        
        toast.success('CNPJ Carregado', 'Dados do fornecedor preenchidos automaticamente.');
      } catch (err) {
        toast.error('Erro na Busca', 'CNPJ não encontrado ou falha de conexão.');
      }
    };

    document.getElementById('btn-save-new-forn')?.addEventListener('click', () => {
      const form = document.getElementById('form-novo-fornecedor');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      DB.insert('fornecedores', {
        nome: fd.get('nome'),
        cnpjCpf: fd.get('cnpjCpf'),
        telefone: fd.get('telefone'),
        email: fd.get('email'),
        tipo: 'PJ',
        status: 'ativo',
      });
      toast.success('Fornecedor Cadastrado', 'Fornecedor homologado com sucesso.');
      modal.close();
      updateStats();
    });
  });
}
