/* ============================================================
   PRODUTOS.JS — Produtos Module
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
          <h1>Produtos e Serviços</h1>
          <p>Catálogo de itens, controle de estoque e precificação.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-novo-produto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Item
          </button>
        </div>
      </div>

      <!-- Quick KPI metrics -->
      <div class="grid grid-3" style="margin-bottom:var(--space-6)">
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Total Itens</div>
          <div style="font-size:22px;font-weight:700;color:var(--text-primary);margin-top:2px" id="prod-total-cnt">0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Estoque Crítico (Baixo)</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-danger);margin-top:2px" id="prod-low-cnt">0</div>
        </div>
        <div class="card card-glass" style="padding:var(--space-4)">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase">Valor Patrimonial Estoque</div>
          <div style="font-size:22px;font-weight:700;color:var(--clr-success);margin-top:2px" id="prod-est-val">R$ 0,00</div>
        </div>
      </div>

      <!-- Search Filters -->
      <div class="card" style="margin-bottom:var(--space-5)">
        <div class="card-body-sm">
          <div class="search-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="prod-search" placeholder="Buscar por código, nome, categoria..." value="${searchQuery}">
          </div>
        </div>
      </div>

      <!-- Table -->
      <div id="prod-table-container"></div>
      
      <!-- Pagination -->
      <div id="prod-pagination" style="display:flex;justify-content:flex-end;margin-top:var(--space-4)"></div>
    </div>
  `;
}

function getFilteredItems() {
  let list = DB.getAll('produtos');
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => 
      (p.nome || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
}

export function afterRender() {
  updateStats();
  renderTable();

  // Search input
  const searchInput = document.getElementById('prod-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const items = getFilteredItems();
      paginator = new Paginator(items, 10);
      renderTable();
    });
  }

  // Novo Produto
  document.getElementById('btn-novo-produto')?.addEventListener('click', () => openProdutoForm());
}

function updateStats() {
  const items = DB.getAll('produtos');
  const low = items.filter(p => p.estoque <= p.estoqueMin && p.unidade !== 'HR' && p.unidade !== 'MÊS').length;
  const valEstoque = items.reduce((acc, p) => {
    // Avoid virtual items (HR, MÊS) summing massive stock value
    if (p.unidade === 'HR' || p.unidade === 'MÊS') return acc;
    return acc + (p.estoque * (p.custo || 0));
  }, 0);

  const totalEl = document.getElementById('prod-total-cnt');
  const lowEl = document.getElementById('prod-low-cnt');
  const estValEl = document.getElementById('prod-est-val');

  if (totalEl) totalEl.textContent = items.length;
  if (lowEl) lowEl.textContent = low;
  if (estValEl) estValEl.textContent = fmt.currency(valEstoque);
}

function renderTable() {
  const container = document.getElementById('prod-table-container');
  if (!container) return;

  const currentItems = paginator.current;

  const cols = [
    { label: 'Cód / SKU', key: 'codigo', render: (row) => `<code style="color:var(--clr-primary-light);font-size:12px;font-weight:700">${row.codigo}</code>` },
    { label: 'Nome / Descrição', key: 'nome', render: (row) => `<div style="font-weight:600;color:var(--text-primary)">${row.nome}</div>` },
    { label: 'Unidade', key: 'unidade' },
    { label: 'Preço Venda', key: 'preco', render: (row) => fmt.currency(row.preco) },
    { label: 'Custo', key: 'custo', render: (row) => fmt.currency(row.custo) },
    { label: 'Estoque Atual', key: 'estoque', render: (row) => {
      if (row.unidade === 'HR' || row.unidade === 'MÊS') return `<span style="color:var(--text-muted)">Ilimitado</span>`;
      const isLow = row.estoque <= row.estoqueMin;
      return `<span style="font-weight:700;color:${isLow ? 'var(--clr-danger)' : 'var(--text-primary)'}">${row.estoque}</span> <span style="font-size:11px;color:var(--text-muted)">/ Mín: ${row.estoqueMin}</span>`;
    }},
    { label: 'Status', key: 'ativo', render: (row) => `<span class="badge ${row.ativo ? 'badge-success' : 'badge-muted'} badge-dot">${row.ativo ? 'Ativo' : 'Inativo'}</span>` },
    { label: 'Ações', class: 'actions-cell', render: (row) => `
      <button class="btn btn-ghost btn-icon-sm btn-edit-prod" data-id="${row.id}" data-tooltip="Editar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn btn-ghost btn-icon-sm btn-del-prod" data-id="${row.id}" data-tooltip="Excluir" style="color:var(--clr-danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `}
  ];

  container.innerHTML = buildTable(cols, currentItems, 'Nenhum produto cadastrado.');

  paginator.renderPagination('prod-pagination', () => renderTable());

  // Action listeners
  container.querySelectorAll('.btn-edit-prod').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const p = DB.getById('produtos', id);
      if (p) openProdutoForm(p);
    });
  });

  container.querySelectorAll('.btn-del-prod').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      modal.confirm('Confirmar Exclusão', 'Deseja realmente deletar este produto? Essa ação não apagará vendas ou compras passadas do produto.', () => {
        DB.remove('produtos', id);
        toast.success('Produto Excluído', 'Produto removido com sucesso.');
        const items = getFilteredItems();
        paginator = new Paginator(items, 10);
        renderTable();
        updateStats();
      }, true);
    });
  });
}

function openProdutoForm(data = null) {
  const isEdit = !!data;
  const cats = DB.getAll('categorias');

  modal.open({
    id: 'modal-produto',
    title: isEdit ? 'Editar Produto' : 'Novo Produto',
    size: 'md',
    body: `
      <form id="form-produto">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Código / SKU <span class="required">*</span></label>
            <input type="text" class="form-control" name="codigo" value="${data ? data.codigo : ''}" required placeholder="Ex: HW-010">
          </div>
          <div class="form-group">
            <label class="form-label">Categoria <span class="required">*</span></label>
            <select class="form-control" name="categoria" required>
              <option value="">Selecione...</option>
              ${cats.map(c => `<option value="${c.id}" ${data && data.categoria === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nome do Produto / Serviço <span class="required">*</span></label>
          <input type="text" class="form-control" name="nome" value="${data ? data.nome : ''}" required placeholder="Ex: Notebook Dell Latitude 3420">
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Preço Venda <span class="required">*</span></label>
            <input type="number" step="0.01" class="form-control" name="preco" value="${data ? data.preco : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Custo Unitário</label>
            <input type="number" step="0.01" class="form-control" name="custo" value="${data ? data.custo : '0'}">
          </div>
          <div class="form-group">
            <label class="form-label">Unidade Medida</label>
            <select class="form-control" name="unidade">
              <option value="UN" ${data && data.unidade === 'UN' ? 'selected' : ''}>UN (Unidade)</option>
              <option value="HR" ${data && data.unidade === 'HR' ? 'selected' : ''}>HR (Hora)</option>
              <option value="MÊS" ${data && data.unidade === 'MÊS' ? 'selected' : ''}>MÊS (Mensalidade)</option>
              <option value="KG" ${data && data.unidade === 'KG' ? 'selected' : ''}>KG (Quilograma)</option>
              <option value="L" ${data && data.unidade === 'L' ? 'selected' : ''}>L (Litro)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Estoque Atual</label>
            <input type="number" class="form-control" name="estoque" value="${data ? data.estoque : '0'}">
          </div>
          <div class="form-group">
            <label class="form-label">Estoque Mínimo</label>
            <input type="number" class="form-control" name="estoqueMin" value="${data ? data.estoqueMin : '0'}">
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-label" style="margin-top:var(--space-2)">
            <input type="checkbox" name="ativo" value="true" ${!data || data.ativo ? 'checked' : ''}>
            Item Ativo (exibido nas vendas e buscas)
          </label>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-produto">Salvar Item</button>
    `,
  });

  window.ERP_MODAL_CLOSE = () => modal.close();

  // Save Event
  document.getElementById('btn-salvar-produto')?.addEventListener('click', () => {
    const form = document.getElementById('form-produto');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const payload = {
      codigo: fd.get('codigo'),
      categoria: fd.get('categoria'),
      nome: fd.get('nome'),
      preco: parseFloat(fd.get('preco')),
      custo: parseFloat(fd.get('custo')) || 0,
      unidade: fd.get('unidade'),
      estoque: parseInt(fd.get('estoque')) || 0,
      estoqueMin: parseInt(fd.get('estoqueMin')) || 0,
      ativo: fd.get('ativo') === 'true',
    };

    if (isEdit) {
      DB.update('produtos', data.id, payload);
      toast.success('Item Atualizado', 'Produto / Serviço salvo com sucesso.');
    } else {
      DB.insert('produtos', payload);
      toast.success('Item Adicionado', 'Novo item criado com sucesso no catálogo.');
    }

    modal.close();
    const items = getFilteredItems();
    paginator = new Paginator(items, 10);
    renderTable();
    updateStats();
  });
}
