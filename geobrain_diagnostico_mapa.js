/**
 * GeoBrain — Diagnóstico de Mapa
 * Rode com o MAPA VISÍVEL (sem modal aberto) e o projeto já selecionado.
 * Copia o resultado para a área de transferência.
 */
(function diagnosticoMapa() {
  const sels = [
    '.leaflet-marker-icon',
    '.leaflet-marker-pane img',
    '.leaflet-marker-pane > *',
    'img[src*="marker"]',
    'img[src*="pin"]',
    '[class*="marker"]',
    '[class*="Marker"]',
    '[class*="pin"]',
    '[class*="Pin"]',
    '.gm-style img',
    '.gm-style [role="button"]',
    '[data-marker-id]',
    'svg circle',
    'svg path[class*="marker"]',
    '[class*="cluster"]',
    '.leaflet-interactive',
  ];

  const r = {};
  sels.forEach(sel => {
    try {
      const found = [...document.querySelectorAll(sel)].filter(el => el.offsetParent !== null);
      if (found.length > 0) {
        r[sel] = {
          count: found.length,
          tag: found[0].tagName,
          class: found[0].className?.toString().slice(0, 100),
          html: found[0].outerHTML.slice(0, 200)
        };
      }
    } catch (e) {}
  });

  // Detecta qual biblioteca de mapa está em uso
  r.bibliotecas = {
    leaflet: typeof L !== 'undefined',
    googleMaps: typeof google !== 'undefined' && !!google.maps,
    mapboxgl: typeof mapboxgl !== 'undefined',
  };

  // Containers de mapa
  r.mapContainers = [...document.querySelectorAll('[class*="map"], [id*="map"]')]
    .filter(el => el.offsetParent !== null && el.getBoundingClientRect().width > 100)
    .map(el => ({ tag: el.tagName, id: el.id, class: el.className.toString().slice(0, 80) }))
    .slice(0, 5);

  const json = JSON.stringify(r, null, 2);
  console.log('%c=== DIAGNÓSTICO MAPA ===', 'color:green;font-size:16px;font-weight:bold');
  console.log(json);
  copy(json);
  console.log('%c✅ Copiado! Cole na conversa com Ctrl+V', 'color:blue;font-weight:bold;font-size:14px');
})();
