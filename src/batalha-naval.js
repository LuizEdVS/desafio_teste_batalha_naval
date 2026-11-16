export const TAMANHO = 10;
export const FROTA = Object.freeze([
  { id: 'porta-avioes', nome: 'Porta-aviões', tamanho: 5 },
  { id: 'encouracado', nome: 'Encouraçado', tamanho: 4 },
  { id: 'submarino', nome: 'Submarino', tamanho: 3 },
  { id: 'destroier', nome: 'Destroier', tamanho: 2 },
].map(navio => Object.freeze(navio)));
const TOTAL_SEGMENTOS = 14;

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

export function coordenadaValida(linha, coluna) {
  return Number.isInteger(linha) && linha >= 0 && linha < TAMANHO
    && Number.isInteger(coluna) && coluna >= 0 && coluna < TAMANHO;
}

function validarCoordenada(linha, coluna) {
  exigir(coordenadaValida(linha, coluna), 'Coordenada inválida: linha e coluna devem estar entre 0 e 9.');
}

function normalizarNavio(id) {
  const normalizado = id === 'hidroaviao' ? 'destroier' : id;
  exigir(FROTA.some(navio => navio.id === normalizado), 'Navio inválido.');
  return normalizado;
}

export function calcularCasas(id, linha, coluna, orientacao = 'horizontal') {
  const normalizado = normalizarNavio(id);
  validarCoordenada(linha, coluna);
  exigir(orientacao === 'horizontal' || orientacao === 'vertical', 'Orientação inválida: use horizontal ou vertical.');
  const tamanho = FROTA.find(navio => navio.id === normalizado).tamanho;
  const casas = Array.from({ length: tamanho }, (_, i) => ({
    linha: linha + (orientacao === 'vertical' ? i : 0),
    coluna: coluna + (orientacao === 'horizontal' ? i : 0),
  }));
  exigir(casas.every(c => coordenadaValida(c.linha, c.coluna)), 'O navio ficaria fora do tabuleiro.');
  return casas;
}

export class Tabuleiro {
  #grade;
  #navios;
  #tiros;
  #acertos;
  #status;

  constructor() {
    this.reiniciar();
  }

  get frotaCompleta() {
    return this.#navios.size === FROTA.length;
  }

  get estado() {
    const casasOcupadas = [...this.#navios.values()].reduce((total, navio) => total + navio.casas.length, 0);
    return structuredClone({
      tamanho: TAMANHO, totalCasas: 100, status: this.#status,
      quantidadeNavios: this.#navios.size, frotaCompleta: this.frotaCompleta,
      casasOcupadas, casasAgua: 100 - casasOcupadas, casasIntactas: casasOcupadas - this.#acertos,
      tiros: this.#tiros.size, acertos: this.#acertos, agua: this.#tiros.size - this.#acertos,
      navios: FROTA.map(definicao => {
        const navio = this.#navios.get(definicao.id);
        return { ...definicao, colocado: Boolean(navio), casas: navio?.casas ?? [],
          acertos: navio?.acertos ?? 0, afundado: Boolean(navio && navio.acertos === definicao.tamanho) };
      }),
      tabuleiro: this.#grade.map((linha, l) => linha.map((navio, c) => ({
        navio, atacada: this.#tiros.has(l * TAMANHO + c),
      }))),
    });
  }

  get visaoAdversario() {
    return structuredClone({
      tamanho: TAMANHO, status: this.#status,
      tiros: this.#tiros.size, acertos: this.#acertos, agua: this.#tiros.size - this.#acertos,
      afundados: FROTA.filter(n => this.#navios.get(n.id)?.acertos === n.tamanho),
      tabuleiro: this.#grade.map((linha, l) => linha.map((id, c) => {
        if (!this.#tiros.has(l * TAMANHO + c)) return null;
        if (id === null) return 'agua';
        const navio = this.#navios.get(id);
        return navio.acertos === navio.casas.length ? 'afundado' : 'atingido';
      })),
    });
  }

  #exigirPreparacao() {
    exigir(this.#status === 'preparacao', 'A frota só pode ser alterada durante a preparação.');
  }

  posicionarNavio(id, linha, coluna, orientacao = 'horizontal') {
    this.#exigirPreparacao();
    const normalizado = normalizarNavio(id);
    exigir(!this.#navios.has(normalizado), 'Este navio já foi posicionado.');
    const casas = calcularCasas(normalizado, linha, coluna, orientacao);
    exigir(casas.every(c => this.#grade[c.linha][c.coluna] === null), 'Os navios não podem se sobrepor.');
    for (const casa of casas) this.#grade[casa.linha][casa.coluna] = normalizado;
    this.#navios.set(normalizado, { casas, acertos: 0 });
    return this.estado;
  }

  removerNavio(id) {
    this.#exigirPreparacao();
    const normalizado = normalizarNavio(id);
    const navio = this.#navios.get(normalizado);
    exigir(Boolean(navio), 'Este navio ainda não foi posicionado.');
    for (const casa of navio.casas) this.#grade[casa.linha][casa.coluna] = null;
    this.#navios.delete(normalizado);
    return this.estado;
  }

  iniciar() {
    this.#exigirPreparacao();
    exigir(this.frotaCompleta, 'Posicione os quatro navios antes de iniciar.');
    this.#status = 'jogando';
    return this.estado;
  }

  atacar(linha, coluna) {
    exigir(this.#status === 'jogando', 'O tabuleiro deve estar em jogo para receber tiros.');
    validarCoordenada(linha, coluna);
    const chave = linha * TAMANHO + coluna;
    exigir(!this.#tiros.has(chave), 'Esta casa já foi atacada.');
    this.#tiros.add(chave);
    const id = this.#grade[linha][coluna];
    let resultado = 'agua';
    let navioAfundado = null;
    if (id !== null) {
      const navio = this.#navios.get(id);
      navio.acertos += 1;
      this.#acertos += 1;
      resultado = navio.acertos === navio.casas.length ? 'afundado' : 'atingido';
      if (resultado === 'afundado') navioAfundado = id;
      if (this.#acertos === TOTAL_SEGMENTOS) this.#status = 'derrotado';
    }
    return { linha, coluna, resultado, navio: navioAfundado, frotaDestruida: this.#status === 'derrotado' };
  }

  reiniciar() {
    this.#grade = Array.from({ length: TAMANHO }, () => Array(TAMANHO).fill(null));
    this.#navios = new Map();
    this.#tiros = new Set();
    this.#acertos = 0;
    this.#status = 'preparacao';
    return this.estado;
  }
}

function validarJogador(jogador) {
  exigir(jogador === 0 || jogador === 1, 'Jogador inválido: use 0 ou 1.');
}

export class BatalhaNaval {
  #jogadores;
  #primeiroJogador;
  #tabuleiros;
  #status;
  #vez;
  #vencedor;
  #turnos;
  #ultimoTiro;

  constructor({ jogadores = ['Jogador 1', 'Jogador 2'], primeiroJogador = 0 } = {}) {
    exigir(Array.isArray(jogadores) && jogadores.length === 2, 'São necessários dois jogadores.');
    const nomes = Array.from(jogadores);
    exigir(nomes.every(n => typeof n === 'string' && n.trim().length > 0), 'Nome de jogador inválido.');
    const normalizados = nomes.map(n => n.trim());
    exigir(new Set(normalizados).size === 2, 'Os jogadores devem ter nomes diferentes.');
    validarJogador(primeiroJogador);
    this.#jogadores = normalizados;
    this.#primeiroJogador = primeiroJogador;
    this.reiniciar();
  }

  get estado() {
    return structuredClone({
      jogadores: this.#jogadores, status: this.#status,
      primeiroJogador: this.#primeiroJogador, vez: this.#vez, vencedor: this.#vencedor,
      turnos: this.#turnos, prontos: this.#tabuleiros.map(t => t.frotaCompleta), ultimoTiro: this.#ultimoTiro,
    });
  }

  #exigirPreparacao() {
    exigir(this.#status === 'preparacao', 'A partida deve estar em preparação.');
  }

  posicionarNavio(jogador, id, linha, coluna, orientacao = 'horizontal') {
    validarJogador(jogador);
    this.#exigirPreparacao();
    this.#tabuleiros[jogador].posicionarNavio(id, linha, coluna, orientacao);
    return this.estado;
  }

  removerNavio(jogador, id) {
    validarJogador(jogador);
    this.#exigirPreparacao();
    this.#tabuleiros[jogador].removerNavio(id);
    return this.estado;
  }

  iniciar() {
    this.#exigirPreparacao();
    exigir(this.#tabuleiros.every(t => t.frotaCompleta), 'Os dois jogadores precisam posicionar os quatro navios.');
    for (const tabuleiro of this.#tabuleiros) tabuleiro.iniciar();
    this.#status = 'jogando';
    this.#vez = this.#primeiroJogador;
    return this.estado;
  }

  visaoDoJogador(jogador) {
    validarJogador(jogador);
    return { estado: this.estado, proprio: this.#tabuleiros[jogador].estado,
      adversario: this.#tabuleiros[1 - jogador].visaoAdversario };
  }

  atacar(jogador, linha, coluna) {
    validarJogador(jogador);
    exigir(this.#status === 'jogando', 'A partida deve estar em jogo para receber tiros.');
    exigir(jogador === this.#vez, 'Não é a vez deste jogador.');
    const adversario = 1 - jogador;
    const tiro = this.#tabuleiros[adversario].atacar(linha, coluna);
    this.#turnos += 1;
    if (tiro.frotaDestruida) {
      this.#status = 'concluida';
      this.#vencedor = jogador;
      this.#vez = null;
    } else this.#vez = adversario;
    this.#ultimoTiro = { ...tiro, jogador, adversario, vezSeguinte: this.#vez, vencedor: this.#vencedor };
    return structuredClone(this.#ultimoTiro);
  }

  reiniciar() {
    this.#tabuleiros = [new Tabuleiro(), new Tabuleiro()];
    this.#status = 'preparacao';
    this.#vez = null;
    this.#vencedor = null;
    this.#turnos = 0;
    this.#ultimoTiro = null;
    return this.estado;
  }
}
