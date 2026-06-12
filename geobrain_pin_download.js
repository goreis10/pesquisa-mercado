/**
 * GeoBrain — Download automático dos 4 CSVs (Análise Temporal)
 * =============================================================
 * COMO USAR (repita para cada pin):
 *   1. Clique no PIN do mapa (abre o modal do empreendimento)
 *   2. Cole este script no console (F12 → Console) e pressione Enter
 *   3. Aguarde — ele clica em "Análise Temporal" e baixa os 4 CSVs
 *   4. Feche o modal, clique no próximo pin e rode o script de novo
 */
(async function baixarCSVsDoPin() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const log = msg => console.log(`%c[GeoBrain] ${msg}`, 'color:#2e7d32;font-weight:bold');
  const warn = msg => console.warn(`[GeoBrain] ${msg}`);

  // ── 1. Clica na aba "Análise Temporal" ─────────────────────────────────
  const tabTextEl = [...document.querySelectorAll('*')]
    .find(el => el.offsetParent !== null &&
                el.children.length === 0 &&
                el.textContent.trim() === 'Análise Temporal');

  if (tabTextEl) {
    const clickable = tabTextEl.closest('a, li, button, [role="tab"]') || tabTextEl;
    clickable.click();
    log('Aba "Análise Temporal" clicada.');
    await sleep(1500);
  } else {
    warn('Aba "Análise Temporal" não encontrada — verifique se o modal do pin está aberto.');
    return;
  }

  // ── 2. Encontra o select de métricas ───────────────────────────────────
  const select = [...document.querySelectorAll('select.form-control, select')]
    .find(s => [...s.options].some(o => o.text.trim() === 'Estoque'));

  if (!select) {
    warn('Select de métricas (Estoque/Venda Líquida/...) não encontrado.');
    return;
  }

  const metrics = ['Estoque', 'Venda Líquida', 'Preço Médio M²', 'Preço Médio'];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;

  let baixados = 0;

  for (const metric of metrics) {
    const opt = [...select.options].find(o => o.text.trim() === metric);
    if (!opt) {
      warn(`Opção "${metric}" não encontrada no select.`);
      continue;
    }

    log(`Selecionando métrica: ${metric}`);
    nativeSetter.call(select, opt.value);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(1800);

    // ── 3. Clica no botão de menu (3 linhas) do Highcharts ──────────────
    const menuBtn = document.querySelector('g.highcharts-contextbutton, .highcharts-contextbutton');
    if (!menuBtn) {
      warn(`Botão de menu do gráfico não encontrado para "${metric}".`);
      continue;
    }
    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await sleep(700);

    // ── 4. Clica em "Download CSV" ──────────────────────────────────────
    const csvItem = [...document.querySelectorAll('div, span, li, button')]
      .find(el => el.offsetParent !== null && el.textContent.trim() === 'Download CSV');

    if (!csvItem) {
      warn(`Item "Download CSV" não encontrado para "${metric}".`);
      // fecha o menu clicando fora
      document.body.click();
      await sleep(300);
      continue;
    }

    csvItem.click();
    log(`✅ CSV baixado: ${metric}`);
    baixados++;
    await sleep(1200);
  }

  alert(`Concluído!\n\n${baixados} de ${metrics.length} CSVs baixados para este pin.\n\nFeche o modal, clique no próximo pin e rode o script novamente.`);
})();
