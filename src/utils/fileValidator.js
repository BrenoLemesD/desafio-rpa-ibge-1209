const fs = require('fs');
const CONFIG = require('../config/config');
const { logProgresso, logSucesso } = require('./logger');

const UFS_ESPERADAS = [
  'Rondônia', 'Acre', 'Amazonas', 'Roraima', 'Pará', 'Amapá', 'Tocantins',
  'Maranhão', 'Piauí', 'Ceará', 'Rio Grande do Norte', 'Paraíba', 'Pernambuco',
  'Alagoas', 'Sergipe', 'Bahia', 'Minas Gerais', 'Espírito Santo',
  'Rio de Janeiro', 'São Paulo', 'Paraná', 'Santa Catarina', 'Rio Grande do Sul',
  'Mato Grosso do Sul', 'Mato Grosso', 'Goiás', 'Distrito Federal'
];

const RE_LINHA = /^"([^"]*)";"([^"]*)"$/;

/**
 * Garante que a pasta de destino exista no sistema de arquivos
 */
function garantirDiretorioDestino() {
  if (!fs.existsSync(CONFIG.diretorioDados)) {
    fs.mkdirSync(CONFIG.diretorioDados, { recursive: true });
    logProgresso('0/6', `Diretório criado: ${CONFIG.diretorioDados}`);
  }
}

/**
 * Isola o bloco de dados do CSV do SIDRA, ignorando cabeçalho, Fonte, Notas e Legenda.
 */
function extrairBlocoDeDados(conteudo) {
  const linhas = conteudo.replace(/^\uFEFF/, '').split(/\r?\n/);

  const idxCabecalho = linhas.findIndex(l => l.includes(';"Ano x Grupo de idade"'));
  const idxFonte = linhas.findIndex(l => l.startsWith('"Fonte:'));

  if (idxCabecalho === -1) {
    throw new Error('CSV inesperado: não encontrei o cabeçalho "Ano x Grupo de idade".');
  }
  if (idxFonte === -1 || idxFonte <= idxCabecalho) {
    throw new Error('CSV inesperado: não encontrei a linha "Fonte:" que encerra o bloco de dados.');
  }

  // Uma única coluna de dado => o cabeçalho tem exatamente 2 campos separados por ";"
  const colunas = linhas[idxCabecalho].split('";"').length;
  if (colunas !== 2) {
    throw new Error(
      `Esperava 1 coluna de dado (grupo 60+ consolidado), mas o CSV tem ${colunas - 1}. ` +
      `A soma das faixas "60 a 69" e "70 ou mais" provavelmente não foi aplicada.`
    );
  }

  const rotuloDimensao = RE_LINHA.exec(linhas[idxCabecalho])?.[1] ?? '';
  const ano = RE_LINHA.exec(linhas[idxCabecalho + 1] ?? '')?.[2] ?? '';

  const registros = linhas
    .slice(idxCabecalho + 1, idxFonte)
    .map(l => RE_LINHA.exec(l))
    .filter(m => m && m[1] !== rotuloDimensao && m[1].trim().length > 0)
    .map(m => ({ rotulo: m[1], valor: m[2] }));

  return { rotuloDimensao, ano, registros };
}

/**
 * Validação rigorosa dos dados do CSV conforme os requisitos de negócio
 */
function validarArquivoCsv(caminhoArquivo) {
  logProgresso('6/6', 'Validando integridade e conteúdo do arquivo CSV gerado...');

  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado no caminho esperado: ${caminhoArquivo}`);
  }

  const estatisticas = fs.statSync(caminhoArquivo);
  if (estatisticas.size === 0) {
    throw new Error('O arquivo CSV gerado está vazio (0 bytes).');
  }

  const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');

  if (!conteudo.includes('Tabela 1209')) {
    throw new Error('O CSV não é da Tabela 1209.');
  }

  const { rotuloDimensao, ano, registros } = extrairBlocoDeDados(conteudo);

  // 1. Ano único e plausível
  if (!/^\d{4}$/.test(ano)) {
    throw new Error(`Esperava um único ano de 4 dígitos no cabeçalho, mas encontrei "${ano}".`);
  }
  if (CONFIG.anoEsperado && ano !== CONFIG.anoEsperado) {
    throw new Error(`Esperava o ano ${CONFIG.anoEsperado}, mas o CSV veio com ${ano}.`);
  }

  // 2. Nenhum totalizador contaminando o recorte por UF
  const totalizadores = registros.filter(r => /^(Brasil|Região|Norte|Nordeste|Sudeste|Sul|Centro-Oeste|Total)/i.test(r.rotulo));
  if (totalizadores.length > 0) {
    throw new Error(
      `O CSV contém totalizadores que deveriam estar desmarcados: ${totalizadores.map(t => t.rotulo).join(', ')}. ` +
      `Dimensão declarada no arquivo: "${rotuloDimensao}".`
    );
  }

  // 3. Exatamente as 27 UFs, sem faltar nem sobrar
  const encontradas = registros.map(r => r.rotulo);
  const faltando = UFS_ESPERADAS.filter(uf => !encontradas.includes(uf));
  const inesperadas = encontradas.filter(uf => !UFS_ESPERADAS.includes(uf));

  if (faltando.length || inesperadas.length || registros.length !== 27) {
    throw new Error(
      `Recorte territorial incorreto: ${registros.length} registros (esperados 27). ` +
      `Faltando: [${faltando.join(', ') || 'nenhuma'}]. Inesperados: [${inesperadas.join(', ') || 'nenhum'}].`
    );
  }

  // 4. Valores numéricos positivos
  const invalidos = registros.filter(r => !/^\d+$/.test(r.valor) || Number(r.valor) <= 0);
  if (invalidos.length > 0) {
    throw new Error(`Valores não numéricos ou não positivos: ${invalidos.map(i => `${i.rotulo}="${i.valor}"`).join(', ')}`);
  }

  const total = registros.reduce((soma, r) => soma + Number(r.valor), 0);

  logSucesso('Validação concluída com êxito!');
  console.log('--------------------------------------------------');
  console.log('Resumo da Execução:');
  console.log(`- Arquivo .............: ${caminhoArquivo}`);
  console.log(`- Tamanho .............: ${(estatisticas.size / 1024).toFixed(2)} KB`);
  console.log(`- Ano de referência ...: ${ano}`);
  console.log(`- UFs validadas .......: ${registros.length}/27`);
  console.log(`- População 60+ (BR) ..: ${total.toLocaleString('pt-BR')} pessoas`);
  console.log('--------------------------------------------------');
}

module.exports = {
  garantirDiretorioDestino,
  validarArquivoCsv
};
