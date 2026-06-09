# Geobrain CSV Downloader

Script para baixar automaticamente os CSVs de Análise Temporal do Geobrain.

## Pré-requisitos

```bash
pip install playwright
playwright install chrome
```

## Como usar

1. **Feche todas as janelas do Google Chrome** (o script precisa acessar o perfil)
2. Execute:
   ```bash
   python geobrain_download.py
   ```
3. O navegador abre com sua sessão já logada
4. O script lista os projetos disponíveis — você escolhe qual
5. Aguarde: ele clica em cada pin, vai em "Análise Temporal" e baixa os 4 CSVs

## Arquivos gerados

Salvos na pasta `geobrain_csvs/`:
```
pin1_NomeProjeto_Estoque.csv
pin1_NomeProjeto_Venda_Líquida.csv
pin1_NomeProjeto_Preço_Médio_M2.csv
pin1_NomeProjeto_Preço_Médio.csv
pin2_NomeProjeto_Estoque.csv
...
```

## Problemas comuns

- **"Perfil Chrome não encontrado"**: O script tenta detectar automaticamente. Se falhar, ele abre uma janela limpa e você faz login manualmente.
- **Pins não detectados**: O mapa usa uma biblioteca específica — se o script não detectar os pins, ele avisa e você clica manualmente enquanto o script continua.
- **Download não disparado**: Verifique se o popup do gráfico está aberto antes de clicar no botão de 3 linhas.
