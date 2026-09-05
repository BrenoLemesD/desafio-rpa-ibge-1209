const CONFIG = require('../config/config');
const { logProgresso, logSucesso } = require('../utils/logger');

/**
 * Page Object que encapsula os elementos e ações da tela da Tabela 1209 do SIDRA/IBGE
 */
class Tabela1209Page {
  /**
   * @param {import('playwright').Page} page
   */
  constructor(page) {
    this.page = page;

    // Popups e Tutoriais
    this.botaoFecharTutorial = page.locator('button:has-text("Fim"), .popover button:has-text("Fim")');

    // Painel Territorial
    this.painelTerritorio = page.locator('#panel-T');
    this.itemBrasilCheck = page.locator('#arvore-355e-1 > .item-arvore .sidra-check').first();
    this.botaoToggleBrasil = page.locator('#arvore-355e-1 > .item-arvore .sidra-toggle').first();
    this.botaoToggleUF = page.locator('#arvore-435e-1 > .item-arvore .sidra-toggle').first();

    // Painel Grupo de Idade (C58)
    this.painelIdade = page.locator('#panel-C58');
    this.botaoDesmarcarTodosIdade = page.locator('#panel-C58 button[title="Desmarcar todos os elementos listados"]').first();
    this.item60a69Toggle = page.locator('#panel-C58 .sidra-check:has-text("60 a 69 anos") button.sidra-toggle').first();
    this.item70maisToggle = page.locator('#panel-C58 .sidra-check:has-text("70 anos ou mais") button.sidra-toggle').first();
    this.botaoSomarElementos = page.locator('#panel-C58 button[title="Somar elementos"]').first();

    // Painel Ano / Período (P)
    this.painelAno = page.locator('#panel-P');
    this.linkAnoMaisRecente = page.locator('#panel-P a:has-text("Mais recente")').first();

    // Painel e Ações de Download
    this.botaoDownloads = page.locator('#botao-downloads').first();
    this.selectFormatoArquivo = page.locator('#download-form select[name="formato-arquivo"]').first();
    this.botaoConfirmarDownload = page.locator('#opcao-downloads').first();
  }

  /**
   * Fecha popovers ou tutoriais iniciais caso estejam bloqueando a interface
   */
  async fecharTutoriaisSeExistirem() {
    try {
      if (await this.botaoFecharTutorial.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.botaoFecharTutorial.click();
        logProgresso('2/5', 'Popup de tutorial do SIDRA fechado.');
      }
    } catch {
      // Segue sem travar caso não exista popup
    }
  }

  /**
   * Desmarca o totalizador Brasil e seleciona todas as 27 Unidades da Federação
   */
  async configurarRecorteTerritorialUFs() {
    logProgresso('2/5', 'Configurando Recorte Territorial (Unidades da Federação)...');
    await this.painelTerritorio.waitFor({ state: 'visible', timeout: 20000 });

    // Desmarcar nível 'Brasil' (marcado por padrão)
    const isBrasilMarcado = await this.itemBrasilCheck.evaluate(el => el.classList.contains('checked')).catch(() => false);
    if (isBrasilMarcado) {
      await this.botaoToggleBrasil.click();
      logProgresso('2/5', 'Seleção padrão de "Brasil" desmarcada.');
    }

    // Marcar 'Unidade da Federação' (seleciona as 27 UFs)
    await this.botaoToggleUF.waitFor({ state: 'visible', timeout: 10000 });
    await this.botaoToggleUF.click();

    // Espera explícita pelo contador [27/27]
    await this.page.waitForFunction(() => {
      const contador = document.querySelector('#arvore-435e-1 .contador');
      return contador && contador.textContent.includes('27/27');
    }, { timeout: 15000 }).catch(() => null);

    logProgresso('2/5', 'Todas as 27 Unidades da Federação selecionadas.');
  }

  /**
   * Configura o grupo etário para 60 anos ou mais, selecionando 60-69 e 70+ e consolidando via Soma
   */
  async configurarGrupoIdade60MaisComSoma() {
    logProgresso('3/5', 'Configurando Grupo de Idade (60 anos ou mais)...');
    await this.painelIdade.waitFor({ state: 'visible', timeout: 20000 });

    // Limpar seleção padrão ("Total")
    await this.botaoDesmarcarTodosIdade.click();

    // Selecionar faixas correspondentes
    await this.item60a69Toggle.waitFor({ state: 'visible', timeout: 10000 });
    await this.item60a69Toggle.click();

    await this.item70maisToggle.waitFor({ state: 'visible', timeout: 10000 });
    await this.item70maisToggle.click();

    // Consolidar somando as duas faixas
    await this.botaoSomarElementos.click();
    logProgresso('3/5', 'Grupos "60 a 69 anos" e "70 anos ou mais" selecionados e consolidados via Soma.');
  }

  /**
   * Configura o período mais recente disponível
   */
  async configurarAnoMaisRecente() {
    logProgresso('3/5', 'Configurando Período / Ano mais recente...');
    await this.painelAno.waitFor({ state: 'visible', timeout: 20000 });

    if (await this.linkAnoMaisRecente.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.linkAnoMaisRecente.click();
    }
    logProgresso('3/5', 'Ano mais recente configurado com sucesso.');
  }

  /**
   * Aciona o modal de download, seleciona formato CSV e captura o arquivo
   * @param {string} caminhoDestino
   */
  async baixarArquivoCsv(caminhoDestino) {
    logProgresso('4/5', 'Abrindo opções de Download da tabela...');
    await this.botaoDownloads.waitFor({ state: 'visible', timeout: 15000 });
    await this.botaoDownloads.click();

    await this.selectFormatoArquivo.waitFor({ state: 'visible', timeout: 15000 });
    await this.selectFormatoArquivo.selectOption({ value: 'br.csv' });
    logProgresso('4/5', 'Formato de exportação configurado para CSV (BR).');

    logProgresso('4/5', 'Iniciando o download do arquivo CSV...');
    await this.botaoConfirmarDownload.waitFor({ state: 'visible', timeout: 15000 });

    // Captura segura e assíncrona do evento de download disparado pelo clique
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: CONFIG.timeoutPadrao }),
      this.botaoConfirmarDownload.click()
    ]);

    try {
      await download.saveAs(caminhoDestino);
      logSucesso(`Download concluído e arquivo salvo em: ${caminhoDestino}`);
    } catch (errSave) {
      if (errSave.code === 'EBUSY' || errSave.message.includes('EBUSY') || errSave.message.includes('locked')) {
        throw new Error(
          `O arquivo "${caminhoDestino}" está aberto em outro aplicativo (como o Microsoft Excel), impedindo a gravação. ` +
          `Por favor, feche o arquivo no Excel e tente novamente.`
        );
      }
      throw errSave;
    }
  }
}

module.exports = Tabela1209Page;
