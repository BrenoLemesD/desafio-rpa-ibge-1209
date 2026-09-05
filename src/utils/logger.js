/**
 * Módulo de utilitários de log formatado no console
 */

function obterHoraAtual() {
  return new Date().toLocaleTimeString('pt-BR');
}

function logProgresso(etapa, mensagem) {
  console.log(`[${obterHoraAtual()}] [Etapa ${etapa}] ${mensagem}`);
}

function logSucesso(mensagem) {
  console.log(`[${obterHoraAtual()}] [SUCESSO] ${mensagem}`);
}

function logErro(mensagem, detalhe = '') {
  console.error(`[${obterHoraAtual()}] [ERRO] ${mensagem}`, detalhe);
}

module.exports = {
  logProgresso,
  logSucesso,
  logErro
};
