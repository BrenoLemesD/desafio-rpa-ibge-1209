const path = require('path');

/**
 * Configurações centralizadas da aplicação
 */
const CONFIG = {
  urlInicial: 'https://sidra.ibge.gov.br/',
  termoBuscaTabela: '1209',
  diretorioDados: path.resolve(__dirname, '../../dados'),
  diretorioDiagnostico: path.resolve(__dirname, '../../diagnostico'),
  nomeArquivoSaida: 'populacao_60mais_1209.csv',
  caminhoCompletoSaida: path.resolve(__dirname, '../../dados/populacao_60mais_1209.csv'),
  anoEsperado: null,   // null = aceita qualquer ano de 4 dígitos; ex.: '2022'
  timeouts: {
    navegacao: 60000,   // carga de página
    painel: 20000,      // painéis de filtro do SIDRA
    elemento: 15000,    // elemento individual acionável
    estado: 15000,      // confirmação de mudança de estado após clique
    popover: 5000,      // tutorial: ausência é legítima, teto curto
    download: 60000     // geração do CSV no backend do IBGE
  },
  viewport: { width: 1920, height: 1080 }
};

module.exports = CONFIG;
