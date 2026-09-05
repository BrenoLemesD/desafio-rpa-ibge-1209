const CONFIG = require('../config/config');
const SELETORES = require('../config/seletores');
const { esperarCondicao } = require('../utils/espera');
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
    this.itemBrasilCheck = page.locator(`${SELETORES.arvoreBrasil} .sidra-check`).first();
    this.botaoToggleBrasil = page.locator(`${SELETORES.arvoreBrasil} .sidra-toggle`).first();
    this.botaoToggleUF = page.locator(`${SELETORES.arvoreUF} .sidra-toggle`).first();

    // Painel Grupo de Idade (C58)
    this.painelIdade = page.locator('#panel-C58');
    this.botaoDesmarcarTodosIdade = page.locator('#panel-C58 button[title="Desmarcar todos os elementos listados"]').first();
    this.item60a69Toggle = page.locator('#panel-C58 .sidra-check:has-text("60 a 69 anos") button.sidra-toggle').first();
    this.item70maisToggle = page.locator('#panel-C58 .sidra-check:has-text("70 anos ou mais") button.sidra-toggle').first();
    this.botaoSomarElementos = page.locator('#panel-C58 button[title="Somar elementos"]').first();

    // Painel Ano / Período (P)
    this.painelAno = page.locator('#panel-P');
    this.linkAnoMaisRecente = page.locator('#panel-P .sidra-check').first();

    // Painel e Ações de Download
    this.botaoDownloads = page.locator('#botao-downloads').first();
    this.selectFormatoArquivo = page.locator('#download-form select[name="formato-arquivo"]').first();
    this.botaoConfirmarDownload = page.locator('#opcao-downloads').first();

    this.anoSelecionado = null;
  }

  /**
   * Fecha popovers ou tutoriais iniciais caso estejam bloqueando a interface (C3)
   */
  async fecharTutoriaisSeExistirem() {
    try {
      await this.botaoFecharTutorial.first().waitFor({
        state: 'visible',
        timeout: CONFIG.timeouts.popover
      });
    } catch {
      logProgresso('2/6', 'Nenhum popover de tutorial detectado.');
      return;
    }

    await this.botaoFecharTutorial.first().click();
    await this.botaoFecharTutorial.first().waitFor({ state: 'hidden', timeout: CONFIG.timeouts.popover });
    logProgresso('2/6', 'Popover de tutorial do SIDRA fechado.');
  }

  /**
   * Desmarca o totalizador Brasil e seleciona todas as 27 Unidades da Federação (C1, C2)
   */
  async configurarRecorteTerritorialUFs() {
    logProgresso('2/6', 'Configurando Recorte Territorial (Unidades da Federação)...');
    await this.painelTerritorio.waitFor({ state: 'visible', timeout: CONFIG.timeouts.painel });

    // Sem este nó não há como garantir que "Brasil" saiu do recorte: deve falhar alto se não existir (C1)
    await this.itemBrasilCheck.waitFor({ state: 'attached', timeout: CONFIG.timeouts.elemento });

    const brasilMarcado = await this.itemBrasilCheck.evaluate(el => el.classList.contains('checked'));
    if (brasilMarcado) {
      await this.botaoToggleBrasil.click();
      await esperarCondicao(
        this.page,
        (sel) => {
          const el = document.querySelector(`${sel} .sidra-check`);
          return el && !el.classList.contains('checked');
        },
        {
          arg: SELETORES.arvoreBrasil,
          timeout: CONFIG.timeouts.estado,
          mensagem: 'o totalizador "Brasil" continuou marcado após o clique'
        }
      );
      logProgresso('2/6', 'Seleção padrão de "Brasil" desmarcada.');
    } else {
      logProgresso('2/6', 'Totalizador "Brasil" já estava desmarcado.');
    }

    // Marcar 'Unidade da Federação' (C2: espera com trava real, sem engolir erro)
    await this.botaoToggleUF.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    await this.botaoToggleUF.click();

    await esperarCondicao(
      this.page,
      (sel) => {
        const contador = document.querySelector(sel);
        return !!contador && contador.textContent.includes('27/27');
      },
      {
        arg: SELETORES.contadorUF,
        timeout: CONFIG.timeouts.estado,
        mensagem: 'o contador de Unidades da Federação não chegou a 27/27'
      }
    );

    logProgresso('2/6', 'Todas as 27 Unidades da Federação selecionadas.');
  }

  /**
   * Configura o grupo etário para 60 anos ou mais, selecionando 60-69 e 70+ e consolidando via Soma (C4)
   */
  async configurarGrupoIdade60MaisComSoma() {
    logProgresso('3/6', 'Configurando Grupo de Idade (60 anos ou mais)...');
    await this.painelIdade.waitFor({ state: 'visible', timeout: CONFIG.timeouts.painel });

    // Limpar seleção padrão ("Total")
    await this.botaoDesmarcarTodosIdade.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    await this.botaoDesmarcarTodosIdade.click();

    // Selecionar faixas correspondentes
    for (const [rotulo, toggle] of [['60 a 69 anos', this.item60a69Toggle], ['70 anos ou mais', this.item70maisToggle]]) {
      await toggle.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
      await toggle.click();
      logProgresso('3/6', `Faixa "${rotulo}" marcada.`);
    }

    // Confirmar que exatamente 2 faixas estão marcadas antes de somar
    const marcadas = await this.page.locator(SELETORES.painelIdadeCheckMarcados).count();
    if (marcadas !== 2) {
      throw new Error(`Esperava 2 faixas etárias marcadas antes da soma, mas encontrei ${marcadas}.`);
    }

    // Consolidar somando as duas faixas
    await this.botaoSomarElementos.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    await this.botaoSomarElementos.click();

    await esperarCondicao(
      this.page,
      () => {
        const btn = document.querySelector('#panel-C58 button[title="Somar elementos"]');
        const painel = document.querySelector('#panel-C58');
        const isBtnAtivo = btn && btn.classList.contains('active');
        const temTituloSoma = painel && painel.innerText.includes('Grupo de idade - Soma');
        return isBtnAtivo || temTituloSoma;
      },
      {
        timeout: CONFIG.timeouts.estado,
        mensagem: 'a consolidação por soma das faixas "60 a 69" e "70 ou mais" não foi ativada na interface'
      }
    );

    logProgresso('3/6', 'Faixas consolidadas via Soma em um único grupo 60+.');
  }

  /**
   * Configura o período mais recente disponível e valida a seleção (C4)
   */
  async configurarAnoMaisRecente() {
    logProgresso('4/6', 'Configurando Período / Ano mais recente...');
    await this.painelAno.waitFor({ state: 'visible', timeout: CONFIG.timeouts.painel });

    await this.linkAnoMaisRecente.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });

    // Garante que o ano mais recente esteja marcado
    const isMarcado = await this.linkAnoMaisRecente.evaluate(el => el.classList.contains('checked')).catch(() => false);
    if (!isMarcado) {
      const toggle = this.linkAnoMaisRecente.locator('.sidra-toggle').first();
      await toggle.click();
    }

    // Confirma que exatamente um período ficou selecionado e devolve qual é
    const anoSelecionado = await this.page.evaluate((sel) => {
      const marcados = [...document.querySelectorAll(sel)];
      if (marcados.length !== 1) return null;
      const texto = marcados[0].textContent.trim();
      const match = texto.match(/\b\d{4}\b/);
      return match ? match[0] : null;
    }, SELETORES.painelAnoCheckMarcados);

    if (!anoSelecionado || !/^\d{4}$/.test(anoSelecionado)) {
      throw new Error(
        `Esperava exatamente um ano selecionado no painel de Período, mas o estado ficou "${anoSelecionado}". ` +
        `Sem isso o CSV conteria todos os censos históricos.`
      );
    }

    this.anoSelecionado = anoSelecionado;
    logProgresso('4/6', `Período configurado: ${anoSelecionado}.`);
  }

  /**
   * Aciona o modal de download, seleciona formato CSV e captura o arquivo
   * @param {string} caminhoDestino
   */
  async baixarArquivoCsv(caminhoDestino) {
    logProgresso('5/6', 'Abrindo opções de Download da tabela...');
    await this.botaoDownloads.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    await this.botaoDownloads.click();

    await this.selectFormatoArquivo.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    await this.selectFormatoArquivo.selectOption({ value: 'br.csv' });
    logProgresso('5/6', 'Formato de exportação configurado para CSV (BR).');

    logProgresso('5/6', 'Iniciando o download do arquivo CSV...');
    await this.botaoConfirmarDownload.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });

    // Captura do evento de download assíncrono do navegador
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: CONFIG.timeouts.download }),
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
