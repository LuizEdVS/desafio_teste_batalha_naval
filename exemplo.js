import { BatalhaNaval } from './src/batalha-naval.js';

const jogo = new BatalhaNaval({ jogadores: ['Ana', 'Bia'] });
const colocacoes = [['porta-avioes', 0, 0], ['encouracado', 2, 0], ['submarino', 4, 0], ['destroier', 6, 0]];
for (const jogador of [0, 1]) {
  for (const [id, linha, coluna] of colocacoes) jogo.posicionarNavio(jogador, id, linha, coluna);
}
jogo.iniciar();
console.log('Batalha Naval: dois jogadores, tabuleiros 10 × 10, quatro navios e 14 segmentos por frota.');
console.log('Coordenadas no formato (linha, coluna), começando em zero.');

// Sequência conhecida para demonstrar acertos, água, afundamentos e vitória.
const alvos = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [2, 0], [2, 1],
  [2, 2], [2, 3], [4, 0], [4, 1], [4, 2], [6, 0], [6, 1]];
const agua = [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6],
  [9, 7], [9, 8], [9, 9], [8, 0], [8, 1], [8, 2]];

for (let i = 0; i < alvos.length; i += 1) {
  const tiro = jogo.atacar(0, ...alvos[i]);
  console.log(`Ana ataca (${tiro.linha}, ${tiro.coluna}): ${tiro.resultado}${tiro.navio ? ` — ${tiro.navio}` : ''}.`);
  if (jogo.estado.vencedor !== null) break;
  const resposta = jogo.atacar(1, ...agua[i]);
  console.log(`Bia ataca (${resposta.linha}, ${resposta.coluna}): ${resposta.resultado}.`);
}

console.log(`\nVencedora: ${jogo.estado.jogadores[jogo.estado.vencedor]}. Turnos: ${jogo.estado.turnos}.`);
console.log('Visão final dos alvos de Ana: # afundado; . casa não atacada.');
for (const linha of jogo.visaoDoJogador(0).adversario.tabuleiro) {
  console.log(linha.map(c => c === 'afundado' ? '#' : c === null ? '.' : c === 'agua' ? '~' : 'X').join(' '));
}
console.log(`Navios afundados: ${jogo.visaoDoJogador(0).adversario.afundados.length}.`);
jogo.reiniciar();
console.log(`Após reiniciar: ${jogo.estado.status}; turnos: ${jogo.estado.turnos}; nenhum navio posicionado.`);
