const path = require('path');

/**
 * Configurações centralizadas da aplicação
 */
const CONFIG = {
  urlInicial: 'https://sidra.ibge.gov.br/',
  termoBuscaTabela: '1209',
  diretorioDados: path.resolve(__dirname, '../../dados'),
  nomeArquivoSaida: 'populacao_60mais_1209.csv',
  caminhoCompletoSaida: path.resolve(__dirname, '../../dados/populacao_60mais_1209.csv'),
  timeoutPadrao: 60000,
  viewport: { width: 1920, height: 1080 }
};

module.exports = CONFIG;
