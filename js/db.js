/* ============================================================
   DB.JS — LocalStorage Persistence Layer
   ERP Sistema
   ============================================================ */
'use strict';

const DB = (() => {
  const PREFIX = 'erp_';

  const _read = (key) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const _write = (key, data) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
      return true;
    } catch { return false; }
  };

  // Generic CRUD
  const getAll = (entity) => _read(entity) || [];

  const getById = (entity, id) => {
    const list = getAll(entity);
    return list.find(item => item.id === id) || null;
  };

  const insert = (entity, data) => {
    const list = getAll(entity);
    const item = {
      ...data,
      id: data.id || _genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(item);
    _write(entity, list);
    return item;
  };

  const update = (entity, id, data) => {
    const list = getAll(entity);
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    _write(entity, list);
    return list[idx];
  };

  const remove = (entity, id) => {
    const list = getAll(entity);
    const filtered = list.filter(item => item.id !== id);
    _write(entity, filtered);
    return filtered.length < list.length;
  };

  const query = (entity, filterFn) => {
    return getAll(entity).filter(filterFn);
  };

  const count = (entity, filterFn) => {
    if (!filterFn) return getAll(entity).length;
    return getAll(entity).filter(filterFn).length;
  };

  const sum = (entity, field, filterFn) => {
    let list = getAll(entity);
    if (filterFn) list = list.filter(filterFn);
    return list.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
  };

  const clearAll = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  };

  const _genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Seed demo data if needed
  const seed = () => {
    if (_read('__seeded')) return;

    // Company info
    _write('config', {
      empresa: {
        nome: 'TechFlow Soluções LTDA',
        cnpj: '12.345.678/0001-90',
        ie: '123.456.789.012',
        telefone: '(11) 3456-7890',
        email: 'contato@techflow.com.br',
        endereco: 'Av. Paulista, 1000, São Paulo - SP',
        logo: null,
      },
      exercicio: new Date().getFullYear(),
    });

    // Clientes
    const clientes = [
      { id: 'c1', nome: 'Empresa Alpha Ltda', cnpjCpf: '12.345.678/0001-99', tipo: 'PJ', email: 'contato@alpha.com', telefone: '(11) 98765-4321', cidade: 'São Paulo', uf: 'SP', status: 'ativo', limite: 50000 },
      { id: 'c2', nome: 'Beta Comércio S.A.', cnpjCpf: '98.765.432/0001-11', tipo: 'PJ', email: 'financeiro@beta.com', telefone: '(21) 91234-5678', cidade: 'Rio de Janeiro', uf: 'RJ', status: 'ativo', limite: 80000 },
      { id: 'c3', nome: 'Carlos Eduardo Silva', cnpjCpf: '123.456.789-00', tipo: 'PF', email: 'carlos@email.com', telefone: '(31) 99999-8888', cidade: 'Belo Horizonte', uf: 'MG', status: 'ativo', limite: 10000 },
      { id: 'c4', nome: 'Gama Tecnologia ME', cnpjCpf: '45.678.901/0001-23', tipo: 'PJ', email: 'ti@gama.com.br', telefone: '(85) 93333-2222', cidade: 'Fortaleza', uf: 'CE', status: 'inativo', limite: 25000 },
      { id: 'c5', nome: 'Delta Serviços EPP', cnpjCpf: '78.901.234/0001-56', tipo: 'PJ', email: 'adm@delta.com', telefone: '(41) 98888-7777', cidade: 'Curitiba', uf: 'PR', status: 'ativo', limite: 40000 },
    ];
    _write('clientes', clientes.map(c => ({ ...c, createdAt: _randDate(90), updatedAt: _randDate(10) })));

    // Fornecedores
    const fornecedores = [
      { id: 'f1', nome: 'Distribuidora Nacional S.A.', cnpjCpf: '11.222.333/0001-44', tipo: 'PJ', email: 'vendas@nacional.com', telefone: '(11) 3111-2222', cidade: 'São Paulo', uf: 'SP', status: 'ativo' },
      { id: 'f2', nome: 'Importadora Global Ltda', cnpjCpf: '55.666.777/0001-88', tipo: 'PJ', email: 'comercial@global.com', telefone: '(21) 3444-5555', cidade: 'Rio de Janeiro', uf: 'RJ', status: 'ativo' },
      { id: 'f3', nome: 'Fábrica Omega ME', cnpjCpf: '99.000.111/0001-22', tipo: 'PJ', email: 'pedidos@omega.com', telefone: '(43) 3222-1111', cidade: 'Londrina', uf: 'PR', status: 'ativo' },
    ];
    _write('fornecedores', fornecedores.map(f => ({ ...f, createdAt: _randDate(180), updatedAt: _randDate(30) })));

    // Categorias de produto
    const categorias = [
      { id: 'cat1', nome: 'Software', descricao: 'Licenças e produtos digitais' },
      { id: 'cat2', nome: 'Hardware', descricao: 'Equipamentos e periféricos' },
      { id: 'cat3', nome: 'Serviços', descricao: 'Consultoria e suporte' },
      { id: 'cat4', nome: 'Assinatura', descricao: 'Planos mensais e anuais' },
    ];
    _write('categorias', categorias);

    // Produtos
    const produtos = [
      { id: 'p1', codigo: 'SW-001', nome: 'ERP Cloud Pro', categoria: 'cat1', unidade: 'UN', preco: 2500, custo: 400, estoque: 50, estoqueMin: 5, ativo: true },
      { id: 'p2', codigo: 'HW-001', nome: 'Notebook Dell Latitude', categoria: 'cat2', unidade: 'UN', preco: 6800, custo: 4500, estoque: 12, estoqueMin: 3, ativo: true },
      { id: 'p3', codigo: 'SV-001', nome: 'Implantação ERP (hora)', categoria: 'cat3', unidade: 'HR', preco: 320, custo: 120, estoque: 999, estoqueMin: 0, ativo: true },
      { id: 'p4', codigo: 'AS-001', nome: 'Suporte Mensal Basic', categoria: 'cat4', unidade: 'MÊS', preco: 890, custo: 150, estoque: 999, estoqueMin: 0, ativo: true },
      { id: 'p5', codigo: 'SW-002', nome: 'Antivírus Corporativo', categoria: 'cat1', unidade: 'UN', preco: 380, custo: 80, estoque: 200, estoqueMin: 20, ativo: true },
      { id: 'p6', codigo: 'HW-002', nome: 'Monitor 27" 4K', categoria: 'cat2', unidade: 'UN', preco: 3200, custo: 2100, estoque: 8, estoqueMin: 2, ativo: true },
    ];
    _write('produtos', produtos.map(p => ({ ...p, createdAt: _randDate(120), updatedAt: _randDate(20) })));

    // Vendas
    const vendas = [];
    const statusVenda = ['faturado', 'pago', 'pago', 'pago', 'cancelado', 'faturado'];
    for (let i = 0; i < 18; i++) {
      const prod = produtos[i % produtos.length];
      const qtd = Math.floor(Math.random() * 5) + 1;
      const cli = clientes[i % clientes.length];
      vendas.push({
        id: `v${i+1}`,
        numero: `NF-${String(i+1001).padStart(5,'0')}`,
        clienteId: cli.id,
        clienteNome: cli.nome,
        data: _randDate(60),
        status: statusVenda[i % statusVenda.length],
        itens: [{ produtoId: prod.id, produtoNome: prod.nome, qtd, preco: prod.preco, total: qtd * prod.preco }],
        subtotal: qtd * prod.preco,
        desconto: 0,
        total: qtd * prod.preco,
        obs: '',
        createdAt: _randDate(60),
        updatedAt: _randDate(5),
      });
    }
    _write('vendas', vendas);

    // Compras
    const compras = [];
    for (let i = 0; i < 8; i++) {
      const prod = produtos[i % produtos.length];
      const qtd = Math.floor(Math.random() * 20) + 5;
      const forn = fornecedores[i % fornecedores.length];
      compras.push({
        id: `cp${i+1}`,
        numero: `PC-${String(i+2001).padStart(5,'0')}`,
        fornecedorId: forn.id,
        fornecedorNome: forn.nome,
        data: _randDate(45),
        status: i < 6 ? 'recebido' : 'aguardando',
        itens: [{ produtoId: prod.id, produtoNome: prod.nome, qtd, custo: prod.custo, total: qtd * prod.custo }],
        total: qtd * prod.custo,
        createdAt: _randDate(45),
        updatedAt: _randDate(5),
      });
    }
    _write('compras', compras);

    // Plano de Contas
    const planoContas = [
      { id: 'pc1', codigo: '1', nome: 'Receitas', tipo: 'receita', pai: null },
      { id: 'pc2', codigo: '1.1', nome: 'Vendas de Produtos', tipo: 'receita', pai: 'pc1' },
      { id: 'pc3', codigo: '1.2', nome: 'Prestação de Serviços', tipo: 'receita', pai: 'pc1' },
      { id: 'pc4', codigo: '2', nome: 'Despesas', tipo: 'despesa', pai: null },
      { id: 'pc5', codigo: '2.1', nome: 'Folha de Pagamento', tipo: 'despesa', pai: 'pc4' },
      { id: 'pc6', codigo: '2.2', nome: 'Aluguel e Condomínio', tipo: 'despesa', pai: 'pc4' },
      { id: 'pc7', codigo: '2.3', nome: 'Fornecedores', tipo: 'despesa', pai: 'pc4' },
      { id: 'pc8', codigo: '2.4', nome: 'Impostos e Taxas', tipo: 'despesa', pai: 'pc4' },
      { id: 'pc9', codigo: '2.5', nome: 'Marketing e Publicidade', tipo: 'despesa', pai: 'pc4' },
      { id: 'pc10', codigo: '2.6', nome: 'Tecnologia e TI', tipo: 'despesa', pai: 'pc4' },
    ];
    _write('planoContas', planoContas);

    // Lançamentos financeiros (contas a pagar + receber)
    const lancamentos = [];
    const hoje = new Date();
    const tiposReceita = ['pc2', 'pc3'];
    const tiposDespesa = ['pc5', 'pc6', 'pc7', 'pc8', 'pc9', 'pc10'];

    // Receitas
    for (let i = 0; i < 20; i++) {
      const daysOffset = Math.floor(Math.random() * 90) - 45;
      const venc = new Date(hoje); venc.setDate(venc.getDate() + daysOffset);
      const pago = daysOffset < 5;
      lancamentos.push({
        id: `l${i+1}`,
        tipo: 'receita',
        descricao: ['Venda ERP Cloud Pro', 'Consultoria TI', 'Suporte Mensal', 'Licença Software', 'Implantação'][i%5],
        conta: tiposReceita[i % tiposReceita.length],
        valor: Math.round((Math.random() * 8000 + 1000) * 100) / 100,
        vencimento: venc.toISOString().split('T')[0],
        status: pago ? 'pago' : (daysOffset < 0 ? 'vencido' : 'pendente'),
        clienteId: clientes[i % clientes.length].id,
        clienteNome: clientes[i % clientes.length].nome,
        pagamento: pago ? new Date(venc.getTime() + 86400000).toISOString().split('T')[0] : null,
        formaPagamento: ['pix', 'boleto', 'cartao', 'transferencia'][i%4],
        obs: '',
        createdAt: _randDate(60),
        updatedAt: _randDate(10),
      });
    }

    // Despesas
    for (let i = 0; i < 15; i++) {
      const daysOffset = Math.floor(Math.random() * 90) - 45;
      const venc = new Date(hoje); venc.setDate(venc.getDate() + daysOffset);
      const pago = daysOffset < 5;
      lancamentos.push({
        id: `l${i+21}`,
        tipo: 'despesa',
        descricao: ['Salários', 'Aluguel Escritório', 'Nota Fiscal Fornecedor', 'INSS/FGTS', 'Google Ads', 'Servidor AWS'][i%6],
        conta: tiposDespesa[i % tiposDespesa.length],
        valor: Math.round((Math.random() * 5000 + 500) * 100) / 100,
        vencimento: venc.toISOString().split('T')[0],
        status: pago ? 'pago' : (daysOffset < 0 ? 'vencido' : 'pendente'),
        clienteId: null,
        clienteNome: null,
        pagamento: pago ? new Date(venc.getTime() + 86400000).toISOString().split('T')[0] : null,
        formaPagamento: ['pix', 'boleto', 'transferencia'][i%3],
        obs: '',
        createdAt: _randDate(60),
        updatedAt: _randDate(10),
      });
    }
    _write('lancamentos', lancamentos);

    _write('__seeded', true);
  };

  const _randDate = (daysBack) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
    return d.toISOString();
  };

  return { getAll, getById, insert, update, remove, query, count, sum, clearAll, seed };
})();

export default DB;
