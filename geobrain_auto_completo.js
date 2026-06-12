/**
 * GeoBrain — AUTOMAÇÃO COMPLETA (todos os pins)
 * ===============================================
 * COMO USAR:
 *   1. Selecione o projeto e deixe o MAPA visível (modal fechado)
 *   2. Cole este script no console (F12 → Console, "allow pasting" se pedir)
 *   3. Confirme a quantidade de pins na caixa de diálogo
 *   4. Aguarde — ele clica em CADA pin, vai em "Análise Temporal"
 *      e baixa os 4 CSVs (Estoque, Venda Líquida, Preço Médio M², Preço Médio)
 *
 * Os downloads ficam na pasta padrão de Downloads do navegador,
 * com nomes genéricos (chart.csv, chart (1).csv, ...) na ordem
 * de processamento — o console mostra o nome do pin de cada bloco de 4.
 */
(async function autoBaixarTodosPins() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = msg => console.log(`%c[GeoBrain] ${msg}`, 'color:#2e7d32;font-weight:bold');
  const warn = msg => console.warn(`[GeoBrain] ${msg}`);

  const metrics = ['Estoque', 'Venda Líquida', 'Preço Médio M²', 'Preço Médio'];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;

  // ── Baixa os 4 CSVs do modal aberto ────────────────────────────────────
  async function baixarCSVsDoModal(label) {
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

    let baixados = 0;
    for (const metric of metrics) {
      const opt = [...select.options].find(o => o.text.trim() === metric);
      if (!opt) {
        warn(`[${label}] Opção "${metric}" não encontrada no select.`);
        continue;
      }

      nativeSetter.call(select, opt.value);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(1800);

      const menuBtn = document.querySelector('g.highcharts-contextbutton, .highcharts-contextbutton');
      if (!menuBtn) {
        warn(`[${label}] Botão de menu do gráfico não encontrado para "${metric}".`);
        continue;
      }
      menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      await sleep(700);

      const csvItem = [...document.querySelectorAll('div, span, li, button')]
        .find(el => el.offsetParent !== null && el.textContent.trim() === 'Download CSV');

      if (!csvItem) {
        warn(`[${label}] "Download CSV" não encontrado para "${metric}".`);
        document.body.click();
        await sleep(300);
        continue;
      }

      csvItem.click();
      baixados++;
      log(`  [${label}] CSV baixado: ${metric}`);
      await sleep(1200);
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

    log(`\n[${i + 1}/${markers.length}] Pin: ${label}`);

    try {
      marker.click();
      await sleep(2800);

      const baixados = await baixarCSVsDoModal(label);
      totalBaixados += baixados;
      resumo.push(`${label}: ${baixados}/4`);

      fecharModal();
      await sleep(1800);
    } catch (e) {
      warn(`[${label}] Erro: ${e.message}`);
      resumo.push(`${label}: ERRO`);
      fecharModal();
      await sleep(1000);
    }
  }

  const msg = `Concluído!\n\nTotal: ${totalBaixados} de ${markers.length * 4} CSVs\n\n${resumo.join('\n')}`;
  console.log(msg);
  alert(msg);
})();
