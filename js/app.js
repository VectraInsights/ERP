/* ============================================================
   APP.JS — Router, Navigation, Shell initialization
   ============================================================ */
'use strict';
import DB from './db.js';
import * as Dashboard from './modules/dashboard.js';
import * as Financeiro from './modules/financeiro.js';
import * as Clientes from './modules/clientes.js';
import * as Produtos from './modules/produtos.js';
import * as Vendas from './modules/vendas.js';
import * as Compras from './modules/compras.js';
import * as Relatorios from './modules/relatorios.js';
import * as Configuracoes from './modules/configuracoes.js';

// Route maps
const routes = {
  '#/dashboard':                     Dashboard,
  '#/financeiro':                    Financeiro,
  '#/financeiro/visao-competencia':  Financeiro,
  '#/financeiro/contas-pagar':       Financeiro,
  '#/financeiro/contas-receber':     Financeiro,
  '#/financeiro/inadimplentes':      Financeiro,
  '#/financeiro/contas-financeiras': Financeiro,
  '#/financeiro/extrato':            Financeiro,
  '#/financeiro/fluxo-caixa':        Financeiro,
  '#/financeiro/historico':          Financeiro,
  '#/financeiro/categorias':         Financeiro,
  '#/financeiro/centros-custo':      Financeiro,
  '#/clientes':                      Clientes,
  '#/produtos':                      Produtos,
  '#/vendas':                        Vendas,
  '#/compras':                       Compras,
  '#/compras/fornecedores':          Compras,
  '#/configuracoes':                 Configuracoes,
};

function router() {
  const hash = window.location.hash || '#/dashboard';
  
  // Resolve module
  let matchedModule = routes[hash];
  
  // If no match found, check fallback or dashboard
  if (!matchedModule) {
    matchedModule = Dashboard;
  }

  const contentDiv = document.getElementById('page-content');
  if (contentDiv) {
    // 1. Render module view
    contentDiv.innerHTML = matchedModule.render();

    // 2. Call module lifecycle hook after DOM updates
    if (typeof matchedModule.afterRender === 'function') {
      matchedModule.afterRender();
    }
  }

  // Highlight active link in sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    const itemHash = item.getAttribute('href');
    if (itemHash && hash.startsWith(itemHash)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Highlight active submenu item
  document.querySelectorAll('.sub-nav-item').forEach(subItem => {
    if (subItem.getAttribute('href') === hash) {
      subItem.classList.add('active');
      // Auto expand the parent group
      const parentGroup = subItem.closest('.nav-group');
      if (parentGroup) {
        parentGroup.classList.add('expanded');
      }
    } else {
      subItem.classList.remove('active');
    }
  });

  // Special cases for top level link highlights
  if (hash === '#/dashboard') {
    document.querySelector('.sidebar-nav > a[href="#/dashboard"]')?.classList.add('active');
  }

  // Update Breadcrumb
  const pageTitleEl = document.querySelector('.header-breadcrumb .page-title');
  if (pageTitleEl) {
    const routeTitles = {
      '#/dashboard':                     'Dashboard',
      '#/financeiro':                    'Financeiro',
      '#/financeiro/visao-competencia':  'Financeiro / Competência',
      '#/financeiro/contas-pagar':       'Financeiro / Contas a Pagar',
      '#/financeiro/contas-receber':     'Financeiro / Contas a Receber',
      '#/financeiro/inadimplentes':      'Financeiro / Inadimplência',
      '#/financeiro/contas-financeiras': 'Financeiro / Contas Financeiras',
      '#/financeiro/extrato':            'Financeiro / Extrato',
      '#/financeiro/fluxo-caixa':        'Financeiro / Fluxo de Caixa',
      '#/financeiro/historico':          'Financeiro / Histórico',
      '#/financeiro/categorias':         'Financeiro / Categorias',
      '#/financeiro/centros-custo':      'Financeiro / Centros de Custo',
      '#/clientes':                      'Clientes',
      '#/produtos':                      'Produtos & Serviços',
      '#/vendas':                        'Vendas',
      '#/compras':                       'Compras',
      '#/compras/fornecedores':          'Compras / Fornecedores',
      '#/configuracoes':                 'Configurações',
    };
    pageTitleEl.textContent = routeTitles[hash] || 'ERP';
  }
}

// Sidebar toggle trigger
function setupUIHandlers() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const wrapper = document.getElementById('main-wrapper');

  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    wrapper?.classList.toggle('sidebar-collapsed');
  });

  // Toggles for submenu categories
  document.querySelectorAll('.nav-item.has-submenu').forEach(toggleItem => {
    toggleItem.addEventListener('click', (e) => {
      e.preventDefault();
      const parentGroup = toggleItem.closest('.nav-group');
      if (parentGroup) {
        // Toggle expanded class
        const wasExpanded = parentGroup.classList.contains('expanded');
        
        // Optionally close other open submenus
        document.querySelectorAll('.nav-group').forEach(group => {
          if (group !== parentGroup) {
            group.classList.remove('expanded');
          }
        });

        if (wasExpanded) {
          parentGroup.classList.remove('expanded');
        } else {
          parentGroup.classList.add('expanded');
        }
      }
    });
  });

  // Automatically close sidebar on mobile navigation
  document.querySelectorAll('.nav-item:not(.has-submenu), .sub-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar?.classList.remove('mobile-open');
      }
    });
  });
}

// Application startup
document.addEventListener('DOMContentLoaded', () => {
  // 1. Run seed data
  DB.seed();

  // 2. Set UI Event Listeners
  setupUIHandlers();

  // 3. Router init
  window.addEventListener('hashchange', router);
  router(); // First load
});
