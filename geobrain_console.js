/**
 * GeoBrain CSV Downloader — Console Script
 * =========================================
 * Como usar:
 *  1. Abra https://geobrain.com.br/mapa no Chrome (já logado)
 *  2. Pressione F12 → aba "Console"
 *  3. Cole TODO este código e pressione Enter
 *  4. Siga as instruções que aparecerem na tela
 */

(async function GeoBrainDownloader() {

  // ─── Utilitários ──────────────────────────────────────────────────────────

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const waitFor = async (selectorFn, timeout = 10000, interval = 300) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = selectorFn();
      if (el) return el;
      await sleep(interval);
    }
    return null;
  };

  // Clique que funciona tanto em elementos React quanto nativos
  const click = el => {
    ['mousedown','mouseup','click'].forEach(type =>
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
    );
  };

  // Encontra elemento pelo texto visível
  const byText = (text, tag = '*') =>
    [...document.querySelectorAll(tag)].find(el =>
      el.offsetParent !== null && el.textContent.trim() === text
    );

  // Encontra elemento que contém texto
  const byTextContains = (text, tag = '*') =>
    [...document.querySelectorAll(tag)].find(el =>
      el.offsetParent !== null && el.textContent.trim().includes(text)
    );

  const log = msg => console.log(`%c[GeoBrain] ${msg}`, 'color:#2e7d32;font-weight:bold');
  const warn = msg => console.warn(`[GeoBrain] ${msg}`);

  // ─── Passo 1: Listar projetos ─────────────────────────────────────────────

  log('Procurando dropdown de projetos...');
  await sleep(2000);

  // Tenta encontrar as opções do dropdown (React-Select ou select nativo)
  let projectOptions = [];

  // Tenta abrir o dropdown de projeto
  const dropdownTriggers = [
    ...document.querySelectorAll('[class*="select__control"]'),
    ...document.querySelectorAll('[class*="Select__control"]'),
    ...document.querySelectorAll('[class*="dropdown"]'),
    ...document.querySelectorAll('select'),
  ].filter(el => el.offsetParent !== null);

  if (dropdownTriggers.length > 0) {
    click(dropdownTriggers[0]);
    await sleep(800);

    // Coleta as opções visíveis
    const optEls = [
      ...document.querySelectorAll('[class*="select__option"]'),
      ...document.querySelectorAll('[class*="Select__option"]'),
      ...document.querySelectorAll('[class*="option"]'),
      ...document.querySelectorAll('option'),
      ...document.querySelectorAll('[role="option"]'),
    ].filter(el => el.offsetParent !== null);

    optEls.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.toLowerCase() !== 'selecione' && !projectOptions.includes(text)) {
        projectOptions.push(text);
      }
    });
  }

  // Fecha o dropdown sem selecionar
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(500);

  // Mostra projetos e pede escolha
  let chosenProject = null;
  if (projectOptions.length > 0) {
    const listStr = projectOptions.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const answer = prompt(`Projetos disponíveis:\n\n${listStr}\n\nDigite o NÚMERO do projeto desejado:`);
    const idx = parseInt(answer) - 1;
    if (idx >= 0 && idx < projectOptions.length) {
      chosenProject = projectOptions[idx];
    } else {
      alert('Número inválido. Selecione o projeto manualmente e rode o script novamente.');
      return;
    }
  } else {
    alert('Não consegui listar os projetos automaticamente.\n\nPor favor:\n1. Selecione o projeto manualmente no dropdown\n2. Aguarde o mapa carregar\n3. Rode o script novamente (ele vai pular a seleção)');
    const continuar = confirm('O projeto já está selecionado e o mapa carregou?\nClique OK para continuar com os pins.');
    if (!continuar) return;
  }

  // ─── Passo 2: Selecionar projeto ──────────────────────────────────────────

  if (chosenProject) {
    log(`Selecionando projeto: ${chosenProject}`);

    // Abre dropdown de novo
    if (dropdownTriggers.length > 0) {
      click(dropdownTriggers[0]);
      await sleep(800);
    }

    // Clica na opção correspondente
    const allOpts = [
      ...document.querySelectorAll('[class*="select__option"]'),
      ...document.querySelectorAll('[class*="option"]'),
      ...document.querySelectorAll('[role="option"]'),
      ...document.querySelectorAll('option'),
    ].filter(el => el.offsetParent !== null);

    const targetOpt = allOpts.find(el => el.textContent.trim() === chosenProject);
    if (targetOpt) {
      click(targetOpt);
      log('Projeto selecionado! Aguardando mapa carregar...');
      await sleep(5000);
    } else {
      alert(`Não encontrei a opção "${chosenProject}" para clicar.\nSelecione manualmente e pressione OK.`);
      await sleep(2000);
    }
  }

  // ─── Passo 3: Detectar pins do mapa ───────────────────────────────────────

  log('Procurando pins no mapa...');

  const pinSelectors = [
    '.leaflet-marker-icon',
    'img[src*="marker"]',
    'img[src*="pin"]',
    '[class*="marker-icon"]',
    '[class*="map-pin"]',
    '.gm-style [role="button"] img',
    '[data-marker-id]',
    'area[coords]',
    '.cluster',
    '[class*="Marker"]',
  ];

  let pins = [];
  for (const sel of pinSelectors) {
    const found = [...document.querySelectorAll(sel)].filter(el => el.offsetParent !== null);
    if (found.length > 0) {
      pins = found;
      log(`Encontrei ${pins.length} pins com seletor: ${sel}`);
      break;
    }
  }

  if (pins.length === 0) {
    alert('Não encontrei pins no mapa automaticamente.\n\nDica: Pode ser que o mapa use marcadores SVG ou camadas especiais.\nVerifique no DevTools qual elemento representa os pins e me informe.');
    return;
  }

  const confirmar = confirm(`Encontrei ${pins.length} pins no mapa.\nDeseja iniciar o download para todos eles?`);
  if (!confirmar) return;

  // ─── Passo 4: Processar cada pin ──────────────────────────────────────────

  const metrics = ['Estoque', 'Venda Líquida', 'Preço Médio M²', 'Preço Médio'];
  let totalDownloads = 0;
  const erros = [];

  for (let pinIdx = 0; pinIdx < pins.length; pinIdx++) {
    const pin = pins[pinIdx];
    log(`\nProcessando pin ${pinIdx + 1} de ${pins.length}...`);

    // Clica no pin
    click(pin);
    await sleep(2500);

    // Clica na aba "Análise Temporal"
    const tabSelectors = [
      () => byText('Análise Temporal'),
      () => byTextContains('Análise Temporal'),
      () => document.querySelector('[class*="tab"]:not([disabled])'),
    ];

    let tabClicked = false;
    for (const fn of tabSelectors) {
      const tab = fn();
      if (tab) {
        click(tab);
        tabClicked = true;
        await sleep(2000);
        break;
      }
    }

    if (!tabClicked) {
      warn(`Pin ${pinIdx + 1}: aba "Análise Temporal" não encontrada — pulando.`);
      erros.push(`Pin ${pinIdx + 1}: aba não encontrada`);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(500);
      continue;
    }

    // Para cada métrica
    for (const metric of metrics) {
      log(`  Métrica: ${metric}`);

      // Seleciona a métrica no dropdown de "Informação"
      await selecionarMetrica(metric);
      await sleep(1500);

      // Tenta baixar via API Highcharts (mais confiável)
      const baixouViaApi = tentarDownloadHighcharts(metric, pinIdx + 1, chosenProject);

      if (!baixouViaApi) {
        // Fallback: clica no botão de 3 linhas do gráfico
        const baixouViaMenu = await baixarViaMenu(metric, pinIdx + 1);
        if (!baixouViaMenu) {
          warn(`  Pin ${pinIdx + 1} / ${metric}: download falhou`);
          erros.push(`Pin ${pinIdx + 1} / ${metric}`);
        } else {
          totalDownloads++;
        }
      } else {
        totalDownloads++;
      }

      await sleep(800);
    }

    // Fecha o painel
    const fecharBtn = [
      () => document.querySelector('[class*="close"]'),
      () => document.querySelector('[aria-label="close"]'),
      () => document.querySelector('[aria-label="fechar"]'),
      () => byText('×'),
    ].reduce((found, fn) => found || fn(), null);

    if (fecharBtn) click(fecharBtn);
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await sleep(1000);
  }

  // ─── Relatório final ──────────────────────────────────────────────────────

  let msg = `✅ Concluído!\n\n📁 Downloads realizados: ${totalDownloads} de ${pins.length * metrics.length}`;
  if (erros.length > 0) {
    msg += `\n\n⚠️ Falhas (${erros.length}):\n${erros.join('\n')}`;
  }
  log(msg.replace(/\n/g, ' | '));
  alert(msg);

  // ─── Funções auxiliares ───────────────────────────────────────────────────

  async function selecionarMetrica(metric) {
    // Procura o dropdown de informação (o que contém "Estoque" como padrão)
    const infoDropdowns = [
      ...document.querySelectorAll('[class*="select__control"]'),
      ...document.querySelectorAll('[class*="Select__control"]'),
    ].filter(el => {
      const text = el.textContent || '';
      return el.offsetParent !== null &&
        (text.includes('Estoque') || text.includes('Venda') ||
         text.includes('Preço') || text.includes('Informação'));
    });

    if (infoDropdowns.length > 0) {
      click(infoDropdowns[0]);
      await sleep(500);

      const opts = [
        ...document.querySelectorAll('[class*="select__option"]'),
        ...document.querySelectorAll('[role="option"]'),
      ].filter(el => el.offsetParent !== null);

      const target = opts.find(el => el.textContent.trim() === metric);
      if (target) {
        click(target);
        return true;
      }
    }

    return false;
  }

  function tentarDownloadHighcharts(metric, pinNum, projectName) {
    try {
      if (typeof Highcharts === 'undefined') return false;

      const charts = Highcharts.charts.filter(Boolean);
      if (charts.length === 0) return false;

      const chart = charts[charts.length - 1]; // usa o gráfico mais recente
      const safeName = metric.replace(/\s/g, '_').replace('²', '2').replace('/', '_');
      const safeProject = (projectName || 'projeto').replace(/\s/g, '_').slice(0, 20);

      chart.options.exporting = chart.options.exporting || {};
      chart.options.exporting.filename = `pin${pinNum}_${safeProject}_${safeName}`;
      chart.downloadCSV();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function baixarViaMenu(metric, pinNum) {
    // Clica no botão de 3 linhas do Highcharts
    const menuBtns = [
      ...document.querySelectorAll('.highcharts-button'),
      ...document.querySelectorAll('[class*="highcharts-contextbutton"]'),
      ...document.querySelectorAll('g.highcharts-button'),
    ].filter(el => el.getBoundingClientRect().width > 0);

    if (menuBtns.length === 0) return false;

    click(menuBtns[menuBtns.length - 1]);
    await sleep(600);

    // Clica em "Download CSV"
    const csvItem = byTextContains('Download CSV');
    if (!csvItem) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    click(csvItem);
    await sleep(800);
    return true;
  }

})();
