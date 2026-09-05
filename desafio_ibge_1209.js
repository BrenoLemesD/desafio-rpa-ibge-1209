/**
 * Desafio Técnico – Automação RPA (SIDRA / IBGE)
 * Tabela 1209: População por grupos de idade (60 anos ou mais por UF)
 * 
 * Arquitetura: Page Object Model (POM)
 * Execução: node desafio_ibge_1209.js
 */

const { chromium } = require('playwright');
const path = require('path');
const CONFIG = require('./src/config/config');
const { logSucesso, logErro } = require('./src/utils/logger');
const { garantirDiretorioDestino, validarArquivoCsv } = require('./src/utils/fileValidator');
const SidraHomePage = require('./src/pages/SidraHomePage');
const Tabela1209Page = require('./src/pages/Tabela1209Page');

/**
 * Orquestrador principal do fluxo de automação
 */
async function main() {
  console.log('====================================================');
  console.log('  INICIANDO AUTOMAÇÃO RPA - SIDRA/IBGE TABELA 1209  ');
  console.log('  Arquitetura: Page Object Model (POM)              ');
  console.log('====================================================');

  // 1. Garantir que a pasta 'dados/' exista
  garantirDiretorioDestino();

  // Suporte a modo headless configurável via linha de comando (--headed)
  const isHeaded = process.argv.includes('--headed');
  const browser = await chromium.launch({
    headless: !isHeaded,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    // 2. Instanciação dos Page Objects
    const homePage = new SidraHomePage(page);
    const tabelaPage = new Tabela1209Page(page);

    // 3. Navegação inicial e descoberta via interface de busca
    await homePage.acessar();
    await homePage.pesquisarTabela(CONFIG.termoBuscaTabela);

    // 4. Configuração dos parâmetros analíticos na Tabela 1209
    await tabelaPage.fecharTutoriaisSeExistirem();
    await tabelaPage.configurarRecorteTerritorialUFs();
    await tabelaPage.configurarGrupoIdade60MaisComSoma();
    await tabelaPage.configurarAnoMaisRecente();

    // 5. Download nativo em CSV para o caminho exato
    await tabelaPage.baixarArquivoCsv(CONFIG.caminhoCompletoSaida);

    // 6. Validação do arquivo CSV gerado
    validarArquivoCsv(CONFIG.caminhoCompletoSaida);

    logSucesso('Fluxo completo executado com 100% de sucesso!');
    process.exitCode = 0;
  } catch (erro) {
    logErro('Falha durante a execução da automação:', erro.message || erro);

    // Diagnóstico automático com captura de screenshot
    try {
      const caminhoPrintErro = path.join(CONFIG.diretorioDados, 'erro_execucao.png');
      await page.screenshot({ path: caminhoPrintErro, fullPage: true });
      console.log(`[DIAGNÓSTICO] Screenshot de erro salva em: ${caminhoPrintErro}`);
    } catch {
      // Ignora erro ao salvar screenshot
    }

    process.exitCode = 1;
  } finally {
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
    console.log('====================================================');
    console.log('             FIM DO PROCESSO DE AUTOMAÇÃO           ');
    console.log('====================================================');
  }
}

// Execução imediata via CLI
if (require.main === module) {
  main();
}

module.exports = { main };
