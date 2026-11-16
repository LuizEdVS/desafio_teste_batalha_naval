import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BatalhaNaval, FROTA } from '../src/batalha-naval.js';
import {
  POSICOES, ALVOS, novoTabuleiro, prepararJogador, novaPartida, concluirPartida, rejeitaSemAlterar,
} from '../support/fixtures.js';

describe('CT07 — Visões dos jogadores e proteção do estado', () => {
  it('o dono vê seus 14 segmentos e o adversário vê 100 casas ocultas', () => {
    const t = novoTabuleiro();
    assert.equal(t.estado.tabuleiro.flat().filter(c => c.navio !== null).length, 14);
    assert.equal(t.visaoAdversario.tabuleiro.flat().filter(c => c !== null).length, 0);
    assert.deepEqual(t.visaoAdversario.afundados, []);
    assert.equal('navios' in t.visaoAdversario, false);
  });

  it('a visão adversária mostra água somente depois de um tiro naquela casa', () => {
    const t = novoTabuleiro();
    t.atacar(9, 9);
    assert.equal(t.visaoAdversario.tabuleiro[9][9], 'agua');
    assert.equal(t.visaoAdversario.tabuleiro[9][8], null);
    assert.equal(t.visaoAdversario.tabuleiro.flat().filter(c => c !== null).length, 1);
  });

  it('um acerto parcial não revela a identidade nem os demais segmentos do navio', () => {
    const t = novoTabuleiro();
    assert.equal(t.atacar(0, 0).navio, null);
    assert.equal(t.visaoAdversario.tabuleiro[0][0], 'atingido');
    assert.equal(t.visaoAdversario.tabuleiro[0][1], null);
    assert.deepEqual(t.visaoAdversario.afundados, []);
  });

  it('afundar atualiza todos os segmentos atingidos e revela somente esse navio', () => {
    const t = novoTabuleiro();
    t.atacar(6, 0);
    t.atacar(6, 1);
    assert.deepEqual(t.visaoAdversario.afundados, [{ id: 'destroier', nome: 'Destroier', tamanho: 2 }]);
    assert.equal(t.visaoAdversario.tabuleiro[6][0], 'afundado');
    assert.equal(t.visaoAdversario.tabuleiro[6][1], 'afundado');
    assert.equal(t.visaoAdversario.tabuleiro[0][0], null);
  });

  it('alterar as cópias das visões não modifica tabuleiro, posições ou frota', () => {
    const t = novoTabuleiro();
    t.atacar(6, 0);
    t.atacar(6, 1);
    const proprio = t.estado;
    proprio.navios[0].casas[0].linha = 99;
    proprio.tabuleiro[0][0].navio = null;
    proprio.acertos = 99;
    const alvo = t.visaoAdversario;
    alvo.afundados[0].tamanho = 99;
    alvo.tabuleiro[6][0] = null;
    assert.equal(t.estado.navios[0].casas[0].linha, 0);
    assert.equal(t.estado.tabuleiro[0][0].navio, 'porta-avioes');
    assert.equal(t.estado.acertos, 2);
    assert.equal(t.visaoAdversario.tabuleiro[6][0], 'afundado');
    assert.equal(FROTA[3].tamanho, 2);
  });

  it('a visão após derrota mostra 14 segmentos afundados e preserva a água não atacada', () => {
    const t = novoTabuleiro();
    for (const alvo of ALVOS) t.atacar(...alvo);
    assert.equal(t.visaoAdversario.tabuleiro.flat().filter(c => c === 'afundado').length, 14);
    assert.equal(t.visaoAdversario.tabuleiro.flat().filter(c => c === null).length, 86);
    assert.equal(t.visaoAdversario.afundados.length, 4);
  });
});

describe('CT08 — Dois jogadores e preparação dos dois tabuleiros', () => {
  it('inicia com dois jogadores, sem vez ativa, vencedor ou tiros', () => {
    const jogo = new BatalhaNaval({ jogadores: [' Ana ', 'Bia'] });
    assert.deepEqual(jogo.estado.jogadores, ['Ana', 'Bia']);
    assert.equal(jogo.estado.status, 'preparacao');
    assert.equal(jogo.estado.vez, null);
    assert.equal(jogo.estado.vencedor, null);
    assert.equal(jogo.estado.turnos, 0);
    assert.equal(jogo.estado.ultimoTiro, null);
    assert.deepEqual(jogo.estado.prontos, [false, false]);
  });

  for (const jogadores of [[], ['A'], ['A', 'B', 'C'], 'A,B']) {
    it(`rejeita quantidade ou formato de jogadores ${JSON.stringify(jogadores)}`, () => {
      assert.throws(() => new BatalhaNaval({ jogadores }), /dois jogadores/);
    });
  }

  it('rejeita nomes repetidos, vazios, inválidos e ausentes', () => {
    for (const jogadores of [['A', ' A '], ['A', ''], ['A', 1], Array(2)]) {
      assert.throws(() => new BatalhaNaval({ jogadores }), /nomes diferentes|Nome de jogador inválido/);
    }
  });

  for (const primeiroJogador of [-1, 2, 0.5, '0', true, null]) {
    it(`rejeita jogador inicial ${JSON.stringify(primeiroJogador)}`, () => {
      assert.throws(() => new BatalhaNaval({ primeiroJogador }), /Jogador inválido/);
    });
  }

  it('cada jogador posiciona sua frota em um tabuleiro independente', () => {
    const jogo = new BatalhaNaval();
    jogo.posicionarNavio(0, 'porta-avioes', 0, 0);
    assert.equal(jogo.visaoDoJogador(0).proprio.casasOcupadas, 5);
    assert.equal(jogo.visaoDoJogador(1).proprio.casasOcupadas, 0);
    assert.ok(jogo.visaoDoJogador(1).adversario.tabuleiro.flat().every(c => c === null));
  });

  it('não inicia sem frota, com apenas um jogador pronto ou faltando o último navio', () => {
    const jogo = new BatalhaNaval();
    rejeitaSemAlterar(jogo, () => jogo.iniciar(), /dois jogadores/);
    prepararJogador(jogo, 0);
    assert.deepEqual(jogo.estado.prontos, [true, false]);
    rejeitaSemAlterar(jogo, () => jogo.iniciar(), /dois jogadores/);
    for (const n of POSICOES.slice(0, 3)) jogo.posicionarNavio(1, n.id, n.linha, n.coluna, n.orientacao);
    rejeitaSemAlterar(jogo, () => jogo.iniciar(), /dois jogadores/);
    jogo.posicionarNavio(1, 'destroier', 6, 0);
    jogo.iniciar();
    assert.equal(jogo.estado.status, 'jogando');
    assert.deepEqual(jogo.estado.prontos, [true, true]);
  });

  it('remover um navio antes do início faz o jogador deixar de estar pronto', () => {
    const jogo = novaPartida({}, false);
    jogo.removerNavio(1, 'submarino');
    assert.deepEqual(jogo.estado.prontos, [true, false]);
    rejeitaSemAlterar(jogo, () => jogo.iniciar(), /dois jogadores/);
  });
});

describe('CT09 — Turnos, ataques ao adversário e ações rejeitadas', () => {
  for (const primeiroJogador of [0, 1]) {
    it(`permite ao jogador ${primeiroJogador} começar`, () => {
      const jogo = novaPartida({ primeiroJogador });
      assert.equal(jogo.estado.vez, primeiroJogador);
      const tiro = jogo.atacar(primeiroJogador, 9, 9);
      assert.equal(tiro.resultado, 'agua');
      assert.equal(jogo.estado.vez, 1 - primeiroJogador);
    });
  }

  it('alterna a vez depois de acerto e depois de água', () => {
    const jogo = novaPartida();
    const acerto = jogo.atacar(0, 0, 0);
    assert.equal(acerto.resultado, 'atingido');
    assert.equal(acerto.vezSeguinte, 1);
    const agua = jogo.atacar(1, 9, 9);
    assert.equal(agua.resultado, 'agua');
    assert.equal(agua.vezSeguinte, 0);
    assert.equal(jogo.estado.turnos, 2);
  });

  it('o tiro é aplicado ao tabuleiro adversário, sem danificar a frota de quem atira', () => {
    const jogo = novaPartida();
    jogo.atacar(0, 0, 0);
    assert.equal(jogo.visaoDoJogador(0).proprio.acertos, 0);
    assert.equal(jogo.visaoDoJogador(0).adversario.acertos, 1);
    assert.equal(jogo.visaoDoJogador(1).proprio.acertos, 1);
  });

  it('bloqueia ataque fora da vez sem consumir o turno', () => {
    const jogo = novaPartida();
    rejeitaSemAlterar(jogo, () => jogo.atacar(1, 9, 9), /Não é a vez/);
    assert.equal(jogo.estado.vez, 0);
    assert.equal(jogo.estado.turnos, 0);
  });

  it('bloqueia ataques antes do início da partida', () => {
    const jogo = novaPartida({}, false);
    rejeitaSemAlterar(jogo, () => jogo.atacar(0, 0, 0), /estar em jogo/);
  });

  it('a mesma coordenada pode ser usada por jogadores diferentes em tabuleiros diferentes', () => {
    const jogo = novaPartida();
    jogo.atacar(0, 9, 9);
    jogo.atacar(1, 9, 9);
    assert.equal(jogo.estado.turnos, 2);
    assert.equal(jogo.visaoDoJogador(0).proprio.tiros, 1);
    assert.equal(jogo.visaoDoJogador(1).proprio.tiros, 1);
    rejeitaSemAlterar(jogo, () => jogo.atacar(0, 9, 9), /já foi atacada/);
    assert.equal(jogo.estado.vez, 0);
  });

  it('um acerto repetido não aumenta o dano nem troca a vez', () => {
    const jogo = novaPartida();
    jogo.atacar(0, 0, 0);
    jogo.atacar(1, 9, 9);
    rejeitaSemAlterar(jogo, () => jogo.atacar(0, 0, 0), /já foi atacada/);
    assert.equal(jogo.visaoDoJogador(0).adversario.acertos, 1);
    assert.equal(jogo.estado.vez, 0);
  });

  it('tiro com coordenada inválida não altera nenhum dos dois tabuleiros', () => {
    const jogo = novaPartida();
    for (const [l, c] of [[-1, 0], [10, 0], [0, -1], [0, 10], [0.5, 0], ['0', 0], [0, null]]) {
      rejeitaSemAlterar(jogo, () => jogo.atacar(0, l, c), /Coordenada inválida/);
    }
  });

  it('identificadores de jogador inválidos são rejeitados em todas as ações', () => {
    const jogo = novaPartida({}, false);
    for (const jogador of [-1, 2, '0', null, true]) {
      rejeitaSemAlterar(jogo, () => jogo.posicionarNavio(jogador, 'destroier', 9, 0), /Jogador inválido/);
      rejeitaSemAlterar(jogo, () => jogo.removerNavio(jogador, 'destroier'), /Jogador inválido/);
      rejeitaSemAlterar(jogo, () => jogo.visaoDoJogador(jogador), /Jogador inválido/);
      rejeitaSemAlterar(jogo, () => jogo.atacar(jogador, 9, 9), /Jogador inválido/);
    }
  });

  it('após iniciar, bloqueia novo início e mudanças de frota', () => {
    const jogo = novaPartida();
    rejeitaSemAlterar(jogo, () => jogo.iniciar(), /preparação/);
    rejeitaSemAlterar(jogo, () => jogo.posicionarNavio(0, 'destroier', 9, 0), /preparação/);
    rejeitaSemAlterar(jogo, () => jogo.removerNavio(1, 'destroier'), /preparação/);
  });

  it('o resultado do tiro é uma cópia e mantém o registro do último turno protegido', () => {
    const jogo = novaPartida();
    const tiro = jogo.atacar(0, 0, 0);
    assert.deepEqual(tiro, jogo.estado.ultimoTiro);
    tiro.linha = 99;
    tiro.vencedor = 1;
    assert.equal(jogo.estado.ultimoTiro.linha, 0);
    assert.equal(jogo.estado.ultimoTiro.vencedor, null);
    assert.equal(jogo.estado.vencedor, null);
  });
});

describe('CT10 — Vitória, reinício e isolamento das partidas', () => {
  for (const primeiroJogador of [0, 1]) {
    for (const vencedor of [0, 1]) {
      it(`jogador ${vencedor} pode vencer com jogador ${primeiroJogador} começando`, () => {
        const jogo = novaPartida({ primeiroJogador });
        concluirPartida(jogo, vencedor);
        assert.equal(jogo.estado.vez, null);
        assert.equal(jogo.estado.turnos, primeiroJogador === vencedor ? 27 : 28);
        assert.equal(jogo.estado.ultimoTiro.frotaDestruida, true);
        assert.equal(jogo.estado.ultimoTiro.resultado, 'afundado');
        assert.equal(jogo.visaoDoJogador(vencedor).adversario.acertos, 14);
        assert.equal(jogo.visaoDoJogador(vencedor).adversario.afundados.length, 4);
      });
    }
  }

  it('bloqueia novos tiros, alterações e novo início depois da vitória', () => {
    const jogo = novaPartida();
    concluirPartida(jogo);
    rejeitaSemAlterar(jogo, () => jogo.atacar(0, 9, 9), /estar em jogo/);
    rejeitaSemAlterar(jogo, () => jogo.atacar(1, 9, 8), /estar em jogo/);
    rejeitaSemAlterar(jogo, () => jogo.posicionarNavio(0, 'destroier', 9, 0), /preparação/);
    rejeitaSemAlterar(jogo, () => jogo.removerNavio(1, 'destroier'), /preparação/);
    rejeitaSemAlterar(jogo, () => jogo.iniciar(), /preparação/);
  });

  for (const status of ['preparacao', 'jogando', 'concluida']) {
    it(`reinicia uma partida que estava em ${status}`, () => {
      const jogo = novaPartida({ jogadores: ['Ana', 'Bia'], primeiroJogador: 1 }, status !== 'preparacao');
      if (status === 'jogando') jogo.atacar(1, 0, 0);
      if (status === 'concluida') concluirPartida(jogo, 1);
      assert.equal(jogo.estado.status, status);
      jogo.reiniciar();
      assert.equal(jogo.estado.status, 'preparacao');
      assert.equal(jogo.estado.vez, null);
      assert.equal(jogo.estado.vencedor, null);
      assert.equal(jogo.estado.ultimoTiro, null);
      assert.equal(jogo.estado.turnos, 0);
      assert.equal(jogo.estado.primeiroJogador, 1);
      assert.deepEqual(jogo.estado.jogadores, ['Ana', 'Bia']);
      assert.deepEqual(jogo.estado.prontos, [false, false]);
      for (const jogador of [0, 1]) {
        const visao = jogo.visaoDoJogador(jogador);
        assert.equal(visao.proprio.quantidadeNavios, 0);
        assert.equal(visao.proprio.tiros, 0);
        assert.equal(visao.proprio.acertos, 0);
        assert.equal(visao.proprio.casasAgua, 100);
        assert.ok(visao.adversario.tabuleiro.flat().every(c => c === null));
      }
      prepararJogador(jogo, 0);
      prepararJogador(jogo, 1);
      jogo.iniciar();
      assert.equal(jogo.estado.vez, 1);
    });
  }

  for (const status of ['preparacao', 'jogando', 'derrotado']) {
    it(`um tabuleiro isolado também reinicia depois de ${status}`, () => {
      const t = novoTabuleiro(status !== 'preparacao');
      if (status === 'jogando') t.atacar(0, 0);
      if (status === 'derrotado') for (const alvo of ALVOS) t.atacar(...alvo);
      assert.equal(t.estado.status, status);
      t.reiniciar();
      assert.equal(t.estado.status, 'preparacao');
      assert.equal(t.estado.quantidadeNavios, 0);
      assert.equal(t.estado.casasOcupadas, 0);
      assert.equal(t.estado.tiros, 0);
      assert.equal(t.estado.acertos, 0);
      assert.equal(t.frotaCompleta, false);
      assert.ok(t.estado.tabuleiro.flat().every(c => c.navio === null && !c.atacada));
    });
  }

  it('alterar opções e estados retornados não muda os nomes ou tabuleiros internos', () => {
    const jogadores = ['Ana', 'Bia'];
    const jogo = new BatalhaNaval({ jogadores });
    jogadores[0] = 'Alterado';
    prepararJogador(jogo, 0);
    const estado = jogo.estado;
    estado.jogadores[0] = 'Outro';
    estado.prontos[0] = false;
    const visao = jogo.visaoDoJogador(0);
    visao.proprio.navios[0].casas[0].linha = 99;
    visao.adversario.tabuleiro[0][0] = 'afundado';
    assert.equal(jogo.estado.jogadores[0], 'Ana');
    assert.equal(jogo.estado.prontos[0], true);
    assert.equal(jogo.visaoDoJogador(0).proprio.navios[0].casas[0].linha, 0);
    assert.equal(jogo.visaoDoJogador(0).adversario.tabuleiro[0][0], null);
  });

  it('partidas novas não compartilham navios, tiros ou vencedor', () => {
    const a = novaPartida();
    const b = new BatalhaNaval();
    a.atacar(0, 0, 0);
    assert.equal(b.estado.status, 'preparacao');
    assert.equal(b.estado.turnos, 0);
    assert.equal(b.estado.vencedor, null);
    assert.deepEqual(b.estado.prontos, [false, false]);
    assert.equal(b.visaoDoJogador(0).proprio.quantidadeNavios, 0);
  });
});
