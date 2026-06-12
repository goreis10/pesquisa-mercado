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

  // ── Sanitiza nomes para uso em arquivo ──────────────────────────────────
  function sanitize(name) {
    return name
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[²]/g, '2')
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
          if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes(';')) {
            text = `"${text}"`;
          }
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Abre o menu do gráfico e clica numa opção pelo texto ────────────────
  async function clicarOpcaoMenu(textoOpcao) {
    const menuBtn = document.querySelector('g.highcharts-contextbutton, .highcharts-contextbutton');
    if (!menuBtn) return false;

    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await sleep(600);

    const item = [...document.querySelectorAll('div, span, li, button')]
      .find(el => el.offsetParent !== null && el.textContent.trim() === textoOpcao);

    if (!item) {
      document.body.click();
      await sleep(300);
      return false;
    }

    item.click();
    await sleep(600);
    return true;
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

      // Remove qualquer tabela de dados que tenha ficado da métrica anterior
      document.querySelectorAll('.highcharts-data-table').forEach(el => el.remove());
      document.body.click(); // garante que nenhum menu fique aberto
      await sleep(300);

      // Seleciona a métrica
      nativeSetter.call(select, opt.value);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(1800);

      // Abre "View data table"
      let abriu = await clicarOpcaoMenu('View data table');
      let table = document.querySelector('.highcharts-data-table table');

      if (!table) {
        await sleep(700);
        table = document.querySelector('.highcharts-data-table table');
      }

      if (!table) {
        warn(`[${label}] Tabela de dados não encontrada para "${metric}".`);
        continue;
      }

      const csv = tableToCSV(table);
      const safeMetric = sanitize(metric);
      const filename = `${String(pinNum).padStart(2, '0')}_${safeLabel}_${safeMetric}.csv`;
      downloadCSV(csv, filename);
      baixados++;
      log(`  [${label}] CSV baixado: ${filename}`);
      await sleep(800);

      // Remove a tabela de dados diretamente do DOM (evita depender do toggle do menu)
      document.querySelectorAll('.highcharts-data-table').forEach(el => el.remove());
      await sleep(300);
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
