/* ============================================================
   FORMAT.JS — Brazilian Formatting Utilities
   ============================================================ */
'use strict';

export const fmt = {
  // Currency BRL
  currency(val) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL', minimumFractionDigits: 2
    }).format(val || 0);
  },

  // Short currency (no R$)
  number(val, decimals = 2) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val || 0);
  },

  // Date dd/mm/yyyy
  date(iso) {
    if (!iso) return '—';
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('pt-BR');
  },

  // Datetime
  datetime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR');
  },

  // Relative time
  relative(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d atrás`;
    return fmt.date(iso);
  },

  // CPF: 123.456.789-00
  cpf(v = '') {
    return v.replace(/\D/g,'')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },

  // CNPJ: 12.345.678/0001-90
  cnpj(v = '') {
    return v.replace(/\D/g,'')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  },

  // Phone: (11) 99999-8888
  phone(v = '') {
    return v.replace(/\D/g,'')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})$/, '$1-$2');
  },

  // CEP: 01310-100
  cep(v = '') {
    return v.replace(/\D/g,'').replace(/(\d{5})(\d{3})$/, '$1-$2');
  },

  // Percentage
  percent(val, decimals = 1) {
    return `${fmt.number(val, decimals)}%`;
  },

  // Abbreviate large numbers
  compact(val) {
    if (val >= 1e9) return `R$ ${fmt.number(val/1e9, 1)}B`;
    if (val >= 1e6) return `R$ ${fmt.number(val/1e6, 1)}M`;
    if (val >= 1e3) return `R$ ${fmt.number(val/1e3, 1)}K`;
    return fmt.currency(val);
  },

  // Status badge helpers
  statusLabel(s) {
    const map = {
      ativo: 'Ativo', inativo: 'Inativo',
      pago: 'Pago', pendente: 'Pendente', vencido: 'Vencido', cancelado: 'Cancelado',
      faturado: 'Faturado', rascunho: 'Rascunho',
      recebido: 'Recebido', aguardando: 'Aguardando',
      receita: 'Receita', despesa: 'Despesa',
    };
    return map[s] || s;
  },

  statusClass(s) {
    const map = {
      ativo: 'badge-success', inativo: 'badge-muted',
      pago: 'badge-success', pendente: 'badge-warning',
      vencido: 'badge-danger', cancelado: 'badge-danger',
      faturado: 'badge-info', rascunho: 'badge-muted',
      recebido: 'badge-success', aguardando: 'badge-warning',
      receita: 'badge-success', despesa: 'badge-danger',
    };
    return map[s] || 'badge-muted';
  },

  // Mask input on keyup
  maskInput(el, type) {
    el.addEventListener('input', (e) => {
      const v = e.target.value;
      if (type === 'cpf')   e.target.value = fmt.cpf(v);
      if (type === 'cnpj')  e.target.value = fmt.cnpj(v);
      if (type === 'phone') e.target.value = fmt.phone(v);
      if (type === 'cep')   e.target.value = fmt.cep(v);
    });
  },
};

// Today's ISO date
export const today = () => new Date().toISOString().split('T')[0];

// Month range
export const monthRange = (monthsBack = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const end   = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0];
  return { start, end };
};
