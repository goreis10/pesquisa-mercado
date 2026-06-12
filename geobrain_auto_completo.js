/**
 * GeoBrain — AUTOMAÇÃO COMPLETA (todos os pins, com nomes customizados)
 * =======================================================================
 * COMO USAR:
 *   1. Selecione o projeto e deixe o MAPA visível (modal fechado)
 *   2. Cole este script no console (F12 → Console, "allow pasting" se pedir)
 *   3. Confirme a quantidade de pins na caixa de diálogo
 *   4. Aguarde — ele clica em CADA pin, vai em "Análise Temporal",
 *      extrai a tabela de dados de cada métrica e baixa um CSV
 *      nomeado como: NN_NomeDoPin_Metrica.csv
 *
 * Para cada pin ele baixa os 4 CSVs (Estoque, Venda Líquida,
 * Preço Médio M², Preço Médio) ANTES de passar para o próximo pin.
 *
 * Exemplo de arquivos gerados:
 *   01_Brumana_Estoque.csv
 *   01_Brumana_Venda_Liquida.csv
 *   01_Brumana_Preco_Medio_M2.csv
 *   01_Brumana_Preco_Medio.csv
 *   02_OutroProjeto_Estoque.csv
 *   ...
 */
(async function autoBaixarTodosPins() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = msg => console.log(`%c[GeoBrain] ${msg}`, 'color:#2e7d32;font-weight:bold');
  const warn = msg => console.warn(`[GeoBrain] ${msg}`);

  const metrics = ['Estoque', 'Venda Líquida', 'Preço Médio M²', 'Preço Médio'];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;

  // ── Normaliza texto para comparação (sem acento, minúsculo) ─────────────
  function norm(s) {
    return (s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/²/g, '2')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ── Sanitiza nomes para uso em arquivo ──────────────────────────────────
  function sanitize(name) {
    return (name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/²/g, '2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);
  }

  // ── Converte tabela HTML em CSV ─────────────────────────────────────────
  function tableToCSV(table) {
    const rows = [...table.querySelectorAll('tr')];
    return rows.map(row =>
      [...row.querySelectorAll('th,td')]
        .map(cell => {
          let text = cell.textContent.trim().replace(/"/g, '""');
          if (/[",;\n]/.test(text)) text = `"${text}"`;
          return text;
        })
        .join(';')
    ).join('\r\n');
  }

  // ── Dispara download de um Blob CSV ─────────────────────────────────────
  function downloadCSV(content, filename) {
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // ── Abre o menu do gráfico e clica num item por uma lista de rótulos ─────
  // Retorna o rótulo que foi clicado, ou null se nenhum encontrado.
  async function clicarItemMenu(rotulosAceitos) {
    const menuBtn = document.querySelector('g.highcharts-contextbutton, .highcharts-contextbutton');
    if (!menuBtn) return null;

    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await sleep(500);

    const candidatos = [...document.querySelectorAll(
      '.highcharts-menu-item, li[role="menuitem"], .highcharts-menu li, div, span, li, button'
    )];
    const alvo = candidatos.find(el =>
      el.offsetParent !== null && rotulosAceitos.includes(el.textContent.trim())
    );

    if (!alvo) {
      document.body.click(); // fecha o menu
      await sleep(200);
      return null;
    }
    const rotulo = alvo.textContent.trim();
    alvo.click();
    await sleep(500);
    return rotulo;
  }

  // ── Rótulos possíveis do item que alterna a tabela de dados ─────────────
  // No GeoBrain é um TOGGLE único ("View data table") que mostra/esconde —
  // o rótulo não muda. Incluímos variações por segurança.
  const ROTULOS_TABELA = [
    'View data table', 'Hide data table',
    'Ver tabela de dados', 'Ocultar tabela de dados',
    'Mostrar tabela de dados', 'Esconder tabela de dados',
  ];

  function tabelaVisivel() {
    return !!document.querySelector('.highcharts-data-table table');
  }

  // ── Alterna o toggle até a tabela ficar no estado desejado ──────────────
  // NUNCA remove do DOM (isso dessincronizava o estado interno do Highcharts).
  async function setTabela(desejadoVisivel) {
    for (let i = 0; i < 4; i++) {
      if (tabelaVisivel() === desejadoVisivel) return tabelaVisivel();
      await clicarItemMenu(ROTULOS_TABELA); // clica o toggle (qualquer rótulo)
      await sleep(700);
    }
    return tabelaVisivel();
  }

  // ── Texto da legenda/subtítulo atual do gráfico (a métrica em exibição) ──
  function metricaAtual() {
    const sub = document.querySelector('.highcharts-subtitle');
    return sub ? sub.textContent.trim() : '';
  }

  // ── Baixa os 4 CSVs do modal aberto ─────────────────────────────────────
  async function baixarCSVsDoModal(label, pinNum) {
    // Clica na aba "Análise Temporal"
    const tabTextEl = [...document.querySelectorAll('*')]
      .find(el => el.offsetParent !== null &&
                  el.children.length === 0 &&
                  el.textContent.trim() === 'Análise Temporal');

    if (!tabTextEl) {
      warn(`[${label}] Aba "Análise Temporal" não encontrada.`);
      return 0;
    }
    const clickableTab = tabTextEl.closest('a, li, button, [role="tab"]') || tabTextEl;
    clickableTab.click();
    await sleep(1500);

    // Encontra o select de métricas
    const select = [...document.querySelectorAll('select.form-control, select')]
      .find(s => [...s.options].some(o => o.text.trim() === 'Estoque'));

    if (!select) {
      warn(`[${label}] Select de métricas não encontrado.`);
      return 0;
    }

    const safeLabel = sanitize(label);
    let baixados = 0;

    for (const metric of metrics) {
      const opt = [...select.options].find(o => o.text.trim() === metric);
      if (!opt) {
        warn(`[${label}] Opção "${metric}" não encontrada no select.`);
        continue;
      }

      // Garante que a tabela da métrica anterior esteja FECHADA (estado limpo)
      await setTabela(false);

      // Seleciona a métrica
      nativeSetter.call(select, opt.value);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(1800);

      // Verifica (com retentativas) se o gráfico realmente trocou de métrica
      let tentativas = 0;
      while (tentativas < 4 && norm(metricaAtual()) && norm(metricaAtual()) !== norm(metric)) {
        await sleep(700);
        tentativas++;
      }
      const subAtual = metricaAtual();
      if (subAtual && norm(subAtual) !== norm(metric)) {
        warn(`[${label}] Gráfico ainda mostra "${subAtual}" ao pedir "${metric}" — usando legenda real no nome.`);
      }

      // ABRE a tabela de dados (alterna o toggle até aparecer)
      await setTabela(true);
      const table = document.querySelector('.highcharts-data-table table');
      if (!table) {
        warn(`[${label}] Tabela de dados não apareceu para "${metric}".`);
        continue;
      }

      // Nome do arquivo: usa a legenda REAL do gráfico (mais confiável); senão, a métrica pedida
      const metricLabel = subAtual ? subAtual : metric;
      const csv = tableToCSV(table);
      const safeMetric = sanitize(metricLabel);
      const filename = `${String(pinNum).padStart(2, '0')}_${safeLabel}_${safeMetric}.csv`;
      downloadCSV(csv, filename);
      baixados++;
      log(`  [${label}] CSV baixado: ${filename}`);
      await sleep(800);

      // FECHA a tabela para a próxima métrica (mantém o estado sincronizado)
      await setTabela(false);
    }
    return baixados;
  }

  // ── Fecha o modal do pin ────────────────────────────────────────────────
  function fecharModal() {
    const closeSelectors = [
      'button.close',
      '[data-dismiss="modal"]',
      '.modal-header button',
      '[aria-label="Close"]',
      '[aria-label="fechar" i]',
      '[aria-label="Fechar"]',
    ];
    for (const sel of closeSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  // ── Coleta os marcadores do mapa ────────────────────────────────────────
  const markers = [...document.querySelectorAll('gmp-advanced-marker')];

  if (markers.length === 0) {
    alert('Nenhum marcador (gmp-advanced-marker) encontrado.\nVerifique se o mapa está visível e o projeto selecionado.');
    return;
  }

  const confirmar = confirm(
    `Encontrados ${markers.length} pins no mapa.\n` +
    `Isso vai tentar baixar até ${markers.length * 4} arquivos CSV.\n\n` +
    `O processo pode levar alguns minutos. Deseja continuar?`
  );
  if (!confirmar) return;

  log(`Iniciando processamento de ${markers.length} pins...`);

  let totalBaixados = 0;
  const resumo = [];

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const label = marker.getAttribute('aria-label') || marker.getAttribute('title') || `pin${i + 1}`;
    const pinNum = i + 1;

    log(`\n[${pinNum}/${markers.length}] Pin: ${label}`);

    try {
      marker.click();
      await sleep(2800);

      const baixados = await baixarCSVsDoModal(label, pinNum);
      totalBaixados += baixados;
      resumo.push(`${pinNum}. ${label}: ${baixados}/4`);

      fecharModal();
      await sleep(1800);
    } catch (e) {
      warn(`[${label}] Erro: ${e.message}`);
      resumo.push(`${pinNum}. ${label}: ERRO`);
      fecharModal();
      await sleep(1000);
    }
  }

  const msg = `Concluído!\n\nTotal: ${totalBaixados} de ${markers.length * 4} CSVs\n\n${resumo.join('\n')}`;
  console.log(msg);
  alert(msg);
})();
