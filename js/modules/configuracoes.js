/* ============================================================
   CONFIGURACOES.JS — Configurações Module
   ============================================================ */
'use strict';
import DB from '../db.js';
import { toast, modal } from '../utils/ui.js';

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

  return `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Configurações</h1>
          <p>Gerencie os dados da empresa, impostos e preferências do sistema.</p>
        </div>
      </div>

      <div class="grid grid-2">
        <!-- Company profile info -->
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

        <!-- System & database maintenance -->
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
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
                <button class="btn btn-outline-primary" id="btn-reset-demo" style="justify-content:flex-start">
                  ⚡ Redefinir para Dados de Demonstração
                </button>
                <button class="btn btn-danger" id="btn-clear-db" style="justify-content:flex-start">
                  🗑️ Limpar Todo o Banco de Dados
                </button>
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
              <p><strong>ERP Estilo Conta Azul</strong></p>
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
  // Save company config
  document.getElementById('btn-save-config')?.addEventListener('click', () => {
    const form = document.getElementById('form-config-empresa');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const updated = {
      empresa: {
        nome: fd.get('nome'),
        cnpj: fd.get('cnpj'),
        ie: fd.get('ie'),
        telefone: fd.get('telefone'),
        email: fd.get('email'),
        endereco: fd.get('endereco'),
      }
    };

    // Update config array
    const configs = DB.getAll('config');
    if (configs.length) {
      DB.update('config', configs[0].id, updated);
    } else {
      DB.insert('config', updated);
    }

    toast.success('Configurações Salvas', 'Perfil da empresa atualizado com sucesso.');
  });

  // Reset Demo
  document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
    modal.confirm('Redefinir Dados', 'Isso irá substituir todos os dados atuais pelos registros de demonstração padrões. Deseja prosseguir?', () => {
      localStorage.clear();
      DB.seed();
      toast.success('Banco Redefinido', 'Os dados de demonstração foram restaurados. Recarregando...');
      setTimeout(() => location.reload(), 1200);
    });
  });

  // Clear Database
  document.getElementById('btn-clear-db')?.addEventListener('click', () => {
    modal.confirm('APAGAR TUDO', 'Tem certeza absoluta? Todos os lançamentos, clientes, vendas, compras e produtos serão apagados permanentemente.', () => {
      DB.clearAll();
      toast.warning('Banco Limpo', 'Todos os registros foram apagados do navegador.');
      setTimeout(() => location.reload(), 1200);
    }, true);
  });
}
