/* ============================================================
   CLIENTES.JS — Clientes Module
   ============================================================ */
'use strict';
import DB from '../db.js';
import { fmt } from '../utils/format.js';
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
          <h1>Clientes</h1>
          <p>Cadastro, gestão e histórico de clientes do ERP.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-novo-cliente">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Cliente
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-3" style="margin-bottom:var(--space-6)">
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Total de Clientes</div>
          <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-top:2px" id="stats-total-cli">0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Clientes Ativos</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-success);margin-top:2px" id="stats-ativos-cli">0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Ticket Médio Geral</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-primary-light);margin-top:2px" id="stats-ticket-cli">R$ 0,00</div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-body-sm">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="cli-search" placeholder="Buscar por nome, email, CPF/CNPJ..." value="${searchQuery}">
          </div>
        </div>
      </div>

      <!-- Table Container -->
      <div id="cli-table-container"></div>
      
      <!-- Pagination Container -->
      <div id="cli-pagination" style="display:flex;justify-content:flex-end;margin-top:var(--space-4)"></div>
    </div>
  `;
}

function getFilteredItems() {
  let list = DB.getAll('clientes');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(c => 
      (c.nome || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.cnpjCpf || '').toLowerCase().includes(q) ||
      (c.cidade || '').toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function afterRender() {
  updateStats();
  renderTable();

  // Search input event
  const searchInput = document.getElementById('cli-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const items = getFilteredItems();
      paginator = new Paginator(items, 10);
      renderTable();
    });
  }

  // Novo Cliente button
  document.getElementById('btn-novo-cliente')?.addEventListener('click', () => openClienteForm());
}

function updateStats() {
  const all = DB.getAll('clientes');
  const active = all.filter(c => c.status === 'ativo').length;
  
  const v = DB.getAll('vendas');
  const totalVal = v.reduce((a, x) => a + x.total, 0);
  const ticket = v.length ? (totalVal / v.length) : 0;

  const totalEl = document.getElementById('stats-total-cli');
  const activeEl = document.getElementById('stats-ativos-cli');
  const ticketEl = document.getElementById('stats-ticket-cli');

  if (totalEl) totalEl.textContent = all.length;
  if (activeEl) activeEl.textContent = active;
  if (ticketEl) ticketEl.textContent = fmt.currency(ticket);
}

function renderTable() {
  const container = document.getElementById('cli-table-container');
  if (!container) return;

  const currentItems = paginator.current;

  const cols = [
    { label: 'Nome / Razão Social', key: 'nome', render: (row) => `<div style="font-weight:600;color:var(--text-primary)">${row.nome}</div><div style="font-size:11px;color:var(--text-muted)">${row.cnpjCpf} (${row.tipo})</div>` },
    { label: 'Contato', key: 'email', render: (row) => `<div>${row.email || '—'}</div><div style="font-size:11px;color:var(--text-muted)">${row.telefone || '—'}</div>` },
    { label: 'Localização', key: 'cidade', render: (row) => row.cidade ? `${row.cidade} - ${row.uf}` : '—' },
    { label: 'Limite de Crédito', key: 'limite', render: (row) => fmt.currency(row.limite) },
    { label: 'Status', key: 'status', render: (row) => `<span class="badge ${fmt.statusClass(row.status)} badge-dot">${fmt.statusLabel(row.status)}</span>` },
    { label: 'Ações', class: 'actions-cell', render: (row) => `
      <button class="btn btn-ghost btn-icon-sm btn-edit-cli" data-id="${row.id}" data-tooltip="Editar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn btn-ghost btn-icon-sm btn-del-cli" data-id="${row.id}" data-tooltip="Excluir" style="color:var(--clr-danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `}
  ];

  container.innerHTML = buildTable(cols, currentItems, 'Nenhum cliente cadastrado.');

  // Pagination hook
  paginator.renderPagination('cli-pagination', () => renderTable());

  // Attach button event listeners
  container.querySelectorAll('.btn-edit-cli').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const c = DB.getById('clientes', id);
      if (c) openClienteForm(c);
    });
  });

  container.querySelectorAll('.btn-del-cli').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      modal.confirm('Confirmar Exclusão', 'Deseja realmente excluir este cliente? Lançamentos associados a ele não serão apagados, mas ele não estará mais disponível para novos lançamentos.', () => {
        DB.remove('clientes', id);
        toast.success('Cliente Removido', 'Cadastro do cliente foi excluído.');
        const items = getFilteredItems();
        paginator = new Paginator(items, 10);
        renderTable();
        updateStats();
      }, true);
    });
  });
}

function openClienteForm(data = null) {
  const isEdit = !!data;

  modal.open({
    id: 'modal-cliente',
    title: isEdit ? 'Editar Cliente' : 'Novo Cliente',
    size: 'md',
    body: `
      <form id="form-cliente">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo de Pessoa <span class="required">*</span></label>
            <select class="form-control" name="tipo" id="cli-tipo-sel" required>
              <option value="PJ" ${data && data.tipo === 'PJ' ? 'selected' : ''}>Pessoa Jurídica (PJ)</option>
              <option value="PF" ${data && data.tipo === 'PF' ? 'selected' : ''}>Pessoa Física (PF)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" id="label-cnpj-cpf">CNPJ / CPF <span class="required">*</span></label>
            <input type="text" class="form-control" name="cnpjCpf" value="${data ? data.cnpjCpf : ''}" required placeholder="00.000.000/0001-00">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nome / Razão Social <span class="required">*</span></label>
          <input type="text" class="form-control" name="nome" value="${data ? data.nome : ''}" required placeholder="Nome completo ou Razão Social">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">E-mail <span class="required">*</span></label>
            <input type="email" class="form-control" name="email" value="${data ? data.email : ''}" required placeholder="email@exemplo.com">
          </div>
          <div class="form-group">
            <label class="form-label">Telefone <span class="required">*</span></label>
            <input type="text" class="form-control" name="telefone" id="cli-tel" value="${data ? data.telefone : ''}" required placeholder="(00) 00000-0000">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group" style="grid-column: span 2">
            <label class="form-label">Cidade</label>
            <input type="text" class="form-control" name="cidade" value="${data ? data.cidade : ''}" placeholder="Ex: São Paulo">
          </div>
          <div class="form-group">
            <label class="form-label">UF</label>
            <input type="text" class="form-control" name="uf" maxlength="2" value="${data ? data.uf : ''}" placeholder="SP">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Limite de Crédito</label>
            <div class="input-group">
              <span class="input-prefix">R$</span>
              <input type="number" step="1" class="form-control" name="limite" value="${data ? data.limite : '0'}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" name="status">
              <option value="ativo" ${data && data.status === 'ativo' ? 'selected' : ''}>Ativo</option>
              <option value="inativo" ${data && data.status === 'inativo' ? 'selected' : ''}>Inativo</option>
            </select>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-cliente">Salvar Cliente</button>
    `,
  });

  window.ERP_MODAL_CLOSE = () => modal.close();

  // Masks
  const telInput = document.getElementById('cli-tel');
  if (telInput) fmt.maskInput(telInput, 'phone');
  
  const typeSel = document.getElementById('cli-tipo-sel');
  const cnpjCpfInput = document.querySelector('input[name="cnpjCpf"]');
  const labelCnpjCpf = document.getElementById('label-cnpj-cpf');
  
  const adjustMask = () => {
    if (typeSel.value === 'PJ') {
      labelCnpjCpf.innerHTML = 'CNPJ <span class="required">*</span>';
      cnpjCpfInput.placeholder = '00.000.000/0001-00';
    } else {
      labelCnpjCpf.innerHTML = 'CPF <span class="required">*</span>';
      cnpjCpfInput.placeholder = '000.000.000-00';
    }
  };

  typeSel?.addEventListener('change', adjustMask);

  const handleCNPJLookup = async (cnpjClean) => {
    if (cnpjClean.length !== 14) return;
    toast.info('Consultando CNPJ...', 'Buscando dados cadastrais na Receita.');
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
      if (!res.ok) throw new Error('Não encontrado');
      const data = await res.json();
      
      const nomeInput = document.querySelector('input[name="nome"]');
      const emailInput = document.querySelector('input[name="email"]');
      const cidadeInput = document.querySelector('input[name="cidade"]');
      const ufInput = document.querySelector('input[name="uf"]');
      
      if (nomeInput) nomeInput.value = data.razao_social || data.nome_fantasia || '';
      if (emailInput) emailInput.value = data.email || '';
      if (telInput && (data.ddd_telefone_1 || data.telefone)) {
        telInput.value = fmt.phone(data.ddd_telefone_1 || data.telefone || '');
      }
      if (cidadeInput) cidadeInput.value = data.municipio || '';
      if (ufInput) ufInput.value = data.uf || '';
      
      toast.success('CNPJ Carregado', 'Dados preenchidos automaticamente.');
    } catch (err) {
      toast.error('Erro na Busca', 'CNPJ não encontrado ou falha de conexão.');
    }
  };

  cnpjCpfInput?.addEventListener('input', (e) => {
    const cleanVal = e.target.value.replace(/\D/g, '');
    e.target.value = typeSel.value === 'PJ' ? fmt.cnpj(e.target.value) : fmt.cpf(e.target.value);

    if (typeSel.value === 'PJ' && cleanVal.length === 14) {
      handleCNPJLookup(cleanVal);
    }
  });

  adjustMask();

  // Save Event
  document.getElementById('btn-salvar-cliente')?.addEventListener('click', () => {
    const form = document.getElementById('form-cliente');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const payload = {
      tipo: fd.get('tipo'),
      cnpjCpf: fd.get('cnpjCpf'),
      nome: fd.get('nome'),
      email: fd.get('email'),
      telefone: fd.get('telefone'),
      cidade: fd.get('cidade'),
      uf: fd.get('uf').toUpperCase(),
      limite: parseFloat(fd.get('limite')) || 0,
      status: fd.get('status'),
    };

    if (isEdit) {
      DB.update('clientes', data.id, payload);
      toast.success('Cliente Atualizado', 'Os dados do cliente foram alterados.');
    } else {
      DB.insert('clientes', payload);
      toast.success('Cliente Cadastrado', 'Novo cliente adicionado com sucesso.');
    }

    modal.close();
    const items = getFilteredItems();
    paginator = new Paginator(items, 10);
    renderTable();
    updateStats();
  });
}
