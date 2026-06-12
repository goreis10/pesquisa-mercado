/**
 * GeoBrain — Diagnóstico v2
 * IMPORTANTE: Antes de rodar, clique em um PIN do mapa e depois
 * clique na aba "Análise Temporal" manualmente.
 * Este script copia o resultado para a área de transferência (Ctrl+V para colar).
 */
(function diagnostico() {
  const r = {};

  // 1. Highcharts
  r.highcharts = typeof Highcharts !== 'undefined';
  if (r.highcharts) {
    const charts = Highcharts.charts.filter(Boolean);
    r.highchartsCharts = charts.length;
    r.highchartsExport = charts.length > 0 ? typeof charts[0].downloadCSV : 'n/a';
    r.chartTitles = charts.map(c => c.title?.textStr);
  }

  // 2. Dropdowns visíveis
  r.dropdowns = [...document.querySelectorAll('select, [class*="select__control"], [class*="Select__control"], [class*="dropdown"], [class*="Dropdown"]')]
    .filter(el => el.offsetParent !== null)
    .map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.innerText?.trim().slice(0, 60)
    }));

  // 3. Abas / tabs visíveis (qualquer texto com "Análise", "Estoque", "Temporal", "Empreendimento")
  r.tabs = [...document.querySelectorAll('*')]
    .filter(el => el.offsetParent !== null && el.children.length === 0)
    .map(el => el.innerText?.trim())
    .filter(t => t && /análise|temporal|empreendimento|estoque|negociação|unidades/i.test(t))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);

  // 4. Botões de menu do gráfico
  r.chartBtns = [...document.querySelectorAll('.highcharts-button, [class*="highcharts-context"], [class*="menu-btn"], [class*="chart-menu"], [aria-label*="menu" i], [aria-label*="Chart context menu" i]')]
    .filter(el => el.getBoundingClientRect().width > 0)
    .map(el => ({ tag: el.tagName, class: el.className, aria: el.getAttribute('aria-label') }));

  // 5. SVGs / g elements do highcharts (botão de menu costuma ser um <g> com title)
  r.highchartsButtons = [...document.querySelectorAll('svg g, svg button, svg [class*="button"]')]
    .filter(el => el.getBoundingClientRect().width > 0)
    .map(el => ({ tag: el.tagName, class: el.getAttribute('class'), title: el.querySelector('title')?.textContent }))
    .slice(0, 15);

  // 6. Painel aberto (container do popup do pin)
  const painel = [...document.querySelectorAll('[class*="panel"], [class*="modal"], [class*="popup"], [class*="drawer"], [class*="sidebar"]')]
    .filter(el => el.offsetParent !== null && el.getBoundingClientRect().width > 200);
  r.painelEncontrado = painel.length > 0;
  r.painelClass = painel.map(el => el.className.slice(0, 100));

  const json = JSON.stringify(r, null, 2);
  console.log('%c=== DIAGNÓSTICO GEOBRAIN v2 ===', 'color:green;font-size:16px;font-weight:bold');
  console.log(json);

  // Copia para clipboard
  copy(json);
  console.log('%c✅ Resultado copiado para a área de transferência! Cole com Ctrl+V', 'color:blue;font-weight:bold;font-size:14px');
})();
