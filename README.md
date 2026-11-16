# Desafio — Batalha Naval em JavaScript

Batalha Naval com **tabuleiros 10 × 10**, **quatro navios por jogador** e **133 testes automatizados em JavaScript**.

## 1. Concepção do desafio

O desafio consiste em implementar o posicionamento de uma frota e verificar os resultados de ataques em um tabuleiro de 100 casas. A partida possui dois jogadores, cada um com seu próprio tabuleiro e a frota abaixo:

| Navio | Quantidade por jogador | Casas por navio | Identificador na API |
| --- | ---: | ---: | --- |
| Porta-aviões | 1 | 5 | `porta-avioes` |
| Encouraçado | 1 | 4 | `encouracado` |
| Submarino | 1 | 3 | `submarino` |
| Destroier ou Hidroavião | 1 | 2 | `destroier` ou `hidroaviao` |
| **Total** | **4** | **14 casas ocupadas** | |

Cada tabuleiro completo possui **14 casas de navios e 86 casas de água**. Destroier e Hidroavião são nomes alternativos para a mesma unidade de duas casas; o identificador interno é `destroier`.

O projeto entrega um motor de tabuleiro, o controle de uma partida entre dois jogadores, testes e uma demonstração no terminal. Os testes em JavaScript executam diretamente a implementação JavaScript de `src/batalha-naval.js`.

| Requisito | Como foi atendido |
| --- | --- |
| Explicar a concepção do desafio no leia-me | Seção 1 deste README |
| Explicar o funcionamento dos casos de teste | Seções 4 e 5 deste README |
| Tabuleiro 10 × 10 | 100 casas em dez linhas de dez colunas |
| Frota com tamanhos 5, 4, 3 e 2 | Configuração fixa `FROTA` e grupos CT01, CT02 e CT06 |
| Testes em JavaScript para testar JavaScript | `node:test` e `node:assert/strict` em `test/*.test.js` |

## 2. Regras adotadas

### Posicionamento

- Coordenadas no formato `(linha, coluna)`, com valores inteiros de **0 a 9**.
- Navios são colocados na horizontal, avançando para a direita, ou na vertical, avançando para baixo.
- Todas as casas do navio precisam ficar dentro do tabuleiro.
- Navios podem se tocar, mas suas casas não podem se sobrepor.
- Cada navio pode ser colocado uma única vez. Durante a preparação, pode ser removido e reposicionado.
- Os dois jogadores precisam posicionar os quatro navios antes do início.

A orientação horizontal ou vertical usa como referência o [manual de Battleship da Hasbro](https://www.hasbro.com/common/instruct/Battleship.PDF). A frota deste projeto segue os quatro navios definidos no enunciado e na tabela acima.

### Ataques e encerramento

| Situação | Resultado esperado |
| --- | --- |
| Tiro numa casa sem navio | `agua` |
| Acerto em um navio ainda com partes intactas | `atingido` |
| Acerto no último segmento intacto de um navio | `afundado` |
| Quatorze segmentos da frota atingidos | Tabuleiro `derrotado`; vitória do atacante na partida |
| Tiro repetido no mesmo tabuleiro | Erro; dano, contadores e turno permanecem iguais |
| Tiro fora da vez ou dos limites | Erro; a partida permanece igual |
| Tiro durante a preparação ou após o término | Bloqueado |
| Alterar a frota depois do início | Bloqueado |

Cada tiro válido consome um turno, inclusive quando acerta ou afunda um navio. A vez então passa ao adversário. O jogador inicial é configurável; por padrão, começa o jogador `0`.

As coordenadas atacadas pertencem ao tabuleiro alvo. Portanto, os dois jogadores podem usar a mesma coordenada em seus respectivos ataques, pois atingem tabuleiros diferentes.

### Visibilidade e reinício

- O jogador vê todas as posições dos próprios navios.
- Na visão adversária, casas não atacadas aparecem como `null`.
- Um acerto parcial não revela a identidade do navio nem seus outros segmentos.
- Ao afundar um navio, sua identidade é informada e suas casas atingidas passam a mostrar `afundado`.
- Após a derrota, a água que não recebeu tiros permanece oculta na visão adversária.
- Reiniciar limpa as duas frotas, os tiros, os danos, o vencedor e o histórico do último tiro. Os nomes e a escolha de quem começa são preservados.

Essas escolhas integram o contrato dos testes. O projeto usa posicionamento manual pela API e não inclui interface gráfica ou adversário automático.

## 3. Como executar

Requisito: **Node.js 22 ou superior**. O projeto usa recursos nativos; não é necessário instalar pacotes.

Na raiz do projeto:

```sh
node --test
```

Se o npm estiver disponível, o atalho equivalente é:

```sh
npm test
```

Resultado esperado:

```text
tests 133
suites 10
pass 133
fail 0
skipped 0
todo 0
```

Outros comandos:

```sh
# Demonstração de uma partida completa com os quatro navios
node exemplo.js

# Reexecutar testes ao salvar alterações
node --test --watch

# Executar somente os testes de geometria e limites
node --test --test-name-pattern="CT02"

# Cobertura com a opção experimental do Node.js
node --test --experimental-test-coverage
```

Os atalhos npm são `npm run demo`, `npm run test:watch` e `npm run test:coverage`. Consulte a [documentação do executor de testes do Node.js](https://nodejs.org/api/test.html) para suas opções.

## 4. Como os testes funcionam

Cada `describe` reúne um grupo de regras. Cada `it` executa um caso. Tabelas geram testes separados para os quatro navios, as duas orientações, as bordas e as entradas inválidas. O total de 133 inclui essas combinações.

Os testes seguem três etapas:

1. **Preparar:** criar um tabuleiro ou uma partida com navios em posições conhecidas.
2. **Agir:** posicionar, remover, iniciar, atacar ou reiniciar.
3. **Verificar:** comparar o resultado real com o esperado usando `assert`.

Exemplo de teste de sobreposição:

```js
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Tabuleiro } from './src/batalha-naval.js';

it('bloqueia navios sobrepostos', () => {
  const tabuleiro = new Tabuleiro();
  tabuleiro.posicionarNavio('porta-avioes', 0, 0, 'horizontal');

  assert.throws(
    () => tabuleiro.posicionarNavio('encouracado', 0, 2, 'vertical'),
    /sobrepor/,
  );

  assert.equal(tabuleiro.estado.quantidadeNavios, 1);
  assert.equal(tabuleiro.estado.casasOcupadas, 5);
});
```

O exemplo explica a estrutura. As verificações correspondentes já estão incluídas na suíte.

### Repetibilidade e isolamento

- `support/fixtures.js` define posições fixas dos navios, seus 14 alvos e coordenadas de água.
- Cada teste cria tabuleiros e partidas novos.
- As coordenadas esperadas são declaradas nas tabelas de casos.
- Os testes de rejeição comparam o estado completo antes e depois da ação.
- Os testes de integração verificam os dois jogadores, as duas possibilidades de início, a vitória e o reinício.
- Uma verificação percorre todas as 86 casas de água para comprovar que nenhuma afunda navios.
- As visões de jogador e adversário são verificadas separadamente.

Uma falha em qualquer asserção faz o comando terminar com código diferente de zero e reprova a execução no GitHub Actions.

## 5. Catálogo dos casos de teste

| Grupo | Casos | Cobertura | Arquivo |
| --- | ---: | --- | --- |
| CT01 | 6 | Dimensões, composição da frota, 14 segmentos e 86 casas de água | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT02 | 30 | Geometria dos quatro navios, duas orientações e limites exatos | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT03 | 21 | Cantos, coordenadas e identificadores inválidos, alternativa Hidroavião | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT04 | 16 | Sobreposição, quantidade de navios, remoção e preparação | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT05 | 7 | Água, acerto, tiros repetidos e ações inválidas | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT06 | 7 | Afundamento de cada navio e derrota somente no 14º segmento | [tabuleiro.test.js](test/tabuleiro.test.js) |
| CT07 | 6 | Visibilidade, navios ocultos e proteção das cópias de estado | [partida.test.js](test/partida.test.js) |
| CT08 | 15 | Dois jogadores, nomes, tabuleiros independentes e preparação completa | [partida.test.js](test/partida.test.js) |
| CT09 | 12 | Alternância de turnos, alvo correto e rejeição sem consumir a vez | [partida.test.js](test/partida.test.js) |
| CT10 | 13 | Vitória dos dois jogadores, reinício e isolamento | [partida.test.js](test/partida.test.js) |
| **Total** | **133** | **10 grupos de testes** | |

### Exemplos de entrada e resultado esperado

| Entrada ou ação | Resultado esperado |
| --- | --- |
| Porta-aviões horizontal em `(0, 0)` | Ocupa `(0, 0)` até `(0, 4)` |
| Encouraçado vertical em `(6, 9)` | Ocupa `(6, 9)` até `(9, 9)` |
| Porta-aviões horizontal em `(0, 6)` | Erro: ultrapassa o tabuleiro |
| Colocar Destroier e depois Hidroavião | Erro: a unidade de duas casas já foi colocada |
| Colisão somente no último segmento | Erro; nenhum segmento novo é colocado |
| Acertar quatro das cinco casas do Porta-aviões | Continua sem afundar |
| Acertar a quinta casa do Porta-aviões | Resultado `afundado` |
| Atingir treze segmentos da frota | Partida continua |
| Atingir o 14º segmento | Frota derrotada e partida concluída |
| Repetir um tiro | Erro; o turno permanece com o mesmo jogador |

## 6. Organização do projeto

```text
batalha-naval/
├── .github/workflows/testes.yml
├── .gitignore
├── README.md
├── VALIDACAO.md
├── exemplo.js
├── package.json
├── src/
│   └── batalha-naval.js
├── support/
│   └── fixtures.js
└── test/
    ├── tabuleiro.test.js
    └── partida.test.js
```

## 7. API da implementação

| Exportação de `src/batalha-naval.js` | Finalidade |
| --- | --- |
| `TAMANHO` | Valor fixo `10` |
| `FROTA` | Lista imutável dos quatro navios e seus tamanhos |
| `coordenadaValida(linha, coluna)` | Retorna `true` ou `false` |
| `calcularCasas(id, linha, coluna, orientacao = 'horizontal')` | Lista objetos `{ linha, coluna }` ocupados pelo navio |
| `new Tabuleiro()` | Cria um tabuleiro independente para posicionar uma frota e receber tiros |
| `new BatalhaNaval(opcoes)` | Cria uma partida com `jogadores` e `primeiroJogador` opcionais |

### Tabuleiro

| Recurso | Comportamento |
| --- | --- |
| `tabuleiro.estado` | Cópia completa do tabuleiro e da própria frota |
| `tabuleiro.visaoAdversario` | Cópia que exibe somente resultados dos tiros e navios afundados |
| `tabuleiro.frotaCompleta` | Indica se os quatro navios foram colocados |
| `posicionarNavio(id, linha, coluna, orientacao)` | Posiciona um navio durante a preparação |
| `removerNavio(id)` | Libera as casas de um navio durante a preparação |
| `iniciar()` | Inicia o recebimento de tiros com a frota completa |
| `atacar(linha, coluna)` | Registra um tiro e retorna seu resultado |
| `reiniciar()` | Remove a frota e todo o histórico de tiros |

O tabuleiro tem os estados `preparacao`, `jogando` e `derrotado`. O retorno de `atacar` é:

```js
{
  linha: 0,
  coluna: 0,
  resultado: 'atingido', // agua, atingido ou afundado
  navio: null,          // identificador informado quando afunda
  frotaDestruida: false
}
```

### Partida

Os jogadores usam os identificadores numéricos `0` e `1`.

| Recurso | Comportamento |
| --- | --- |
| `jogo.estado` | Status, jogadores, vez, vencedor, quantidade de turnos e último tiro |
| `jogo.posicionarNavio(jogador, id, linha, coluna, orientacao)` | Posiciona na frota do jogador indicado |
| `jogo.removerNavio(jogador, id)` | Remove da frota do jogador indicado |
| `jogo.iniciar()` | Inicia depois que as duas frotas estiverem completas |
| `jogo.visaoDoJogador(jogador)` | Retorna `{ estado, proprio, adversario }` |
| `jogo.atacar(jogador, linha, coluna)` | Ataca o tabuleiro adversário e atualiza a vez |
| `jogo.reiniciar()` | Limpa a partida e retorna à preparação |

A partida tem os estados `preparacao`, `jogando` e `concluida`. O vencedor e a vez são `null` quando não há vencedor ou turno ativo, respectivamente. O retorno de um ataque inclui também `jogador`, `adversario`, `vezSeguinte` e `vencedor`.

Posicionamento, remoção, início e reinício retornam cópias do estado atualizado. Ações inválidas geram `Error`, sem alterar os tabuleiros ou consumir um turno.

## 8. Repositório e integração contínua

Repositório: [LuizEdVS/desafio_teste_batalha_naval](https://github.com/LuizEdVS/desafio_teste_batalha_naval).

```sh
git clone https://github.com/LuizEdVS/desafio_teste_batalha_naval.git
cd desafio_teste_batalha_naval
node --test
```

O workflow `.github/workflows/testes.yml` executa os testes e a demonstração em **Node.js 22 e 24** a cada push e pull request. Os resultados ficam na aba [Actions](https://github.com/LuizEdVS/desafio_teste_batalha_naval/actions).
