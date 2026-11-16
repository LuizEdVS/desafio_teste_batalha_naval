import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FROTA, Tabuleiro, calcularCasas, coordenadaValida } from '../src/batalha-naval.js';
import { POSICOES, ALVOS, novoTabuleiro, rejeitaSemAlterar } from '../support/fixtures.js';

describe('CT01 — Tabuleiro 10 por 10 e frota de quatro navios', () => {
  it('cria 100 casas em dez linhas independentes de dez colunas', () => {
    const t = new Tabuleiro();
    assert.equal(t.estado.tamanho, 10);
    assert.equal(t.estado.totalCasas, 100);
    assert.equal(t.estado.tabuleiro.length, 10);
    assert.ok(t.estado.tabuleiro.every(l => l.length === 10));
    assert.ok(t.estado.tabuleiro.flat().every(c => c.navio === null && c.atacada === false));
  });

  it('define exatamente um navio de cada tamanho: cinco, quatro, três e dois', () => {
    assert.deepEqual(FROTA.map(n => [n.id, n.tamanho]), [
      ['porta-avioes', 5], ['encouracado', 4], ['submarino', 3], ['destroier', 2],
    ]);
  });

  it('inicia em preparação, sem navios, acertos ou tiros', () => {
    const t = new Tabuleiro();
    assert.equal(t.estado.status, 'preparacao');
    assert.equal(t.estado.quantidadeNavios, 0);
    assert.equal(t.frotaCompleta, false);
    assert.equal(t.estado.casasOcupadas, 0);
    assert.equal(t.estado.casasAgua, 100);
    assert.equal(t.estado.tiros, 0);
    assert.equal(t.estado.acertos, 0);
  });

  it('a frota completa ocupa 14 casas e deixa 86 casas de água', () => {
    const t = novoTabuleiro(false);
    assert.equal(t.estado.quantidadeNavios, 4);
    assert.equal(t.frotaCompleta, true);
    assert.equal(t.estado.casasOcupadas, 14);
    assert.equal(t.estado.casasAgua, 86);
    assert.equal(t.estado.casasIntactas, 14);
    assert.equal(t.estado.tabuleiro.flat().filter(c => c.navio !== null).length, 14);
  });

  it('posicionar numa linha não altera as outras linhas', () => {
    const t = new Tabuleiro();
    t.posicionarNavio('submarino', 0, 0);
    assert.equal(t.estado.tabuleiro[0][0].navio, 'submarino');
    assert.ok(t.estado.tabuleiro.slice(1).flat().every(c => c.navio === null));
  });

  it('a configuração da frota não pode ser alterada externamente', () => {
    assert.throws(() => { FROTA[0].tamanho = 1; }, TypeError);
    assert.throws(() => FROTA.push({ id: 'extra', tamanho: 1 }), TypeError);
    assert.equal(FROTA.length, 4);
  });
});

describe('CT02 — Geometria dos navios e limites do tabuleiro', () => {
  const casos = [
    ['porta-avioes', [0, 1, 2, 3, 4], 5, [5, 6, 7, 8, 9], 6],
    ['encouracado', [0, 1, 2, 3], 6, [6, 7, 8, 9], 7],
    ['submarino', [0, 1, 2], 7, [7, 8, 9], 8],
    ['destroier', [0, 1], 8, [8, 9], 9],
  ];
  for (const [id, numeros, ultimoInicio, finais, fora] of casos) {
    it(`${id} ocupa as casas horizontais corretas a partir de (0, 0)`, () => {
      assert.deepEqual(calcularCasas(id, 0, 0, 'horizontal'), numeros.map(coluna => ({ linha: 0, coluna })));
    });
    it(`${id} ocupa as casas verticais corretas a partir de (0, 0)`, () => {
      assert.deepEqual(calcularCasas(id, 0, 0, 'vertical'), numeros.map(linha => ({ linha, coluna: 0 })));
    });
    it(`${id} cabe exatamente no limite direito da última linha`, () => {
      assert.deepEqual(calcularCasas(id, 9, ultimoInicio, 'horizontal'), finais.map(coluna => ({ linha: 9, coluna })));
    });
    it(`${id} cabe exatamente no limite inferior da última coluna`, () => {
      assert.deepEqual(calcularCasas(id, ultimoInicio, 9, 'vertical'), finais.map(linha => ({ linha, coluna: 9 })));
    });
    it(`${id} não pode ultrapassar uma casa à direita`, () => {
      assert.throws(() => calcularCasas(id, 0, fora, 'horizontal'), /fora do tabuleiro/);
    });
    it(`${id} não pode ultrapassar uma casa abaixo`, () => {
      assert.throws(() => calcularCasas(id, fora, 0, 'vertical'), /fora do tabuleiro/);
    });
  }

  for (const orientacao of ['diagonal', 'H', 'V', null, 45]) {
    it(`rejeita orientação ${JSON.stringify(orientacao)}`, () => {
      const t = new Tabuleiro();
      rejeitaSemAlterar(t, () => t.posicionarNavio('destroier', 0, 0, orientacao), /Orientação inválida/);
    });
  }

  it('usa orientação horizontal quando ela é omitida', () => {
    assert.deepEqual(calcularCasas('destroier', 3, 4), [{ linha: 3, coluna: 4 }, { linha: 3, coluna: 5 }]);
  });
});

describe('CT03 — Coordenadas, identificadores e entradas inválidas', () => {
  for (const [linha, coluna] of [[0, 0], [0, 9], [9, 0], [9, 9]]) {
    it(`aceita a coordenada do canto (${linha}, ${coluna})`, () => {
      assert.equal(coordenadaValida(linha, coluna), true);
    });
  }

  for (const [nome, linha, coluna] of [
    ['linha negativa', -1, 0], ['linha dez', 10, 0], ['coluna negativa', 0, -1],
    ['coluna dez', 0, 10], ['linha fracionária', 0.5, 0], ['coluna fracionária', 0, 0.5],
    ['linha em texto', '0', 0], ['coluna em texto', 0, '0'], ['null', null, 0],
    ['NaN', NaN, 0], ['infinito', Infinity, 0],
  ]) {
    it(`rejeita ${nome} sem modificar o tabuleiro`, () => {
      const t = new Tabuleiro();
      assert.equal(coordenadaValida(linha, coluna), false);
      assert.throws(() => calcularCasas('destroier', linha, coluna), /Coordenada inválida/);
      rejeitaSemAlterar(t, () => t.posicionarNavio('destroier', linha, coluna), /Coordenada inválida/);
    });
  }

  for (const id of ['fragata', 'porta', '', null, 0]) {
    it(`rejeita identificador de navio ${JSON.stringify(id)}`, () => {
      const t = new Tabuleiro();
      rejeitaSemAlterar(t, () => t.posicionarNavio(id, 0, 0), /Navio inválido/);
    });
  }

  it('Hidroavião é uma alternativa de duas casas para o mesmo Destroier', () => {
    assert.deepEqual(calcularCasas('hidroaviao', 1, 2), [{ linha: 1, coluna: 2 }, { linha: 1, coluna: 3 }]);
    const t = new Tabuleiro();
    t.posicionarNavio('hidroaviao', 1, 2);
    assert.equal(t.estado.quantidadeNavios, 1);
    assert.equal(t.estado.navios.find(n => n.id === 'destroier').colocado, true);
    assert.equal(t.estado.casasOcupadas, 2);
  });
});

describe('CT04 — Posicionamento, sobreposição e preparação', () => {
  it('bloqueia dois navios com a mesma casa inicial', () => {
    const t = new Tabuleiro();
    t.posicionarNavio('porta-avioes', 0, 0);
    rejeitaSemAlterar(t, () => t.posicionarNavio('encouracado', 0, 0), /sobrepor/);
  });

  it('bloqueia cruzamento entre um navio horizontal e um vertical', () => {
    const t = new Tabuleiro();
    t.posicionarNavio('porta-avioes', 2, 0);
    rejeitaSemAlterar(t, () => t.posicionarNavio('encouracado', 0, 2, 'vertical'), /sobrepor/);
  });

  it('uma colisão no último segmento não deixa posicionamento parcial', () => {
    const t = new Tabuleiro();
    t.posicionarNavio('porta-avioes', 4, 4);
    rejeitaSemAlterar(t, () => t.posicionarNavio('encouracado', 1, 6, 'vertical'), /sobrepor/);
    assert.equal(t.estado.tabuleiro[1][6].navio, null);
    assert.equal(t.estado.tabuleiro[2][6].navio, null);
    assert.equal(t.estado.casasOcupadas, 5);
  });

  for (const id of ['porta-avioes', 'encouracado', 'submarino', 'destroier']) {
    it(`permite somente um ${id}`, () => {
      const t = new Tabuleiro();
      t.posicionarNavio(id, 0, 0);
      rejeitaSemAlterar(t, () => t.posicionarNavio(id, 5, 0), /já foi posicionado/);
    });
  }

  for (const [primeiro, segundo] of [['destroier', 'hidroaviao'], ['hidroaviao', 'destroier']]) {
    it(`posicionar ${primeiro} também bloqueia uma segunda unidade chamada ${segundo}`, () => {
      const t = new Tabuleiro();
      t.posicionarNavio(primeiro, 0, 0);
      rejeitaSemAlterar(t, () => t.posicionarNavio(segundo, 5, 0), /já foi posicionado/);
    });
  }

  it('permite contato lateral e diagonal quando não há sobreposição', () => {
    const t = new Tabuleiro();
    t.posicionarNavio('porta-avioes', 0, 0);
    t.posicionarNavio('encouracado', 1, 0);
    t.posicionarNavio('submarino', 2, 4);
    t.posicionarNavio('destroier', 9, 8);
    assert.equal(t.estado.casasOcupadas, 14);
    assert.equal(t.frotaCompleta, true);
  });

  it('remove somente o navio escolhido durante a preparação', () => {
    const t = novoTabuleiro(false);
    t.removerNavio('encouracado');
    assert.equal(t.estado.quantidadeNavios, 3);
    assert.equal(t.estado.casasOcupadas, 10);
    assert.equal(t.frotaCompleta, false);
    assert.ok([0, 1, 2, 3].every(c => t.estado.tabuleiro[2][c].navio === null));
    assert.equal(t.estado.tabuleiro[0][0].navio, 'porta-avioes');
  });

  it('permite remover e reposicionar o mesmo navio em outra orientação', () => {
    const t = novoTabuleiro(false);
    t.removerNavio('destroier');
    t.posicionarNavio('destroier', 8, 9, 'vertical');
    assert.equal(t.estado.tabuleiro[6][0].navio, null);
    assert.equal(t.estado.tabuleiro[8][9].navio, 'destroier');
    assert.equal(t.estado.tabuleiro[9][9].navio, 'destroier');
    assert.equal(t.estado.casasOcupadas, 14);
  });

  it('o nome alternativo também pode remover o Destroier', () => {
    const t = novoTabuleiro(false);
    t.removerNavio('hidroaviao');
    assert.equal(t.estado.quantidadeNavios, 3);
    assert.equal(t.estado.casasOcupadas, 12);
  });

  it('rejeita remoção de navio inexistente ou ainda não posicionado', () => {
    const t = new Tabuleiro();
    rejeitaSemAlterar(t, () => t.removerNavio('fragata'), /Navio inválido/);
    rejeitaSemAlterar(t, () => t.removerNavio('submarino'), /ainda não foi posicionado/);
  });

  it('não inicia até os quatro navios estarem posicionados', () => {
    const t = novoTabuleiro(false);
    t.removerNavio('destroier');
    rejeitaSemAlterar(t, () => t.iniciar(), /quatro navios/);
    t.posicionarNavio('destroier', 6, 0);
    assert.equal(t.iniciar().status, 'jogando');
  });

  it('bloqueia novo início, posicionamento e remoção após a batalha começar', () => {
    const t = novoTabuleiro();
    rejeitaSemAlterar(t, () => t.iniciar(), /preparação/);
    rejeitaSemAlterar(t, () => t.posicionarNavio('destroier', 9, 0), /preparação/);
    rejeitaSemAlterar(t, () => t.removerNavio('destroier'), /preparação/);
  });
});

describe('CT05 — Tiros, água, acertos e repetição', () => {
  it('não recebe tiros durante a preparação', () => {
    const t = novoTabuleiro(false);
    rejeitaSemAlterar(t, () => t.atacar(0, 0), /estar em jogo/);
  });

  it('tiro em água atualiza somente a casa atacada e os contadores', () => {
    const t = novoTabuleiro();
    assert.deepEqual(t.atacar(9, 9), { linha: 9, coluna: 9, resultado: 'agua', navio: null, frotaDestruida: false });
    assert.equal(t.estado.tiros, 1);
    assert.equal(t.estado.agua, 1);
    assert.equal(t.estado.acertos, 0);
    assert.equal(t.estado.casasIntactas, 14);
    assert.equal(t.estado.tabuleiro[9][9].atacada, true);
    assert.equal(t.estado.tabuleiro[9][8].atacada, false);
  });

  it('tiro num segmento registra acerto sem afundar o navio inteiro', () => {
    const t = novoTabuleiro();
    assert.deepEqual(t.atacar(0, 0), { linha: 0, coluna: 0, resultado: 'atingido', navio: null, frotaDestruida: false });
    assert.equal(t.estado.acertos, 1);
    assert.equal(t.estado.agua, 0);
    assert.equal(t.estado.casasIntactas, 13);
    assert.equal(t.estado.navios[0].acertos, 1);
    assert.equal(t.estado.navios[0].afundado, false);
  });

  for (const [nome, linha, coluna] of [['água', 9, 9], ['navio', 0, 0]]) {
    it(`rejeita tiro repetido em ${nome}, sem contar a mesma casa duas vezes`, () => {
      const t = novoTabuleiro();
      t.atacar(linha, coluna);
      rejeitaSemAlterar(t, () => t.atacar(linha, coluna), /já foi atacada/);
      assert.equal(t.estado.tiros, 1);
    });
  }

  it('rejeita tiros fora dos limites e coordenadas de tipo inválido', () => {
    const t = novoTabuleiro();
    for (const [l, c] of [[-1, 0], [10, 0], [0, -1], [0, 10], [0.5, 0], [0, 0.5], ['0', 0], [0, null], [NaN, 0]]) {
      rejeitaSemAlterar(t, () => t.atacar(l, c), /Coordenada inválida/);
    }
  });

  it('os tiros de um tabuleiro não afetam outro tabuleiro', () => {
    const a = novoTabuleiro();
    const b = novoTabuleiro();
    a.atacar(0, 0);
    assert.equal(b.estado.tiros, 0);
    assert.equal(b.estado.navios[0].acertos, 0);
    assert.equal(b.estado.tabuleiro[0][0].atacada, false);
  });
});

describe('CT06 — Afundamento dos navios e derrota da frota', () => {
  for (const navio of POSICOES) {
    it(`${navio.id} afunda somente após atingir suas ${navio.casas.length} casas distintas`, () => {
      const t = novoTabuleiro();
      navio.casas.forEach(([l, c], i) => {
        const tiro = t.atacar(l, c);
        const ultimo = i === navio.casas.length - 1;
        assert.equal(tiro.resultado, ultimo ? 'afundado' : 'atingido');
        assert.equal(tiro.navio, ultimo ? navio.id : null);
        assert.equal(tiro.frotaDestruida, false);
      });
      const estado = t.estado.navios.find(n => n.id === navio.id);
      assert.equal(estado.acertos, navio.casas.length);
      assert.equal(estado.afundado, true);
      assert.equal(t.estado.status, 'jogando');
      assert.equal(t.estado.navios.filter(n => n.afundado).length, 1);
    });
  }

  it('treze acertos ainda não derrotam a frota; o décimo quarto encerra', () => {
    const t = novoTabuleiro();
    for (const alvo of ALVOS.slice(0, 13)) assert.equal(t.atacar(...alvo).frotaDestruida, false);
    assert.equal(t.estado.status, 'jogando');
    assert.equal(t.estado.casasIntactas, 1);
    const ultimo = t.atacar(...ALVOS[13]);
    assert.equal(ultimo.frotaDestruida, true);
    assert.equal(ultimo.resultado, 'afundado');
    assert.equal(t.estado.status, 'derrotado');
    assert.equal(t.estado.acertos, 14);
    assert.equal(t.estado.casasIntactas, 0);
    assert.equal(t.estado.navios.filter(n => n.afundado).length, 4);
  });

  it('atirar nas 86 casas de água não afunda nenhum navio', () => {
    const t = novoTabuleiro();
    const ocupadas = new Set(ALVOS.map(([l, c]) => `${l},${c}`));
    for (let l = 0; l < 10; l += 1) for (let c = 0; c < 10; c += 1) {
      if (!ocupadas.has(`${l},${c}`)) assert.equal(t.atacar(l, c).resultado, 'agua');
    }
    assert.equal(t.estado.tiros, 86);
    assert.equal(t.estado.agua, 86);
    assert.equal(t.estado.acertos, 0);
    assert.equal(t.estado.casasIntactas, 14);
    assert.equal(t.estado.status, 'jogando');
  });

  it('rejeita novos tiros e alterações de navios depois da derrota', () => {
    const t = novoTabuleiro();
    for (const alvo of ALVOS) t.atacar(...alvo);
    rejeitaSemAlterar(t, () => t.atacar(9, 9), /estar em jogo/);
    rejeitaSemAlterar(t, () => t.removerNavio('destroier'), /preparação/);
    rejeitaSemAlterar(t, () => t.posicionarNavio('destroier', 9, 8), /preparação/);
  });
});
