/**
 * GeoBrain — DEBUG (um pin só)
 * Rode com o modal de um pin aberto, já na aba "Análise Temporal".
 * Mostra passo a passo o que acontece ao trocar para "Venda Líquida".
 */
(async function debugMetrica() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;

  console.log('%c=== DEBUG GEOBRAIN ===', 'color:orange;font-weight:bold;font-size:14px');

  // 1. Acha o select
  const select = [...document.querySelectorAll('select.form-control, select')]
    .find(s => [...s.options].some(o => o.text.trim() === 'Estoque'));
  console.log('1. Select encontrado?', !!select);
  if (!select) return;
  console.log('   Opções:', [...select.options].map(o => o.text.trim()));
  console.log('   Valor atual:', select.value);

  // 2. Subtitle atual
  console.log('2. Subtitle ANTES:', document.querySelector('.highcharts-subtitle')?.textContent);

  // 3. Tabela já aberta?
  console.log('3. Tabela de dados aberta?', !!document.querySelector('.highcharts-data-table table'));

  // 4. Muda para "Venda Líquida"
  const opt = [...select.options].find(o => o.text.trim() === 'Venda Líquida');
  console.log('4. Opção "Venda Líquida" encontrada?', !!opt, 'value=', opt?.value);

  nativeSetter.call(select, opt.value);
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(2000);

  console.log('5. Valor do select DEPOIS:', select.value);
  console.log('6. Subtitle DEPOIS:', document.querySelector('.highcharts-subtitle')?.textContent);

  // 7. Abre o menu e lista TODOS os itens
  const menuBtn = document.querySelector('g.highcharts-contextbutton, .highcharts-contextbutton');
  console.log('7. Botão de menu encontrado?', !!menuBtn);
  if (menuBtn) {
    menuBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await sleep(600);

    const itens = [...document.querySelectorAll('.highcharts-menu-item, li[role="menuitem"], .highcharts-menu li, div, span, li, button')]
      .filter(el => el.offsetParent !== null && el.textContent.trim().length > 0 && el.textContent.trim().length < 40)
      .map(el => el.textContent.trim());
    console.log('8. Itens visíveis no menu (candidatos):', [...new Set(itens)]);

    // Fecha o menu
    document.body.click();
  }

  console.log('%c=== FIM DO DEBUG ===', 'color:orange;font-weight:bold;font-size:14px');
  console.log('Copie TUDO acima (do "=== DEBUG" até "=== FIM") e envie.');
})();
