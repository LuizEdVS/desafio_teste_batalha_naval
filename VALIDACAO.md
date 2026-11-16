# Validação local

Verificação realizada em 16/11/2026, no Windows, com Node.js `v24.22.1`.

Comando executado na raiz do projeto:

```sh
node --test
```

Resultado:

```text
tests 133
suites 10
pass 133
fail 0
cancelled 0
skipped 0
todo 0
```

A suíte verifica tabuleiros 10 × 10 com um Porta-aviões de cinco casas, um Encouraçado de quatro, um Submarino de três e um Destroier ou Hidroavião de duas. Cobre 14 segmentos, 86 casas de água, orientações, limites, sobreposição, tiros, afundamentos, turnos, visibilidade, vitória e reinício.

Também foi executado `node exemplo.js`: a partida terminou com vitória de Ana, quatro navios afundados e 27 turnos. O reinício restaurou a preparação sem navios ou tiros.

O workflow executa os testes em Node.js 22 e 24. Os resultados da integração contínua ficam na aba [Actions do repositório](https://github.com/LuizEdVS/desafio_teste_batalha_naval/actions).
