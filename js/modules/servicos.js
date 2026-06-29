/* ============================================================
   SERVICOS.JS — Services Module (Vectra ERP)
   ============================================================ */
'use strict';
import DB from '../db.js';
import { fmt, today } from '../utils/format.js';
import { modal, toast, Paginator, buildTable } from '../utils/ui.js';

let searchQuery = '';

function checkSeeds() {
  if (!localStorage.getItem('erp_servicos_catalogo')) {
    localStorage.setItem('erp_servicos_catalogo', JSON.stringify([
      { id: 'srv1', nome: 'Consultoria de TI Especializada', preco: 150.00, categoria: 'Consultoria', status: 'ativo' },
      { id: 'srv2', nome: 'Suporte Mensal Corporativo', preco: 1200.00, categoria: 'Suporte', status: 'ativo' },
      { id: 'srv3', nome: 'Desenvolvimento Web Personalizado', preco: 85.00, categoria: 'Desenvolvimento', status: 'ativo' },
      { id: 'srv4', nome: 'Implantação de Módulos ERP', preco: 2500.00, categoria: 'Implantação', status: 'ativo' }
    ]));
  }
  if (!localStorage.getItem('erp_contratos')) {
    localStorage.setItem('erp_contratos', JSON.stringify([
      { id: 'con1', cliente: 'Tech Solutions Ltda', servico: 'Suporte Mensal Corporativo', valor: 1200.00, inicio: '2026-01-10', status: 'ativo' },
      { id: 'con2', cliente: 'Supermercados Silva PJ', servico: 'Licença SaaS de Software', valor: 350.00, inicio: '2026-02-15', status: 'ativo' },
      { id: 'con3', cliente: 'Clinica Saúde & Vida', servico: 'Suporte Mensal Corporativo', valor: 1200.00, inicio: '2025-11-01', status: 'suspenso' }
    ]));
  }
  if (!localStorage.getItem('erp_ordens_servico')) {
    localStorage.setItem('erp_ordens_servico', JSON.stringify([
      { id: 'os1', numero: 'OS-2026-001', cliente: 'Tech Solutions Ltda', servico: 'Consultoria de TI Especializada', total: 600.00, status: 'executando', data: '2026-06-25' },
      { id: 'os2', numero: 'OS-2026-002', cliente: 'Indústria ABC S/A', servico: 'Implantação de Módulos ERP', total: 2500.00, status: 'faturado', data: '2026-06-28' },
      { id: 'os3', numero: 'OS-2026-003', cliente: 'Restaurante Sabor & Arte', servico: 'Desenvolvimento Web Personalizado', total: 850.00, status: 'aberto', data: '2026-06-29' }
    ]));
  }
  if (!localStorage.getItem('erp_transportadoras')) {
    localStorage.setItem('erp_transportadoras', JSON.stringify([
      { id: 'tr1', nome: 'TransRapid Carga', cnpj: '33.456.789/0001-00', cidade: 'São Paulo', uf: 'SP', status: 'ativo' },
      { id: 'tr2', nome: 'Rápido Federal', cnpj: '44.567.890/0001-11', cidade: 'Curitiba', uf: 'PR', status: 'ativo' }
    ]));
  }
}

export function render() {
  checkSeeds();
  const hash = window.location.hash || '#/servicos/orcamentos';

  if (hash === '#/servicos/orcamentos') {
    return renderOrcamentos();
  } else if (hash === '#/servicos/vendas') {
    return renderVendasServicos();
  } else if (hash === '#/servicos/contratos') {
    return renderContratos();
  } else if (hash === '#/servicos/ordens') {
    return renderOrdensServico();
  } else if (hash === '#/servicos/parcelas') {
    return renderParcelas();
  } else if (hash === '#/servicos/notas-fiscais') {
    return renderNotasFiscais();
  } else if (hash === '#/servicos/serasa') {
    return renderSerasa();
  } else if (hash === '#/servicos/cadastros/clientes') {
    return renderClientesLink();
  } else if (hash === '#/servicos/cadastros/servicos') {
    return renderServicosCatalogo();
  } else if (hash === '#/servicos/cadastros/transportadoras') {
    return renderTransportadoras();
  } else if (hash === '#/servicos/config/notas-fiscais') {
    return renderConfigNotas();
  } else if (hash === '#/servicos/config/modelo-email') {
    return renderConfigModeloEmail();
  } else if (hash === '#/servicos/config/series-notas') {
    return renderConfigSeriesNotas();
  }

  return `<div class="content-panel">Página em desenvolvimento</div>`;
}

export function afterRender() {
  const hash = window.location.hash || '#/servicos/orcamentos';

  if (hash === '#/servicos/orcamentos') {
    afterOrcamentos();
  } else if (hash === '#/servicos/vendas') {
    afterVendasServicos();
  } else if (hash === '#/servicos/contratos') {
    afterContratos();
  } else if (hash === '#/servicos/ordens') {
    afterOrdensServico();
  } else if (hash === '#/servicos/cadastros/servicos') {
    afterServicosCatalogo();
  } else if (hash === '#/servicos/cadastros/transportadoras') {
    afterTransportadoras();
  } else if (hash === '#/servicos/serasa') {
    afterSerasa();
  }
}

// -------------------------------------------------------------
// 1. ORÇAMENTOS
// -------------------------------------------------------------
function renderOrcamentos() {
  return `
    <div class="content-header">
      <h2 class="content-title">Orçamentos de Serviços</h2>
      <button class="btn btn-primary" id="btn-novo-orcamento">Novo Orçamento</button>
    </div>
    
    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-label">Total Enviados</div>
        <div class="stat-value">R$ 14.500,00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Aprovados</div>
        <div class="stat-value" style="color:var(--clr-success)">R$ 8.900,00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Aguardando Resposta</div>
        <div class="stat-value" style="color:var(--clr-warning)">R$ 5.600,00</div>
      </div>
    </div>

    <div class="content-panel" style="margin-top:var(--space-4)">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Proposta</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Validade</th>
              <th>Valor Proposto</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PROP-2026-004</strong></td>
              <td>Tech Solutions Ltda</td>
              <td>28/06/2026</td>
              <td>15/07/2026</td>
              <td>R$ 2.400,00</td>
              <td><span class="badge badge-warning">Pendente</span></td>
            </tr>
            <tr>
              <td><strong>PROP-2026-003</strong></td>
              <td>Indústria ABC S/A</td>
              <td>25/06/2026</td>
              <td>10/07/2026</td>
              <td>R$ 6.500,00</td>
              <td><span class="badge badge-success">Aprovado</span></td>
            </tr>
            <tr>
              <td><strong>PROP-2026-002</strong></td>
              <td>Supermercados Silva PJ</td>
              <td>20/06/2026</td>
              <td>05/07/2026</td>
              <td>R$ 1.200,00</td>
              <td><span class="badge badge-danger">Recusado</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function afterOrcamentos() {
  document.getElementById('btn-novo-orcamento')?.addEventListener('click', () => {
    toast.info('Nova Proposta', 'Fluxo de orçamento simplificado ativado.');
  });
}

// -------------------------------------------------------------
// 2. VENDAS DE SERVIÇOS
// -------------------------------------------------------------
function renderVendasServicos() {
  return `
    <div class="content-header">
      <h2 class="content-title">Vendas de Serviços</h2>
      <button class="btn btn-primary" id="btn-nova-venda-serv">Lançar Venda</button>
    </div>
    
    <div class="content-panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Venda</th>
              <th>Cliente</th>
              <th>Serviço Prestado</th>
              <th>Data de Faturamento</th>
              <th>Valor Total</th>
              <th>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>VS-0922</strong></td>
              <td>Clinica Saúde & Vida</td>
              <td>Suporte Mensal Corporativo</td>
              <td>28/06/2026</td>
              <td>R$ 1.200,00</td>
              <td><span class="badge badge-success">Faturado</span></td>
            </tr>
            <tr>
              <td><strong>VS-0921</strong></td>
              <td>Tech Solutions Ltda</td>
              <td>Consultoria de TI Especializada</td>
              <td>26/06/2026</td>
              <td>R$ 600,00</td>
              <td><span class="badge badge-success">Faturado</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function afterVendasServicos() {
  document.getElementById('btn-nova-venda-serv')?.addEventListener('click', () => {
    toast.info('Lançamento', 'Redirecionando para faturamento de ordem.');
  });
}

// -------------------------------------------------------------
// 3. CONTRATOS
// -------------------------------------------------------------
function renderContratos() {
  const contrs = JSON.parse(localStorage.getItem('erp_contratos')) || [];
  return `
    <div class="content-header">
      <h2 class="content-title">Contratos de Prestação de Serviços (Recorrentes)</h2>
      <button class="btn btn-primary" id="btn-novo-contrato">Novo Contrato</button>
    </div>

    <div class="content-panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Serviço Recorrente</th>
              <th>Mensalidade</th>
              <th>Data Início</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${contrs.map(c => `
              <tr>
                <td><strong>${c.cliente}</strong></td>
                <td>${c.servico}</td>
                <td><strong>${fmt.currency(c.valor)}</strong></td>
                <td>${fmt.date(c.inicio)}</td>
                <td><span class="badge ${c.status === 'ativo' ? 'badge-success' : 'badge-warning'}">${c.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function afterContratos() {
  document.getElementById('btn-novo-contrato')?.addEventListener('click', () => {
    toast.info('Contratos', 'Opção de faturamento mensal recorrente habilitada nas configurações de vendas.');
  });
}

// -------------------------------------------------------------
// 4. ORDENS DE SERVIÇO (O.S.)
// -------------------------------------------------------------
function renderOrdensServico() {
  const osList = JSON.parse(localStorage.getItem('erp_ordens_servico')) || [];
  return `
    <div class="content-header">
      <h2 class="content-title">Ordens de Serviço (O.S.)</h2>
      <button class="btn btn-primary" id="btn-nova-os">Criar Ordem de Serviço</button>
    </div>

    <div class="content-panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Serviço Solicitado</th>
              <th>Total O.S.</th>
              <th>Data Abertura</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${osList.map(o => `
              <tr>
                <td><code>${o.numero}</code></td>
                <td><strong>${o.cliente}</strong></td>
                <td>${o.servico}</td>
                <td><strong>${fmt.currency(o.total)}</strong></td>
                <td>${fmt.date(o.data)}</td>
                <td>
                  <span class="badge ${o.status === 'faturado' ? 'badge-success' : (o.status === 'aberto' ? 'badge-info' : 'badge-warning')}">
                    ${o.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function afterOrdensServico() {
  document.getElementById('btn-nova-os')?.addEventListener('click', () => {
    toast.info('Ordem de Serviço', 'Módulo de O.S. acionado.');
  });
}

// -------------------------------------------------------------
// 5. PARCELAS A RECEBER
// -------------------------------------------------------------
function renderParcelas() {
  return `
    <div class="content-header">
      <h2 class="content-title">Parcelas a Receber (Vendas e Serviços)</h2>
    </div>

    <div class="content-panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Cliente</th>
              <th>Nº Parcela</th>
              <th>Vencimento</th>
              <th>Valor Parcela</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>REC-442-1</code></td>
              <td>Tech Solutions Ltda</td>
              <td>1 de 3</td>
              <td>10/07/2026</td>
              <td>R$ 400,00</td>
              <td><span class="badge badge-info">A Vencer</span></td>
            </tr>
            <tr>
              <td><code>REC-442-2</code></td>
              <td>Tech Solutions Ltda</td>
              <td>2 de 3</td>
              <td>10/08/2026</td>
              <td>R$ 400,00</td>
              <td><span class="badge badge-info">A Vencer</span></td>
            </tr>
            <tr>
              <td><code>REC-439-1</code></td>
              <td>Clinica Saúde & Vida</td>
              <td>1 de 1</td>
              <td>28/06/2026</td>
              <td>R$ 1.200,00</td>
              <td><span class="badge badge-success">Recebido</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 6. NOTAS FISCAIS DE SERVIÇO (NFS-e)
// -------------------------------------------------------------
function renderNotasFiscais() {
  return `
    <div class="content-header">
      <h2 class="content-title">Notas Fiscais de Serviço Eletrônicas (NFS-e)</h2>
      <button class="btn btn-primary" id="btn-emitir-nfse" disabled>Emitir NFS-e</button>
    </div>

    <div class="content-panel" style="text-align:center;padding:var(--space-8)">
      <div style="font-size:40px;color:var(--text-muted);margin-bottom:var(--space-4)">🧾</div>
      <h3>Emissão Integrada de NFS-e</h3>
      <p style="color:var(--text-secondary);max-width:500px;margin:var(--space-2) auto">
        A emissão de notas fiscais de serviço requer certificado digital (A1) configurado nas configurações de faturamento da empresa.
      </p>
      <a href="#/servicos/config/notas-fiscais" class="btn btn-ghost" style="margin-top:var(--space-4)">Configurar Agora</a>
    </div>
  `;
}

// -------------------------------------------------------------
// 7. CONSULTA SERASA
// -------------------------------------------------------------
function renderSerasa() {
  return `
    <div class="content-header">
      <h2 class="content-title">Consulta de Crédito Serasa Integrada</h2>
    </div>

    <div class="content-panel">
      <div style="max-width:600px;margin:0 auto;padding:var(--space-4)">
        <h4 style="margin-bottom:var(--space-3)">Consultar Restrições Cadastrais (CPF/CNPJ)</h4>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">CNPJ ou CPF para Consulta</label>
            <input type="text" class="form-control" id="serasa-doc-input" placeholder="00.000.000/0000-00">
          </div>
          <div class="form-group" style="flex:1;display:flex;align-items:flex-end">
            <button class="btn btn-primary" id="btn-consultar-serasa" style="width:100%">Verificar Crédito</button>
          </div>
        </div>
        
        <div id="serasa-result-box" style="margin-top:var(--space-6);display:none">
          <div class="card" style="border:1px solid var(--border-default)">
            <div class="card-body">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
                <strong>Resultado da Pesquisa</strong>
                <span class="badge badge-success" id="serasa-badge-score">Score: 920 - Excelente</span>
              </div>
              <p>Nenhuma pendência financeira ou restrição ativa foi localizada para este documento.</p>
              <ul style="padding-left:16px;font-size:12px;color:var(--text-secondary);line-height:1.8;margin-top:var(--space-3)">
                <li>Pendências Financeiras: 0</li>
                <li>Cheques sem fundo: 0</li>
                <li>Ações Judiciais: Nenhuma</li>
                <li>Dívidas Vencidas: R$ 0,00</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function afterSerasa() {
  const btn = document.getElementById('btn-consultar-serasa');
  const input = document.getElementById('serasa-doc-input');
  const resultBox = document.getElementById('serasa-result-box');
  
  if (input) {
    input.addEventListener('input', (e) => {
      const clean = e.target.value.replace(/\D/g, '');
      if (clean.length > 11) {
        e.target.value = fmt.cnpj(e.target.value);
      } else {
        e.target.value = fmt.cpf(e.target.value);
      }
    });
  }

  btn?.addEventListener('click', () => {
    if (!input.value) {
      toast.warning('Aviso', 'Digite um documento válido.');
      return;
    }
    toast.info('Consultando Serasa...', 'Conectando ao bureau de crédito.');
    setTimeout(() => {
      if (resultBox) resultBox.style.display = 'block';
      toast.success('Consulta Concluída', 'Score de crédito obtido com sucesso.');
    }, 1200);
  });
}

// -------------------------------------------------------------
// 8. CADASTROS LINK
// -------------------------------------------------------------
function renderClientesLink() {
  return `
    <div class="content-header">
      <h2 class="content-title">Redirecionando...</h2>
    </div>
  `;
}

// -------------------------------------------------------------
// 9. CADASTRO DE SERVIÇOS
// -------------------------------------------------------------
function renderServicosCatalogo() {
  const srvs = JSON.parse(localStorage.getItem('erp_servicos_catalogo')) || [];
  return `
    <div class="content-header">
      <h2 class="content-title">Catálogo de Serviços</h2>
      <button class="btn btn-primary" id="btn-novo-servico-catalogo">Cadastrar Serviço</button>
    </div>

    <div class="content-panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome do Serviço</th>
              <th>Preço de Venda</th>
              <th>Categoria</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${srvs.map(s => `
              <tr>
                <td><strong>${s.nome}</strong></td>
                <td>${fmt.currency(s.preco)}</td>
                <td>${s.categoria}</td>
                <td><span class="badge badge-success">${s.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function afterServicosCatalogo() {
  document.getElementById('btn-novo-servico-catalogo')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-novo-servico-cat',
      title: 'Cadastrar Novo Serviço no Catálogo',
      size: 'md',
      body: `
        <form id="form-novo-serv-cat">
          <div class="form-group">
            <label class="form-label">Nome do Serviço <span class="required">*</span></label>
            <input type="text" class="form-control" name="nome" required placeholder="Ex: Suporte Nível 1">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Preço Base de Venda <span class="required">*</span></label>
              <input type="number" step="0.01" class="form-control" name="preco" required placeholder="0.00">
            </div>
            <div class="form-group">
              <label class="form-label">Categoria <span class="required">*</span></label>
              <input type="text" class="form-control" name="categoria" required placeholder="Ex: Consultoria">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-new-serv-cat">Cadastrar</button>
      `
    });

    document.getElementById('btn-save-new-serv-cat')?.addEventListener('click', () => {
      const form = document.getElementById('form-novo-serv-cat');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      const items = JSON.parse(localStorage.getItem('erp_servicos_catalogo')) || [];
      items.push({
        id: 'srv' + (items.length + 1),
        nome: fd.get('nome'),
        preco: parseFloat(fd.get('preco')),
        categoria: fd.get('categoria'),
        status: 'ativo'
      });
      localStorage.setItem('erp_servicos_catalogo', JSON.stringify(items));
      toast.success('Sucesso', 'Serviço adicionado ao catálogo.');
      modal.close();
      window.location.reload();
    });
  });
}

// -------------------------------------------------------------
// 10. TRANSPORTADORAS
// -------------------------------------------------------------
function renderTransportadoras() {
  const transps = JSON.parse(localStorage.getItem('erp_transportadoras')) || [];
  return `
    <div class="content-header">
      <h2 class="content-title">Homologação de Transportadoras</h2>
      <button class="btn btn-primary" id="btn-nova-transp">Cadastrar Transportadora</button>
    </div>

    <div class="content-panel">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Razão / Nome</th>
              <th>CNPJ</th>
              <th>Cidade</th>
              <th>UF</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${transps.map(t => `
              <tr>
                <td><strong>${t.nome}</strong></td>
                <td><code>${t.cnpj}</code></td>
                <td>${t.cidade}</td>
                <td>${t.uf}</td>
                <td><span class="badge badge-success">${t.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function afterTransportadoras() {
  document.getElementById('btn-nova-transp')?.addEventListener('click', () => {
    modal.open({
      id: 'modal-nova-transp-modal',
      title: 'Cadastrar Transportadora',
      size: 'md',
      body: `
        <form id="form-nova-transp-form">
          <div class="form-group">
            <label class="form-label">Nome da Transportadora <span class="required">*</span></label>
            <input type="text" class="form-control" name="nome" required placeholder="Ex: Logística Brasil">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">CNPJ <span class="required">*</span></label>
              <input type="text" class="form-control" name="cnpj" required placeholder="00.000.000/0000-00">
            </div>
            <div class="form-group">
              <label class="form-label">Cidade / UF</label>
              <input type="text" class="form-control" name="cidade" placeholder="Ex: Curitiba / PR">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="window.ERP_MODAL_CLOSE()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-new-transp">Cadastrar</button>
      `
    });

    const cnpjInput = document.querySelector('#form-nova-transp-form input[name="cnpj"]');
    cnpjInput?.addEventListener('input', (e) => {
      e.target.value = fmt.cnpj(e.target.value);
    });

    document.getElementById('btn-save-new-transp')?.addEventListener('click', () => {
      const form = document.getElementById('form-nova-transp-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      const items = JSON.parse(localStorage.getItem('erp_transportadoras')) || [];
      const parts = fd.get('cidade').split('/');
      items.push({
        id: 'tr' + (items.length + 1),
        nome: fd.get('nome'),
        cnpj: fd.get('cnpj'),
        cidade: parts[0]?.trim() || '',
        uf: parts[1]?.trim() || '',
        status: 'ativo'
      });
      localStorage.setItem('erp_transportadoras', JSON.stringify(items));
      toast.success('Sucesso', 'Transportadora cadastrada com sucesso.');
      modal.close();
      window.location.reload();
    });
  });
}

// -------------------------------------------------------------
// 11. CONFIGURAÇÕES
// -------------------------------------------------------------
function renderConfigNotas() {
  return `
    <div class="content-header">
      <h2 class="content-title">Configurar Notas Fiscais</h2>
    </div>
    <div class="content-panel">
      <form style="max-width:500px">
        <div class="form-group">
          <label class="form-label">Certificado Digital (A1)</label>
          <input type="file" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label">Senha do Certificado</label>
          <input type="password" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label">Regime Tributário</label>
          <select class="form-control">
            <option>Simples Nacional</option>
            <option>Lucro Presumido</option>
            <option>Lucro Real</option>
          </select>
        </div>
        <button class="btn btn-primary" type="button" onclick="alert('Configuração Salva (Simulada)')">Salvar Certificado</button>
      </form>
    </div>
  `;
}

function renderConfigModeloEmail() {
  return `
    <div class="content-header">
      <h2 class="content-title">Modelo de E-mail de Venda</h2>
    </div>
    <div class="content-panel">
      <div class="form-group">
        <label class="form-label">Assunto do E-mail</label>
        <input type="text" class="form-control" value="Seu orçamento está pronto! — {{empresa_nome}}">
      </div>
      <div class="form-group">
        <label class="form-label">Corpo do E-mail (HTML)</label>
        <textarea class="form-control" style="height:250px">Olá, {{cliente_nome}}.\n\nSeguem em anexo os detalhes do seu orçamento. Qualquer dúvida estamos à disposição.\n\nAtenciosamente,\n{{empresa_nome}}</textarea>
      </div>
      <button class="btn btn-primary" type="button" onclick="alert('Modelo Salvo!')">Salvar Modelo</button>
    </div>
  `;
}

function renderConfigSeriesNotas() {
  return `
    <div class="content-header">
      <h2 class="content-title">Séries de Notas Fiscais</h2>
    </div>
    <div class="content-panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Série</th>
            <th>Último Número Emitido</th>
            <th>Ambiente</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>NFe (Produtos)</td>
            <td>1</td>
            <td>0</td>
            <td>Homologação</td>
          </tr>
          <tr>
            <td>NFSe (Serviços)</td>
            <td>1</td>
            <td>0</td>
            <td>Homologação</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}
