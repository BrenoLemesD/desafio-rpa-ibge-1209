/**
 * Desafio Técnico – Automação RPA (SIDRA / IBGE)
 * Tabela 1209: População por grupos de idade (60 anos ou mais por UF)
 * 
 * Arquitetura: Page Object Model (POM)
 * Execução: node desafio_ibge_1209.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const CONFIG = require('./src/config/config');
const { logSucesso, logErro } = require('./src/utils/logger');
const { garantirDiretorioDestino, validarArquivoCsv } = require('./src/utils/fileValidator');
const SidraHomePage = require('./src/pages/SidraHomePage');
const Tabela1209Page = require('./src/pages/Tabela1209Page');

function imprimirCabecalho() {
  console.log('====================================================');
  console.log('  INICIANDO AUTOMAÇÃO RPA - SIDRA/IBGE TABELA 1209  ');
  console.log('  Arquitetura: Page Object Model (POM)              ');
  console.log('====================================================');
}

function imprimirRodape() {
  console.log('====================================================');
  console.log('             FIM DO PROCESSO DE AUTOMAÇÃO           ');
  console.log('====================================================');
}

/**
 * Salva artefatos de diagnóstico (screenshot + HTML completo) em caso de falha (C10, C12)
 */
async function salvarDiagnostico(page) {
  try {
    fs.mkdirSync(CONFIG.diretorioDiagnostico, { recursive: true });
    const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
    const caminhoScreenshot = path.join(CONFIG.diretorioDiagnostico, `erro-${carimbo}.png`);
    const caminhoHtml = path.join(CONFIG.diretorioDiagnostico, `erro-${carimbo}.html`);

    await page.screenshot({ path: caminhoScreenshot, fullPage: true });
    fs.writeFileSync(caminhoHtml, await page.content(), 'utf8');
    console.log(`[DIAGNÓSTICO] Artefatos salvos em: ${CONFIG.diretorioDiagnostico}`);
  } catch {
    // Diagnóstico é best-effort: nunca deve mascarar o erro original
  }
}

/**
 * Orquestrador principal do fluxo de automação (C6)
 */
async function main() {
  imprimirCabecalho();
  garantirDiretorioDestino();

  const isHeaded = process.argv.includes('--headed');
  let browser;
  let context;
  let page;

  try {
    // Proteger inicialização do browser dentro do try (C6)
    browser = await chromium.launch({
      headless: !isHeaded,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    context = await browser.newContext({
      viewport: CONFIG.viewport,
      acceptDownloads: true
    });

    // Iniciar rastreamento de execução (trace) do Playwright (C10)
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    page = await context.newPage();
    page.setDefaultTimeout(CONFIG.timeouts.elemento);

    const homePage = new SidraHomePage(page);
    const tabelaPage = new Tabela1209Page(page);

    // Fluxo ordenado
    await homePage.acessar();
    await homePage.pesquisarTabela(CONFIG.termoBuscaTabela);
    await tabelaPage.fecharTutoriaisSeExistirem();
    await tabelaPage.configurarRecorteTerritorialUFs();
    await tabelaPage.configurarGrupoIdade60MaisComSoma();
    await tabelaPage.configurarAnoMaisRecente();
    await tabelaPage.baixarArquivoCsv(CONFIG.caminhoCompletoSaida);

    // Validação estrita dos dados
    validarArquivoCsv(CONFIG.caminhoCompletoSaida);

    logSucesso('Fluxo completo executado com sucesso.');
    process.exitCode = 0;
  } catch (erro) {
    if (/Executable doesn't exist/.test(erro.message)) {
      logErro('O navegador do Playwright não está instalado. Execute: npx playwright install chromium');
    } else {
      logErro('Falha durante a execução da automação:', erro.message || erro);
    }

    if (page && !page.isClosed()) {
      await salvarDiagnostico(page);
    }

    process.exitCode = 1;
  } finally {
    if (context) {
      await context.tracing.stop({
        path: path.join(CONFIG.diretorioDiagnostico, 'trace.zip')
      }).catch(() => null);
    }
    await context?.close().catch(() => null);
    await browser?.close().catch(() => null);
    imprimirRodape();
  }
}

// Execução imediata protegendo rejeições não capturadas (C6)
if (require.main === module) {
  main().catch((erro) => {
    logErro('Erro fatal não tratado:', erro?.stack || erro);
    process.exit(1);
  });
}

module.exports = { main };
