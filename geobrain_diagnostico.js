/**
 * GeoBrain — Script de Diagnóstico
 * Cole no console do Chrome (F12 → Console) com o mapa já carregado
 * e o empreendimento já selecionado.
 * Copie TODO o resultado e envie para ajuste do script.
 */
(function diagnostico() {
  const r = { dropdowns: [], pins: [], tabs: [], highcharts: false, chartBtns: [] };

  // 1. Highcharts disponível?
  r.highcharts = typeof Highcharts !== 'undefined';
  if (r.highcharts) {
    const charts = Highcharts.charts.filter(Boolean);
    r.highchartsCharts = charts.length;
    r.highchartsExport = charts.length > 0 && typeof charts[0].downloadCSV === 'function';
  }

  // 2. Dropdowns / selects
  document.querySelectorAll('select, [class*="select__control"], [class*="Select__control"], [class*="dropdown"], [class*="Dropdown"]').forEach(el => {
    if (el.offsetParent !== null) {
      r.dropdowns.push({
        tag: el.tagName,
        class: el.className.slice(0, 80),
        text: el.innerText?.trim().slice(0, 60)
      });
    }
  });

  // 3. Pins do mapa
  const pinSels = [
    '.leaflet-marker-icon', 'img[src*="marker"]', 'img[src*="pin"]',
    '[class*="marker"]', '[class*="Marker"]', '[class*="pin"]',
    '.gm-style [role="button"]', '[data-marker-id]', 'svg circle',
    '[class*="cluster"]'
  ];
  pinSels.forEach(sel => {
    const found = [...document.querySelectorAll(sel)].filter(el => el.offsetParent !== null);
    if (found.length > 0) {
      r.pins.push({ selector: sel, count: found.length, sample: found[0].className.slice(0, 80) });
    }
  });

  // 4. Abas visíveis
  document.querySelectorAll('[class*="tab"], [role="tab"], button, a').forEach(el => {
    if (el.offsetParent !== null && el.innerText?.includes('Análise')) {
      r.tabs.push({ tag: el.tagName, class: el.className.slice(0, 80), text: el.innerText.trim().slice(0, 60) });
    }
  });

  // 5. Botão de menu do gráfico (3 linhas)
  document.querySelectorAll('.highcharts-button, [class*="highcharts-context"], [class*="menu-btn"], [class*="chart-menu"]').forEach(el => {
    if (el.getBoundingClientRect().width > 0) {
      r.chartBtns.push({ tag: el.tagName, class: el.className.slice(0, 80) });
    }
  });

  // 6. Todos os botões e ícones visíveis na tela (pode conter o botão 3 linhas)
  r.allButtons = [...document.querySelectorAll('button, [role="button"]')]
    .filter(el => el.offsetParent !== null)
    .map(el => ({ tag: el.tagName, class: el.className.slice(0, 60), text: el.innerText?.trim().slice(0, 40), title: el.title }))
    .slice(0, 30);

  console.log('%c=== DIAGNÓSTICO GEOBRAIN ===', 'color:green;font-size:16px;font-weight:bold');
  console.log(JSON.stringify(r, null, 2));
  console.log('%cCopie o texto acima e envie para ajuste do script!', 'color:orange;font-weight:bold');
  return r;
})();
