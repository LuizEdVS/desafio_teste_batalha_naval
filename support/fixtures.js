import assert from 'node:assert/strict';
import { Tabuleiro, BatalhaNaval } from '../src/batalha-naval.js';

export const POSICOES = [
  { id: 'porta-avioes', linha: 0, coluna: 0, orientacao: 'horizontal',
    casas: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'encouracado', linha: 2, coluna: 0, orientacao: 'horizontal',
    casas: [[2, 0], [2, 1], [2, 2], [2, 3]] },
  { id: 'submarino', linha: 4, coluna: 0, orientacao: 'horizontal',
    casas: [[4, 0], [4, 1], [4, 2]] },
  { id: 'destroier', linha: 6, coluna: 0, orientacao: 'horizontal',
    casas: [[6, 0], [6, 1]] },
];
export const ALVOS = POSICOES.flatMap(navio => navio.casas);
export const AGUA = [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6],
  [9, 7], [9, 8], [9, 9], [8, 0], [8, 1], [8, 2], [8, 3]];

export function posicionarFrota(tabuleiro) {
  for (const n of POSICOES) tabuleiro.posicionarNavio(n.id, n.linha, n.coluna, n.orientacao);
  return tabuleiro;
}

export function novoTabuleiro(iniciar = true) {
  const tabuleiro = posicionarFrota(new Tabuleiro());
  if (iniciar) tabuleiro.iniciar();
  return tabuleiro;
}

export function prepararJogador(jogo, jogador) {
  for (const n of POSICOES) jogo.posicionarNavio(jogador, n.id, n.linha, n.coluna, n.orientacao);
}

export function novaPartida(opcoes = {}, iniciar = true) {
  const jogo = new BatalhaNaval(opcoes);
  prepararJogador(jogo, 0);
  prepararJogador(jogo, 1);
  if (iniciar) jogo.iniciar();
  return jogo;
}

export function concluirPartida(jogo, vencedor = 0) {
  for (let i = 0; i < ALVOS.length; i += 1) {
    if (jogo.estado.vez !== vencedor) jogo.atacar(1 - vencedor, ...AGUA[i]);
    jogo.atacar(vencedor, ...ALVOS[i]);
  }
  assert.equal(jogo.estado.status, 'concluida');
  assert.equal(jogo.estado.vencedor, vencedor);
}

export function snapshot(alvo) {
  return alvo instanceof BatalhaNaval
    ? { estado: alvo.estado, jogador0: alvo.visaoDoJogador(0), jogador1: alvo.visaoDoJogador(1) }
    : { estado: alvo.estado, adversario: alvo.visaoAdversario };
}

export function rejeitaSemAlterar(alvo, acao, mensagem) {
  const antes = snapshot(alvo);
  assert.throws(acao, mensagem);
  assert.deepEqual(snapshot(alvo), antes);
}
