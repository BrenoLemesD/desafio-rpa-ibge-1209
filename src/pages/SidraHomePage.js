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
    logProgresso('1/5', `Acessando a página inicial obrigatória: ${CONFIG.urlInicial}`);
    await this.page.goto(CONFIG.urlInicial, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.timeoutPadrao
    });
  }

  /**
   * Realiza a pesquisa interna pela interface e submete a consulta
   * @param {string} termoBusca
   */
  async pesquisarTabela(termoBusca) {
    logProgresso('1/5', 'Acionando o campo de busca na interface do portal...');
    await this.botaoPesquisa.waitFor({ state: 'visible', timeout: 15000 });
    await this.botaoPesquisa.click();

    await this.campoPesquisa.waitFor({ state: 'visible', timeout: 10000 });
    logProgresso('1/5', `Preenchendo busca com "${termoBusca}" e enviando consulta...`);
    await this.campoPesquisa.fill(termoBusca);

    // Submissão da pesquisa e espera explícita pela navegação para a tabela
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: CONFIG.timeoutPadrao }),
      this.campoPesquisa.press('Enter')
    ]);

    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);

    const urlAtual = this.page.url();
    if (!urlAtual.toLowerCase().includes(termoBusca.toLowerCase())) {
      throw new Error(`A navegação pela busca não resultou na tabela esperada. URL atual: ${urlAtual}`);
    }

    logProgresso('1/5', `Tabela acessada com sucesso via interface de busca: ${urlAtual}`);
  }
}

module.exports = SidraHomePage;
