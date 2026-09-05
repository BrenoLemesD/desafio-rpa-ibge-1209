/**
 * Aguarda uma condição avaliada no contexto do browser e falha com mensagem de negócio.
 * Envolve page.waitForFunction para que o erro diga o que quebrou, não só "Timeout exceeded".
 */
async function esperarCondicao(page, predicado, { timeout = 15000, mensagem, arg } = {}) {
  try {
    await page.waitForFunction(predicado, arg, { timeout });
  } catch {
    throw new Error(`A interface do SIDRA não atingiu o estado esperado: ${mensagem}.`);
  }
}

module.exports = { esperarCondicao };
