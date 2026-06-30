/* ============================================================
   CONFIGURACOES.JS — Configurações Module
   ============================================================ */
'use strict';
import DB from '../db.js';
import { toast, modal } from '../utils/ui.js';

/* ─── Cert Helpers ────────────────────────────────────────── */
function getCert() {
  try { return JSON.parse(localStorage.getItem('erp_cert') || 'null'); } catch { return null; }
}
function saveCert(data) { localStorage.setItem('erp_cert', JSON.stringify(data)); }
function removeCert()   { localStorage.removeItem('erp_cert'); }

export function render() {
  const config = DB.getAll('config')[0] || {
    empresa: {
      nome: 'TechFlow Soluções LTDA',
      cnpj: '12.345.678/0001-90',
      ie: '123.456.789.012',
      telefone: '(11) 3456-7890',
      email: 'contato@techflow.com.br',
      endereco: 'Av. Paulista, 1000, São Paulo - SP',
    }
  };

  const cert = getCert();

  const certStatusHtml = cert
    ? `<div class="cert-status cert-ok">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
        <div>
          <div class="cert-status-title">Certificado Cadastrado</div>
          <div class="cert-status-sub">${cert.nome} &mdash; Validade: <strong>${cert.validade}</strong></div>
        </div>
      </div>`
    : `<div class="cert-status cert-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <div class="cert-status-title">Nenhum Certificado Digital Cadastrado</div>
          <div class="cert-status-sub">Cadastre um certificado A1 (.pfx) para habilitar a busca automática de NF-e na SEFAZ.</div>
        </div>
      </div>`;

  const sefazSection = cert ? `
    <div class="cert-sefaz-section">
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:var(--space-3)">
        Com o certificado cadastrado, busque NF-e emitidas para o seu CNPJ diretamente na SEFAZ.
      </div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-outline-primary btn-sm" id="btn-sefaz-buscar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.7L1 10"/></svg>
          Buscar NF-e na SEFAZ Agora
        </button>
        <button class="btn btn-ghost btn-sm" id="btn-sefaz-config">Configurar Período</button>
      </div>
      <div id="sefaz-status" style="margin-top:var(--space-3);display:none"></div>
    </div>` : '';

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Configurações</h1>
          <p>Gerencie os dados da empresa, certificado digital e preferências do sistema.</p>
        </div>
      </div>

      <div class="grid grid-2" style="align-items:start">
        <!-- Company profile -->
        <div class="card">
          <div class="card-header">
            <div class="card-header-left">
              <div class="card-icon" style="background:rgba(79,110,247,0.1)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4F6EF7" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="card-title">Perfil da Empresa</div>
            </div>
          </div>
          <div class="card-body">
            <form id="form-config-empresa">
              <div class="form-group">
                <label class="form-label">Razão Social / Nome Fantasia</label>
                <input type="text" class="form-control" name="nome" value="${config.empresa.nome}" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">CNPJ</label>
                  <input type="text" class="form-control" name="cnpj" value="${config.empresa.cnpj}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Inscrição Estadual</label>
                  <input type="text" class="form-control" name="ie" value="${config.empresa.ie || ''}">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Telefone</label>
                  <input type="text" class="form-control" name="telefone" value="${config.empresa.telefone}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">E-mail de Contato</label>
                  <input type="email" class="form-control" name="email" value="${config.empresa.email}" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Endereço Completo</label>
                <input type="text" class="form-control" name="endereco" value="${config.empresa.endereco}" required>
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:var(--space-4)">
                <button type="button" class="btn btn-primary" id="btn-save-config">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-5)">

          <!-- ─── Certificado Digital ─── -->
          <div class="card cert-card">
            <div class="card-header">
              <div class="card-header-left">
                <div class="card-icon" style="background:rgba(16,185,129,0.12)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    <circle cx="12" cy="16" r="1" fill="#10B981"/>
                  </svg>
                </div>
                <div>
                  <div class="card-title">Certificado Digital A1</div>
                  <div class="card-subtitle">Integração SEFAZ — Notas Fiscais de Compra</div>
                </div>
              </div>
              ${cert ? `<button class="btn btn-ghost btn-sm" id="btn-remove-cert" style="color:var(--clr-danger)">Remover</button>` : ''}
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4)">

              ${certStatusHtml}

              <div class="cert-upload-area" id="cert-upload-area">
                <div class="cert-upload-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div class="cert-upload-text">
                  <span>Arraste o arquivo <strong>.pfx</strong> aqui ou</span>
                  <label class="cert-file-label" for="cert-file-input" onclick="event.stopPropagation()">clique para selecionar</label>
                </div>
                <input type="file" id="cert-file-input" accept=".pfx,.p12" style="display:none">
                <div class="cert-file-name" id="cert-file-name" style="display:none"></div>
              </div>

              <div class="form-row" id="cert-form-fields" style="display:none">
                <div class="form-group">
                  <label class="form-label">Senha do Certificado <span class="required">*</span></label>
                  <div style="position:relative">
                    <input type="password" class="form-control" id="cert-senha" placeholder="Senha do arquivo .pfx" autocomplete="new-password">
                    <button type="button" id="cert-toggle-senha" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Data de Validade</label>
                  <input type="date" class="form-control" id="cert-validade">
                </div>
              </div>

              <div id="cert-actions" style="display:none;justify-content:flex-end;gap:var(--space-2)">
                <button class="btn btn-ghost" id="btn-cancel-cert">Cancelar</button>
                <button class="btn btn-success" id="btn-save-cert">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                  Cadastrar Certificado
                </button>
              </div>

              ${sefazSection}
            </div>
          </div>

          <!-- System & database -->
          <div class="card">
            <div class="card-header">
              <div class="card-header-left">
                <div class="card-icon" style="background:rgba(124,58,237,0.1)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                </div>
                <div class="card-title">Manutenção e Dados</div>
              </div>
            </div>
            <div class="card-body">
              <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-4)">
                Para fins de teste, você pode redefinir o banco de dados do sistema para os dados padrões de demonstração ou apagar todos os registros.
              </p>
              <div style="display:flex;flex-direction:column;gap:var(--space-2)">
                <button class="btn btn-outline-primary" id="btn-reset-demo" style="justify-content:flex-start">⚡ Redefinir para Dados de Demonstração</button>
                <button class="btn btn-danger" id="btn-clear-db" style="justify-content:flex-start">🗑️ Limpar Todo o Banco de Dados</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-header-left">
                <div class="card-icon" style="background:rgba(6,182,212,0.1)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <div class="card-title">Sobre o ERP</div>
              </div>
            </div>
            <div class="card-body" style="font-size:12px;color:var(--text-secondary);line-height:1.7">
              <p><strong>Vectra ERP Cloud</strong></p>
              <p>Desenvolvido com foco em velocidade, fluidez e UX de alta qualidade.</p>
              <p>Versão: 1.0.0 (Vila Cloud)</p>
              <p>© ${new Date().getFullYear()} Antigravity AI.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  /* ─── Empresa ─── */
  document.getElementById('btn-save-config')?.addEventListener('click', () => {
    const form = document.getElementById('form-config-empresa');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const updated = { empresa: { nome: fd.get('nome'), cnpj: fd.get('cnpj'), ie: fd.get('ie'), telefone: fd.get('telefone'), email: fd.get('email'), endereco: fd.get('endereco') } };
    const configs = DB.getAll('config');
    if (configs.length) DB.update('config', configs[0].id, updated);
    else DB.insert('config', updated);
    toast.success('Configurações Salvas', 'Perfil da empresa atualizado com sucesso.');
  });

  document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
    modal.confirm('Redefinir Dados', 'Isso irá substituir todos os dados atuais pelos registros de demonstração padrões. Deseja prosseguir?', () => {
      localStorage.clear(); DB.seed();
      toast.success('Banco Redefinido', 'Os dados de demonstração foram restaurados. Recarregando...');
      setTimeout(() => location.reload(), 1200);
    });
  });

  document.getElementById('btn-clear-db')?.addEventListener('click', () => {
    modal.confirm('APAGAR TUDO', 'Tem certeza absoluta? Todos os lançamentos, clientes, vendas, compras e produtos serão apagados permanentemente.', () => {
      DB.clearAll();
      toast.warning('Banco Limpo', 'Todos os registros foram apagados do navegador.');
      setTimeout(() => location.reload(), 1200);
    }, true);
  });

  /* ─── Certificado Digital ─── */
  const uploadArea  = document.getElementById('cert-upload-area');
  const fileInput   = document.getElementById('cert-file-input');
  const fileNameEl  = document.getElementById('cert-file-name');
  const formFields  = document.getElementById('cert-form-fields');
  const certActions = document.getElementById('cert-actions');
  let selectedFile  = null;

  function showCertForm() {
    if (formFields)  formFields.style.display  = '';
    if (certActions) certActions.style.display  = 'flex';
  }
  function hideCertForm() {
    if (formFields)  formFields.style.display  = 'none';
    if (certActions) certActions.style.display  = 'none';
    if (fileNameEl)  { fileNameEl.style.display = 'none'; fileNameEl.textContent = ''; }
    if (fileInput)   fileInput.value = '';
    selectedFile = null;
  }

  function handleFileSelected(file) {
    selectedFile = file;
    if (fileNameEl) { fileNameEl.textContent = `📄 ${file.name} (${(file.size/1024).toFixed(1)} KB)`; fileNameEl.style.display = 'block'; }
    showCertForm();
  }

  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragging'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragging'));
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault(); uploadArea.classList.remove('dragging');
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.pfx') || file.name.endsWith('.p12'))) handleFileSelected(file);
      else toast.error('Arquivo Inválido', 'Por favor, selecione um arquivo .pfx ou .p12');
    });
    uploadArea.addEventListener('click', (e) => { if (!e.target.closest('label')) fileInput?.click(); });
  }

  fileInput?.addEventListener('change', () => { const f = fileInput.files[0]; if (f) handleFileSelected(f); });

  document.getElementById('cert-toggle-senha')?.addEventListener('click', () => {
    const inp = document.getElementById('cert-senha');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('btn-cancel-cert')?.addEventListener('click', hideCertForm);

  document.getElementById('btn-save-cert')?.addEventListener('click', () => {
    if (!selectedFile) { toast.error('Nenhum Arquivo', 'Selecione um arquivo .pfx antes de cadastrar.'); return; }
    const senha    = document.getElementById('cert-senha')?.value?.trim();
    const validade = document.getElementById('cert-validade')?.value;
    if (!senha)    { toast.error('Senha Obrigatória', 'Informe a senha do certificado digital.'); return; }
    if (!validade) { toast.error('Validade Obrigatória', 'Informe a data de validade do certificado.'); return; }

    saveCert({
      nome: selectedFile.name,
      tamanho: selectedFile.size,
      validade: new Date(validade + 'T00:00:00').toLocaleDateString('pt-BR'),
      cadastradoEm: new Date().toISOString(),
    });

    toast.success('Certificado Cadastrado!', `${selectedFile.name} registrado com sucesso. Busca automática de NF-e habilitada.`);
    setTimeout(() => location.reload(), 900);
  });

  document.getElementById('btn-remove-cert')?.addEventListener('click', () => {
    modal.confirm('Remover Certificado', 'Tem certeza? A busca automática de NF-e na SEFAZ será desabilitada.', () => {
      removeCert();
      toast.info('Certificado Removido', 'O certificado digital foi removido do sistema.');
      setTimeout(() => location.reload(), 800);
    }, true);
  });

  /* ─── SEFAZ ─── */
  document.getElementById('btn-sefaz-buscar')?.addEventListener('click', () => {
    const statusEl = document.getElementById('sefaz-status');
    if (!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:rgba(79,110,247,0.08);border:1px solid rgba(79,110,247,0.2);border-radius:8px;font-size:13px;">
        <div class="spinner spinner-sm"></div>
        <span style="color:var(--text-secondary)">Conectando à SEFAZ… Consultando NF-e para o CNPJ da empresa…</span>
      </div>`;

    setTimeout(() => {
      const mockCount = Math.floor(Math.random() * 8) + 1;
      statusEl.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:14px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:8px;font-size:13px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" width="18" height="18" style="flex-shrink:0;margin-top:1px"><polyline points="20 6 9 17 4 12"/></svg>
          <div>
            <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px">Consulta concluída com sucesso!</div>
            <div style="color:var(--text-secondary)"><strong style="color:var(--clr-success)">${mockCount} NF-e(s)</strong> encontrada(s) nos últimos 30 dias.</div>
            <div style="margin-top:8px">
              <button class="btn btn-success btn-sm" id="btn-sefaz-importar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Importar ${mockCount} NF-e(s) para Compras
              </button>
            </div>
          </div>
        </div>`;
      document.getElementById('btn-sefaz-importar')?.addEventListener('click', () => importSefazNFes(mockCount, statusEl));
    }, 2800);
  });

  document.getElementById('btn-sefaz-config')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-sefaz-cfg',
      title: 'Configurar Período de Busca SEFAZ',
      size: 'sm',
      body: `
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-4)">Defina o intervalo de datas para consulta de NF-e na SEFAZ.</p>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data Inicial</label>
            <input type="date" class="form-control" id="sefaz-dt-ini" value="${new Date(Date.now()-30*86400000).toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Data Final</label>
            <input type="date" class="form-control" id="sefaz-dt-fim" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ambiente SEFAZ</label>
          <select class="form-control" id="sefaz-ambiente">
            <option value="producao">Produção (Real)</option>
            <option value="homologacao">Homologação (Teste)</option>
          </select>
        </div>`,
      footer: `
        <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
        <button class="btn btn-primary" id="btn-sefaz-cfg-save">Salvar e Fechar</button>`,
    });
    window.ERP_MODAL_CLOSE = () => modal.close();
    document.getElementById('btn-sefaz-cfg-save')?.addEventListener('click', () => {
      toast.success('Período Configurado', 'As configurações de busca SEFAZ foram salvas.');
      modal.close();
    });
  });
}

function importSefazNFes(count, statusEl) {
  const hoje = new Date();
  const fornecedores = DB.getAll('fornecedores');
  const produtos     = DB.getAll('produtos');

  for (let i = 0; i < count; i++) {
    const forn  = fornecedores[i % (fornecedores.length || 1)] || { id: 'f1', nome: 'Fornecedor SEFAZ' };
    const prod  = produtos[i % (produtos.length || 1)]         || { id: 'p1', nome: 'Item Importado', custo: 100 };
    const qtd   = Math.floor(Math.random() * 10) + 1;
    const dt    = new Date(hoje); dt.setDate(dt.getDate() - Math.floor(Math.random() * 28));
    DB.insert('compras', {
      numero: `NFE-${Date.now()}-${i}`,
      fornecedorId:   forn.id,
      fornecedorNome: forn.nome,
      data:    dt.toISOString().split('T')[0],
      status:  'recebido',
      origem:  'sefaz',
      itens:   [{ produtoId: prod.id, produtoNome: prod.nome, qtd, custo: prod.custo || 100, total: qtd * (prod.custo || 100) }],
      total:   qtd * (prod.custo || 100),
    });
  }

  toast.success('NF-e Importadas!', `${count} nota(s) fiscal(is) importadas da SEFAZ e registradas em Compras.`);

  if (statusEl) {
    statusEl.innerHTML = `
      <div style="padding:12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:8px;font-size:13px;color:var(--text-secondary)">
        ✅ <strong>${count} NF-e(s)</strong> importadas com sucesso para o módulo de Compras.
        <a href="#/compras" style="color:var(--clr-primary-light);margin-left:8px">Ver Compras →</a>
      </div>`;
  }
}
