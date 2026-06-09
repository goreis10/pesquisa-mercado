"""
Geobrain CSV Downloader
-----------------------
Requisitos:
    pip install playwright
    playwright install chromium   (ou: playwright install chrome)

Como usar:
    1. Feche TODAS as janelas do Google Chrome (necessário para usar o perfil)
    2. Execute: python geobrain_download.py
    3. Escolha o projeto quando solicitado
    4. O script clica em cada pin, vai em "Análise Temporal" e baixa os 4 CSVs

Os arquivos são salvos na pasta: ./geobrain_csvs/
"""

import asyncio
import os
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright

DOWNLOAD_DIR = Path("geobrain_csvs")
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Pasta de perfil do Chrome por SO
def get_chrome_profile():
    if sys.platform == "win32":
        return os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
    elif sys.platform == "darwin":
        return os.path.expanduser("~/Library/Application Support/Google/Chrome")
    else:
        return os.path.expanduser("~/.config/google-chrome")


async def select_project(page):
    """Lista projetos disponíveis e pede ao usuário para escolher."""
    print("\nAguardando carregamento dos projetos...")
    await page.wait_for_timeout(3000)

    # Tenta clicar no dropdown de projetos para abrir as opções
    dropdown_selectors = [
        "text=Selecione",
        "[placeholder='Selecione']",
        ".select__control",
        "[class*='select']",
        "select",
    ]

    dropdown = None
    for sel in dropdown_selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                dropdown = el
                break
        except Exception:
            pass

    if not dropdown:
        print("AVISO: Não encontrei o dropdown de projetos automaticamente.")
        print("Por favor, selecione o projeto manualmente no navegador e pressione ENTER quando pronto.")
        input("Pressione ENTER após selecionar o projeto...")
        return

    await dropdown.click()
    await page.wait_for_timeout(1000)

    # Coleta as opções visíveis
    option_selectors = [
        ".select__option",
        "[class*='option']",
        "li[role='option']",
        ".dropdown-item",
    ]

    options = []
    for sel in option_selectors:
        opts = await page.query_selector_all(sel)
        if opts:
            for opt in opts:
                text = (await opt.inner_text()).strip()
                if text and text.lower() not in ("selecione", ""):
                    options.append((text, opt))
            break

    if not options:
        print("Não consegui listar os projetos automaticamente.")
        print("Por favor, selecione o projeto manualmente e pressione ENTER.")
        input("Pressione ENTER após selecionar o projeto...")
        return

    print("\nProjetos disponíveis:")
    for i, (name, _) in enumerate(options, 1):
        print(f"  {i}. {name}")

    while True:
        try:
            choice = int(input("\nDigite o número do projeto desejado: "))
            if 1 <= choice <= len(options):
                selected_name, selected_el = options[choice - 1]
                await selected_el.click()
                print(f"Projeto selecionado: {selected_name}")
                await page.wait_for_timeout(3000)
                return selected_name
        except (ValueError, KeyboardInterrupt):
            pass
        print("Número inválido. Tente novamente.")


async def get_map_pins(page):
    """Retorna todos os marcadores visíveis no mapa."""
    await page.wait_for_timeout(3000)

    pin_selectors = [
        "img[src*='marker']",
        "img[src*='pin']",
        ".leaflet-marker-icon",
        "[class*='marker']",
        "div[title]",
        "area[href]",
        "svg circle",
        ".gm-svpc",
        "[data-marker]",
        ".cluster-marker",
    ]

    for sel in pin_selectors:
        pins = await page.query_selector_all(sel)
        if pins:
            print(f"Encontrei {len(pins)} pins com seletor: {sel}")
            return pins, sel

    print("AVISO: Não encontrei pins automaticamente.")
    return [], None


async def download_csv_for_metric(page, metric_name, pin_index, project_name):
    """Seleciona métrica no dropdown de informação e baixa o CSV."""
    print(f"      Baixando CSV: {metric_name}...")

    # Seleciona a métrica no dropdown "Informação"
    info_dropdown_selectors = [
        "select",
        ".select__control",
        "[class*='select']",
    ]

    # Primeiro precisamos encontrar o dropdown de "Informação" dentro da aba
    info_dropdown = None
    for sel in info_dropdown_selectors:
        els = await page.query_selector_all(sel)
        for el in els:
            text = (await el.inner_text()).strip() if await el.inner_text() else ""
            placeholder = await el.get_attribute("placeholder") or ""
            if "estoque" in text.lower() or "estoque" in placeholder.lower() or \
               "informação" in text.lower() or "informação" in placeholder.lower():
                info_dropdown = el
                break
        if info_dropdown:
            break

    if info_dropdown:
        await info_dropdown.click()
        await page.wait_for_timeout(500)

        # Seleciona a opção da métrica
        opt_selectors = [
            f"text={metric_name}",
            f".select__option:has-text('{metric_name}')",
            f"[class*='option']:has-text('{metric_name}')",
            f"li:has-text('{metric_name}')",
        ]
        for sel in opt_selectors:
            try:
                opt = await page.query_selector(sel)
                if opt:
                    await opt.click()
                    await page.wait_for_timeout(1000)
                    break
            except Exception:
                pass
    else:
        print(f"      AVISO: Dropdown de informação não encontrado para {metric_name}")

    # Clica no botão de 3 linhas (hamburger/context menu do gráfico Highcharts)
    menu_btn_selectors = [
        ".highcharts-button",
        "button[aria-label*='menu']",
        "button[aria-label*='Menu']",
        "[class*='highcharts-contextbutton']",
        "g.highcharts-button",
        "text=≡",
    ]

    menu_btn = None
    for sel in menu_btn_selectors:
        try:
            btn = await page.query_selector(sel)
            if btn:
                menu_btn = btn
                break
        except Exception:
            pass

    if not menu_btn:
        print(f"      AVISO: Botão de menu do gráfico não encontrado para {metric_name}")
        return False

    await menu_btn.click()
    await page.wait_for_timeout(800)

    # Clica em "Download CSV"
    csv_selectors = [
        "text=Download CSV",
        "[class*='highcharts-menu-item']:has-text('Download CSV')",
        "li:has-text('Download CSV')",
        "span:has-text('Download CSV')",
    ]

    safe_metric = metric_name.replace(" ", "_").replace("²", "2").replace("/", "_")
    safe_project = (project_name or "projeto").replace(" ", "_")[:30]
    expected_filename = f"pin{pin_index}_{safe_project}_{safe_metric}.csv"

    async with page.expect_download(timeout=15000) as download_info:
        clicked = False
        for sel in csv_selectors:
            try:
                el = await page.query_selector(sel)
                if el:
                    await el.click()
                    clicked = True
                    break
            except Exception:
                pass

        if not clicked:
            print(f"      AVISO: Item 'Download CSV' não encontrado para {metric_name}")
            return False

    download = await download_info.value
    save_path = DOWNLOAD_DIR / expected_filename
    await download.save_as(save_path)
    print(f"      Salvo: {save_path}")
    return True


async def process_pin(page, pin, pin_index, project_name):
    """Clica em um pin, vai para Análise Temporal e baixa os 4 CSVs."""
    metrics = ["Estoque", "Venda Líquida", "Preço Médio M²", "Preço Médio"]

    print(f"\n  Pin {pin_index}: clicando...")
    try:
        await pin.click()
        await page.wait_for_timeout(2000)
    except Exception as e:
        print(f"  Erro ao clicar no pin {pin_index}: {e}")
        return

    # Clica na aba "Análise Temporal"
    tab_selectors = [
        "text=Análise Temporal",
        "[class*='tab']:has-text('Análise Temporal')",
        "button:has-text('Análise Temporal')",
        "a:has-text('Análise Temporal')",
        "li:has-text('Análise Temporal')",
    ]

    tab_clicked = False
    for sel in tab_selectors:
        try:
            tab = await page.query_selector(sel)
            if tab:
                await tab.click()
                tab_clicked = True
                await page.wait_for_timeout(2000)
                break
        except Exception:
            pass

    if not tab_clicked:
        print(f"  AVISO: Aba 'Análise Temporal' não encontrada no pin {pin_index}")
        print("  Por favor, clique em 'Análise Temporal' manualmente e pressione ENTER.")
        input("  ENTER para continuar...")

    # Baixa CSV para cada métrica
    for metric in metrics:
        success = await download_csv_for_metric(page, metric, pin_index, project_name)
        if not success:
            print(f"  Download manual necessário para: {metric}")
        await page.wait_for_timeout(500)

    # Fecha o painel (ESC ou botão fechar)
    try:
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(1000)
    except Exception:
        pass


async def main():
    print("=" * 60)
    print("  Geobrain CSV Downloader")
    print("=" * 60)
    print(f"\nOs arquivos serão salvos em: {DOWNLOAD_DIR.absolute()}")

    chrome_profile = get_chrome_profile()
    print(f"\nUsando perfil Chrome: {chrome_profile}")

    if not os.path.exists(chrome_profile):
        print(f"\nAVISO: Perfil Chrome não encontrado em: {chrome_profile}")
        print("O script abrirá uma janela limpa — você precisará fazer login.")

    input("\nPressione ENTER para abrir o navegador...")

    async with async_playwright() as p:
        try:
            # Tenta usar o perfil existente do Chrome (já logado)
            context = await p.chromium.launch_persistent_context(
                user_data_dir=chrome_profile,
                headless=False,
                channel="chrome",
                args=["--no-first-run", "--no-default-browser-check"],
                accept_downloads=True,
                downloads_path=str(DOWNLOAD_DIR.absolute()),
            )
        except Exception as e:
            print(f"Não foi possível usar o Chrome instalado ({e}).")
            print("Tentando com Chromium padrão...")
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(DOWNLOAD_DIR / ".browser_profile"),
                headless=False,
                accept_downloads=True,
                downloads_path=str(DOWNLOAD_DIR.absolute()),
            )

        page = context.pages[0] if context.pages else await context.new_page()

        print("\nNavegando para geobrain.com.br/mapa...")
        await page.goto("https://geobrain.com.br/mapa", timeout=60000)
        await page.wait_for_timeout(5000)

        # Seleciona o projeto
        project_name = await select_project(page)
        await page.wait_for_timeout(3000)

        # Coleta os pins do mapa
        pins, pin_selector = await get_map_pins(page)

        if not pins:
            print("\nNão foi possível detectar os pins automaticamente.")
            print("Você precisará adaptar o script ou clicar manualmente.")
            input("Pressione ENTER para fechar...")
            await context.close()
            return

        print(f"\nTotal de pins encontrados: {len(pins)}")
        print("Iniciando processamento...\n")

        for i, pin in enumerate(pins, 1):
            await process_pin(page, pin, i, project_name)

        print("\n" + "=" * 60)
        print(f"Concluído! Arquivos salvos em: {DOWNLOAD_DIR.absolute()}")
        files = list(DOWNLOAD_DIR.glob("*.csv"))
        print(f"Total de arquivos CSV: {len(files)}")
        for f in sorted(files):
            print(f"  {f.name}")
        print("=" * 60)

        input("\nPressione ENTER para fechar o navegador...")
        await context.close()


if __name__ == "__main__":
    asyncio.run(main())
