const CONFIG = require('../config/config');
const { logProgresso } = require('../utils/logger');

/**
 * Page Object que encapsula os elementos e ações da Página Inicial do SIDRA/IBGE
 */
class SidraHomePage {
  /**
   * @param {import('playwright').Page} page
   */
  constructor(page) {
    this.page = page;
    
    // Seletores estáveis da Home
    this.botaoPesquisa = page.locator('a[data-target*="pesquisa"]:visible, i.glyphicon-search:visible').first();
    this.campoPesquisa = page.locator('#sidra-pesquisa-lg input, input[placeholder*="pesquisar" i]:visible').first();
  }

  /**
   * Acessa a página inicial obrigatória do SIDRA
   */
  async acessar() {
    logProgresso('1/6', `Acessando a página inicial obrigatória: ${CONFIG.urlInicial}`);
    await this.page.goto(CONFIG.urlInicial, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeouts.navegacao
    });
  }

  /**
   * Realiza a pesquisa interna pela interface e submete a consulta (C7, C8)
   * @param {string} termoBusca
   */
  async pesquisarTabela(termoBusca) {
    logProgresso('1/6', 'Acionando o campo de busca na interface do portal...');
    await this.botaoPesquisa.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    await this.botaoPesquisa.click();

    await this.campoPesquisa.waitFor({ state: 'visible', timeout: CONFIG.timeouts.elemento });
    logProgresso('1/6', `Preenchendo busca com "${termoBusca}" e enviando consulta...`);
    await this.campoPesquisa.fill(termoBusca);
    await this.campoPesquisa.press('Enter');

    // C7: Trocar waitForNavigation por waitForURL com regex estrito (C8)
    await this.page.waitForURL(/\/tabela\/1209\b/i, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeouts.navegacao
    });

    const urlAtual = this.page.url();
    if (!/\/tabela\/1209\b/i.test(urlAtual)) {
      throw new Error(
        `A busca não levou à Tabela 1209. URL atual: ${urlAtual}. ` +
        `Isso indica que o SIDRA passou a exibir uma página de resultados em vez de resolver direto.`
      );
    }

    logProgresso('1/6', `Tabela acessada com sucesso via interface de busca: ${urlAtual}`);
  }
}

module.exports = SidraHomePage;
