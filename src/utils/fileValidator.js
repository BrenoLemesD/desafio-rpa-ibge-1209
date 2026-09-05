const fs = require('fs');
const path = require('path');
const CONFIG = require('../config/config');
const { logProgresso, logSucesso } = require('./logger');

/**
 * Garante que a pasta de destino exista no sistema de arquivos
 */
function garantirDiretorioDestino() {
  if (!fs.existsSync(CONFIG.diretorioDados)) {
    fs.mkdirSync(CONFIG.diretorioDados, { recursive: true });
    logProgresso('0/5', `Diretório criado: ${CONFIG.diretorioDados}`);
  }
}

/**
 * Valida se o CSV foi gerado com sucesso, conferindo existência, tamanho e conteúdo
 */
function validarArquivoCsv(caminhoArquivo) {
  logProgresso('5/5', 'Validando integridade do arquivo CSV gerado...');

  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado no caminho esperado: ${caminhoArquivo}`);
  }

  const estatisticas = fs.statSync(caminhoArquivo);
  if (estatisticas.size === 0) {
    throw new Error('O arquivo CSV gerado está vazio (0 bytes).');
  }

  const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
  const linhas = conteudo.split('\n').filter(l => l.trim().length > 0);

  // Verificação de consistência estatística
  const contemTabela1209 = conteudo.includes('1209');
  const contemRondonia = conteudo.includes('Rondônia');
  const contemSaoPaulo = conteudo.includes('São Paulo');

  if (!contemTabela1209 || !contemRondonia || !contemSaoPaulo) {
    throw new Error('O arquivo CSV gerado não contém os dados esperados da Tabela 1209 ou das UFs.');
  }

  logSucesso('Validação concluída com êxito!');
  console.log('--------------------------------------------------');
  console.log('Resumo da Execução:');
  console.log(`- Arquivo: ${caminhoArquivo}`);
  console.log(`- Tamanho: ${(estatisticas.size / 1024).toFixed(2)} KB`);
  console.log(`- Total de linhas: ${linhas.length}`);
  console.log('--------------------------------------------------');
}

module.exports = {
  garantirDiretorioDestino,
  validarArquivoCsv
};
