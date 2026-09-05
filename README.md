# Desafio Técnico – Automação RPA (SIDRA / IBGE)

Automação RPA desenvolvida em **Node.js** com a biblioteca **Playwright**, estruturada no padrão de arquitetura **Page Object Model (POM)** com garantias estritas de integridade, validação de dados e tolerância a falhas.

O robô automatiza a extração dos dados demográficos da **Tabela 1209** no portal oficial do **SIDRA/IBGE**, descobrindo a tabela exclusivamente pela ferramenta de busca interna, configurando o recorte da população de **60 anos ou mais por Unidade da Federação (UF)** para o ano mais recente disponível na plataforma (atualmente Censo 2022) e gerando o arquivo padronizado em `dados/populacao_60mais_1209.csv`.

---

## 📑 Índice (Index)

1. [1. Passo a passo de execução](#1-passo-a-passo-de-execução)
2. [2. Dependências necessárias](#2-dependências-necessárias)
3. [3. Estratégia adotada](#3-estratégia-adotada)
4. [4. Principais desafios encontrados](#4-principais-desafios-encontrados)
5. [5. Objetivo do projeto](#5-objetivo-do-projeto)
6. [6. Diretrizes e regras atendidas](#6-diretrizes-e-regras-atendidas)
7. [7. Arquitetura do projeto (Page Object Model)](#7-arquitetura-do-projeto-page-object-model)
8. [8. Validação automática de integridade do CSV](#8-validação-automática-de-integridade-do-csv)

---

## 1. Passo a passo de execução

### Pré-requisito
Certifique-se de ter o **Node.js** (versão 18 ou superior) instalado em sua máquina.

### Etapa 1: Clonar o Repositório
```bash
git clone https://github.com/BrenoLemesD/desafio-rpa-ibge-1209.git
cd desafio-rpa-ibge-1209
```

### Etapa 2: Instalar Dependências e Navegador
Instale os pacotes do projeto e baixe os binários do Chromium necessários para o Playwright:
```bash
npm install
npx playwright install chromium
```

### Etapa 3: Executar a Automação

* **Execução Direta via Node (Conforme especificado no Desafio):**
  ```bash
  node desafio_ibge_1209.js
  ```

* **Execução via Scripts NPM:**
  - **Modo Padrão (Headless - segundo plano):**
    ```bash
    npm start
    ```
  - **Modo Visual (Headed - com navegador visível na tela):**
    ```bash
    npm run start:headed
    ```
    *ou diretamente:*
    ```bash
    node desafio_ibge_1209.js --headed
    ```

Após a execução, o arquivo final estará gerado e validado em:
```
dados/populacao_60mais_1209.csv
```

---

## 2. Dependências necessárias

| Dependência | Versão Mínima | Finalidade no Projeto |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | Ambiente de execução JavaScript no servidor |
| **Playwright** | `^1.63.0` | Framework de automação de navegador com suporte a CDP, tracing e downloads assíncronos |
| **Chromium Browser** | (Instalado via Playwright) | Binário do navegador utilizado para executar a automação de interface |

*Nota: O projeto utiliza apenas a biblioteca oficial do Playwright e módulos nativos do Node.js (`fs`, `path`), mantendo a árvore de dependências leve, limpa e segura.*

---

## 3. Estratégia adotada

A automação foi planejada para simular com fidelidade as ações de um usuário humano na interface, atendendo a 100% das restrições do desafio com máxima resiliência:

1. **Descoberta Orgânica da Tabela pela Busca:**
   - O robô inicia obrigatoriamente na URL raiz (`https://sidra.ibge.gov.br/`).
   - Localiza o botão da lupa de pesquisa no cabeçalho.
   - Preenche o termo `"1209"` e envia a tecla `Enter`.
   - Utiliza `page.waitForURL(/\/tabela\/1209\b/i)` para assegurar que a navegação interna do portal atingiu a página analítica da tabela, sem acessar a URL de forma direta.

2. **Gerenciamento e Isolamento de Seletores:**
   - A árvore territorial do SIDRA possui nós com identificadores gerados dinamicamente (`#arvore-355e-1` e `#arvore-435e-1`). Para evitar manutenções dispersas, todos os IDs críticos foram isolados no arquivo `src/config/seletores.js`.
   - O clique de desmarcação do nó "Brasil" é seguido de uma asserção ativa com `esperarCondicao`, garantindo a remoção da classe `.checked`.
   - A seleção do nó "Unidade da Federação" aguarda ativamente a transição do texto do contador para `[27/27]`.

3. **Consolidação das Faixas Etárias via Soma ($\Sigma$):**
   - Na Tabela 1209 não existe uma opção única "60 anos ou mais". A estratégia consistiu em desmarcar o valor padrão ("Total"), marcar individualmente as faixas `60 a 69 anos` e `70 anos ou mais` e acionar o botão de soma ($\Sigma$) na barra de ferramentas.
   - O robô atesta que a ação foi processada conferindo a classe `.active` no botão e a alteração do cabeçalho da dimensão para `Grupo de idade - Soma`.

4. **Seleção Temporal do Ano Mais Recente:**
   - O robô seleciona dinamicamente o primeiro período da lista de períodos (o ano mais recente disponível na ordenação da tabela, atualmente o Censo 2022), garantindo que apenas um único ano permaneça ativo e eliminando séries históricas prévias.

5. **Download Assíncrono e Auditoria em Disco:**
   - A captura do download é realizada via listener de eventos `page.waitForEvent('download')`, associada ao clique no formato `br.csv`.
   - Antes de finalizar, o robô executa uma validação linha a linha do CSV com o módulo `fileValidator.js`, conferindo a presença nominal de todas as 27 UFs, ausência de totalizadores e consistência numérica.

6. **Diagnóstico e Observabilidade (Playwright Tracing):**
   - Todo o fluxo é monitorado pelo sistema de rastreamento do Playwright. Em caso de qualquer imprevisto, são gerados automaticamente prints de tela cheia, dump do código HTML e o arquivo `diagnostico/trace.zip` para auditoria pós-execução (`npx playwright show-trace`).

---

## 4. Principais desafios encontrados

A tabela abaixo resume as armadilhas técnicas do portal SIDRA e as soluções adotadas:

| Desafio Encontrado | Causa Raiz Técnica | Solução Implementada |
| :--- | :--- | :--- |
| **Ausência da opção "60 anos ou mais"** | A Tabela 1209 divide a terceira idade em faixas separadas: `60 a 69 anos` e `70 anos ou mais`. | Seleção de ambas as faixas e acionamento do botão oficial **"Somar elementos"** ($\Sigma$), consolidando os dados em uma única coluna. |
| **Asserção da Soma de Idades** | Ao clicar em somar, as caixas continuam marcadas na árvore (`[2/15]`), sem criar um novo checkbox. | Implementação de asserção dupla verificando a classe `.active` no botão $\Sigma$ e a mudança no título do accordion para `Grupo de idade - Soma`. |
| **Popovers invasivos de tutorial ("Dúvidas")** | O SIDRA abre um tour interativo em popover Bootstrap em novas sessões, cobrindo e bloqueando botões. | Tratamento com teto curto (`waitFor({ state: 'visible', timeout: 5000 })`), acionando o botão "Fim" até a ocultação total do componente. |
| **Filtro de anos colapsado** | O atalho "Mais recente" encontra-se dentro de um dropdown oculto (`wrapper-filtros`). | Seleção direta da primeira caixa de período renderizada no DOM, que sempre corresponde ao ano mais recente disponível na ordenação da tabela (atualmente 2022). |
| **Travamento de arquivo no Windows (`EBUSY`)** | Se o arquivo CSV de saída estiver aberto no Microsoft Excel, o sistema operacional bloqueia sua sobrescrita. | Tratamento de exceção específico para código `EBUSY`, emitindo uma mensagem orientando o operador a fechar o aplicativo. |
| **Caractere UTF-8 BOM no CSV** | O arquivo gerado pelo IBGE inclui a marca `\uFEFF` no início do fluxo. | Sanitização prévia via `.replace(/^\uFEFF/, '')` no módulo de validação de dados antes do parseamento. |

---

## 5. Objetivo do projeto

Extrair do portal oficial do IBGE (SIDRA) a contagem da população brasileira com **60 anos ou mais**, segmentada pelas **27 Unidades da Federação (UFs)** referente ao ano mais recente disponível no portal (atualmente Censo 2022), gerando o arquivo padronizado:
```
dados/populacao_60mais_1209.csv
```

---

## 6. Diretrizes e regras atendidas

- [x] **Ponto de Partida Obrigatório:** Início pela URL raiz [`https://sidra.ibge.gov.br/`](https://sidra.ibge.gov.br/).
- [x] **Proibido Acesso Direto:** Nenhuma navegação direta para `/tabela/1209`. Acesso 100% simulado via elementos reais da interface (botão de busca, digitação e submissão orgânica).
- [x] **Proibido Uso de API REST Oculta:** Não há chamadas HTTP externas (`fetch`, `axios`) para serviços de API do SIDRA; a interação ocorre integralmente via navegador.
- [x] **Sem Manipulação Forçada de DOM:** Todas as interações são eventos legítimos e confiáveis de usuário do Playwright (`click`, `fill`, `press`, `selectOption`).
- [x] **Recorte Territorial Exato:** Todas as 27 UFs selecionadas, sem a inclusão de "Brasil", "Grandes Regiões" ou totais agregados.
- [x] **Consolidação Etária:** Agrupamento das faixas `60 a 69` e `70+` em uma única coluna por meio da função de soma.
- [x] **Período Único:** Seleção dinâmica do ano mais recente disponível na tabela (atualmente 2022, ou o último ano disponível na ordem), sem séries históricas prévias.
- [x] **Entregáveis Completos:** Código modularizado no GitHub, CSV gerado e documentação técnica no `README.md`.

---

## 7. Arquitetura do projeto (Page Object Model)

O projeto adota o padrão de design **Page Object Model (POM)**, isolando responsabilidades em camadas desacopladas:

```text
desafio-rpa-ibge-1209/
├── dados/                              # Diretório de saída dos dados (gerado automaticamente)
│   └── populacao_60mais_1209.csv       # Arquivo CSV oficial com os dados extraídos
├── src/
│   ├── config/
│   │   ├── config.js                   # Timeouts elásticos, URLs e caminhos do sistema
│   │   └── seletores.js                # IDs do DOM do portal isolados para manutenção
│   ├── pages/                          # Camada de Page Objects
│   │   ├── SidraHomePage.js            # Encapsula a Home e a busca interna
│   │   └── Tabela1209Page.js           # Encapsula os filtros analíticos e o download
│   └── utils/
│       ├── espera.js                   # Helper de asserções semânticas de negócio
│       ├── logger.js                   # Padronização de logs no terminal com timestamps
│       └── fileValidator.js            # Validador estatístico e de integridade do CSV
├── desafio_ibge_1209.js                # Orquestrador principal (Entry Point CLI)
├── package.json                        # Configurações do projeto e scripts de inicialização
├── .gitignore                          # Regras de exclusão do controle de versão Git
└── README.md                           # Documentação técnica completa
```

---

## 8. Validação automática de integridade do CSV

O módulo [`src/utils/fileValidator.js`](src/utils/fileValidator.js) audita o arquivo gerado em disco para assegurar a conformidade com as regras de negócio:

1. **Estrutura de Coluna Única:** Valida que o cabeçalho possui apenas 1 dimensão de dados, confirmando que a soma das faixas foi aplicada no portal.
2. **Ano de Referência Único:** Garante a presença exclusiva de um único ano válido de 4 dígitos (atualmente 2022).
3. **Exclusão de Totalizadores:** Rejeita termos como `Brasil`, `Região Norte`, `Sudeste`, `Total`, etc.
4. **Conferência Territorial Nominal:** Compara a lista encontrada contra a lista oficial das 27 UFs brasileiras (de Rondônia ao Distrito Federal). Se faltar qualquer estado ou houver nomes desconhecidos, a validação reprova o arquivo.
5. **Consistência Numérica:** Confere se todos os registros possuem valores inteiros positivos e totaliza os dados (32.113.490 idosos elegíveis no Brasil).
