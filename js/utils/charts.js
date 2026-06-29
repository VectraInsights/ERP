/* ============================================================
   CHARTS.JS — Chart.js Wrappers
   ============================================================ */
'use strict';

const CHART_DEFAULTS = {
  fontColor: '#8B92B8',
  gridColor: 'rgba(255,255,255,0.05)',
  primaryColor: '#4F6EF7',
  accentColor: '#7C3AED',
  successColor: '#10B981',
  dangerColor: '#EF4444',
  warningColor: '#F59E0B',
  infoColor: '#06B6D4',
};

const baseFont = { family: "'Inter', sans-serif", size: 12 };

function applyDefaults() {
  if (!window.Chart) return;
  Chart.defaults.color = CHART_DEFAULTS.fontColor;
  Chart.defaults.font = { ...baseFont };
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 20;
  Chart.defaults.plugins.legend.labels.font = { ...baseFont, size: 12 };
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(24,28,46,0.95)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.titleFont = { ...baseFont, size: 13, weight: '600' };
  Chart.defaults.plugins.tooltip.bodyFont = { ...baseFont };
  Chart.defaults.plugins.tooltip.titleColor = '#F0F2FF';
  Chart.defaults.plugins.tooltip.bodyColor = '#8B92B8';
}

const chartInstances = {};

function destroy(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

/* ─── Line / Area Chart ──────────────────────────────────── */
export function lineChart(canvasId, labels, datasets, options = {}) {
  applyDefaults();
  destroy(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const processedDatasets = datasets.map((ds, i) => {
    const colors = [CHART_DEFAULTS.primaryColor, CHART_DEFAULTS.accentColor, CHART_DEFAULTS.successColor, CHART_DEFAULTS.infoColor];
    const color = ds.color || colors[i % colors.length];
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color.replace(')', ', 0.25)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, color.replace(')', ', 0.01)').replace('rgb', 'rgba'));

    return {
      label: ds.label,
      data: ds.data,
      borderColor: color,
      borderWidth: 2.5,
      backgroundColor: ds.fill !== false ? gradient : 'transparent',
      fill: ds.fill !== false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: color,
      pointBorderColor: 'rgba(10,13,20,0.8)',
      pointBorderWidth: 2,
      ...ds,
    };
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: processedDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'top', ...options.legend },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              return ` ${ctx.dataset.label}: R$ ${new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2}).format(val)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.gridColor, drawBorder: false },
          ticks: { color: CHART_DEFAULTS.fontColor },
        },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor, drawBorder: false },
          ticks: {
            color: CHART_DEFAULTS.fontColor,
            callback: (v) => `R$ ${new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(v)}`,
          },
          beginAtZero: true,
        },
      },
      ...options,
    },
  });
  return chartInstances[canvasId];
}

/* ─── Bar Chart ──────────────────────────────────────────── */
export function barChart(canvasId, labels, datasets, options = {}) {
  applyDefaults();
  destroy(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const processedDatasets = datasets.map((ds, i) => {
    const colors = [CHART_DEFAULTS.primaryColor, CHART_DEFAULTS.successColor, CHART_DEFAULTS.dangerColor, CHART_DEFAULTS.warningColor];
    const color = ds.color || colors[i % colors.length];
    return {
      label: ds.label,
      data: ds.data,
      backgroundColor: color + 'CC',
      hoverBackgroundColor: color,
      borderColor: color,
      borderWidth: 0,
      borderRadius: 6,
      borderSkipped: false,
      ...ds,
    };
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: processedDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: R$ ${new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2}).format(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: CHART_DEFAULTS.fontColor } },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor, drawBorder: false },
          ticks: {
            color: CHART_DEFAULTS.fontColor,
            callback: (v) => `R$ ${new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(v)}`,
          },
          beginAtZero: true,
        },
      },
      ...options,
    },
  });
  return chartInstances[canvasId];
}

/* ─── Doughnut / Pie ─────────────────────────────────────── */
export function doughnutChart(canvasId, labels, data, options = {}) {
  applyDefaults();
  destroy(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const defaultColors = [
    CHART_DEFAULTS.primaryColor, CHART_DEFAULTS.accentColor,
    CHART_DEFAULTS.successColor, CHART_DEFAULTS.infoColor,
    CHART_DEFAULTS.warningColor, CHART_DEFAULTS.dangerColor,
  ];

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: defaultColors.map(c => c + 'CC'),
        hoverBackgroundColor: defaultColors,
        borderColor: 'rgba(10,13,20,0.5)',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: R$ ${new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2}).format(ctx.raw)}`,
          },
        },
      },
      ...options,
    },
  });
  return chartInstances[canvasId];
}

export function destroyChart(id) { destroy(id); }
