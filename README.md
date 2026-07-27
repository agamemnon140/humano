# humano

App para **decidir** o que treinar, não só consultar. Mapa muscular interativo, catálogo de
exercícios e atividades do cotidiano, queixas comuns, e um construtor de sessão que soma a
cobertura de vários exercícios sobre o mesmo corpo.

```bash
npm install
npm run dev        # localhost:5173/humano/
npm test           # 107 testes, todos de lógica pura
npm run lint       # oxlint
npm run build      # tsc -b && vite build
npm run toque      # dirige a app num Chrome real (precisa de build feito)
npm run preview    # serve dist/ — é aqui que se testa PWA e offline, nunca em dev
npm run icones     # regenera os PNGs a partir de public/icon.svg
```

Para testar no celular: `npm run preview -- --host` e abrir o IP da LAN. A emulação de
dispositivo do devtools mente sobre o tamanho dos alvos de toque, que é justamente o que
precisa ser validado numa app mobile-first com músculos pequenos.

## O que tem

| | |
|---|---|
| **Corpo** | Frente e costas, camada superficial e profunda. O cursor sobre um músculo nomeia-o na hora, com o nível se ele estiver pintado; o toque abre a ficha com os melhores exercícios para ele, em três seções separadas. |
| **Exercícios** | 59 atividades com filtro por tipo, padrão de movimento e equipamento. Busca aceita português, inglês e sinônimos. Selecionar um exercício pinta o corpo. |
| **Queixas** | 9 queixas comuns com sinais de alarme, músculos a fortalecer, o que evitar na fase aguda, e um selo de força de evidência por afirmação. |
| **Sessão** | Monte uma lista e o corpo acende com a cobertura somada: lacunas por região, músculos sobrecarregados e conflitos com uma queixa marcada como ativa. |

## Decisões que estruturam o código

**A escala é ordinal, de propósito.** Primário, secundário e estabilizador — nunca um score
0–100, que implicaria uma precisão de EMG que não existe publicamente para a maioria dos
exercícios. Consequência prática: na sessão, o nível de um músculo é o **máximo** entre os
exercícios selecionados, nunca a soma. Dois secundários não fazem um primário. A contagem
existe, mas só para ordenar a lista de sobrecarga (`src/lib/sessao.ts`).

**`encurta` e `inibe` são relações de primeira classe**, ao lado dos três níveis. É o que
permite modelar "ficar sentado", que não *trabalha* músculo nenhum mas encurta o psoas e
inibe o glúteo. Toda afirmação desse tipo carrega `evidenciaPostural`, porque o modelo das
síndromes cruzadas é um mapa mental útil com suporte experimental fino — e seria incoerente
exigir selo de evidência nas queixas e não aqui.

**As regras de conflito casam por `atividadeId` ou por `padrao`.** Regras no nível do padrão
de movimento fazem o motor funcionar em exercícios que ninguém catalogou ainda: marcar dor
lombar como ativa e adicionar um exercício de dobradiça de quadril gera aviso mesmo que esse
exercício nunca tenha sido enumerado na ficha da queixa. Id explícito ganha do padrão, para
uma exceção curada poder rebaixar um aviso genérico. E se a queixa **prioriza** a atividade,
a recomendação ganha do padrão — a ponte de glúteo é dobradiça de quadril, mas dor lombar a
recomenda, e recomendar e alertar a mesma coisa é a forma mais rápida de perder a confiança
de quem usa.

**A sobrecarga não conta trabalho de estabilização.** O core estabiliza em quase tudo; se
pontos de estabilizador contassem para o limiar, o transverso do abdômen apareceria
sobrecarregado em toda sessão. O limiar olha só primário e secundário (`pontosDiretos`).

**O que pinta o corpo é estado separado do que está aberto.** Vale para exercício, queixa e
músculo: fechar a ficha mantém a coloração, e uma faixa acima do corpo narra o que está
pintado, com um ✕ para sair. Sem essa separação, fechar a ficha — que tapa a tela inteira e o
seletor de vista — apagava exatamente o que se queria ver depois de fechá-la, e tornava
inalcançável trocar de vista com um músculo selecionado.

**No hit-test, conter ganha de estar perto.** O toque no corpo não é resolvido pela árvore do
DOM, e sim por geometria: `resolver()` em `CorpoSVG.tsx` testa o ponto contra os `Path2D` dos
músculos da camada visível, primeiro por conter, depois por proximidade em anéis crescentes.
Empate resolve-se pela ordem de desenho — ganha quem está por cima, que é quem se vê. Isso
substituiu um traço largo e invisível sobre cada forma, que media mal nas duas pontas: dava
~3px de folga e ao mesmo tempo roubava o interior dos vizinhos. `npm run toque` defende a
afirmação que interessa: **o toque responde o músculo que está pintado sob o ponto**, em 84
pontos das duas vistas.

**A camada de dados não conhece o renderizador.** Toda a lógica produz `MapaDeRealce`
(`Map<MusculoId, EstadoRealce>`) com tons *semânticos* — sem cores, sem coordenadas, sem
geometria. As cores vivem em CSS, seletores `.musculo[data-tom=...]`. Trocar o mapa 2D por
um modelo 3D é substituir uma linha em [src/components/corpo/index.ts](src/components/corpo/index.ts).
A única concessão ao 2D é `vista: 'frente' | 'costas'`, documentada como *dica de câmara*:
o SVG troca de arquivo de geometria, um render 3D animaria o azimute.

## O desenho

54 formas escritas à mão em `src/data/geometria-{frente,costas}.json` — só o atributo `d`,
nada mais. Um único `<CorpoSVG>` renderiza tudo.

- `viewBox="0 0 480 1000"` partilhado pelas duas vistas, linha média em `x = 240`.
- **Desenha-se só a metade `x >= 240`.** Cada músculo tem um `<path>` em `<defs>` e dois
  `<use>`, um com `translate(480,0) scale(-1,1)`. O `d` existe uma vez e a simetria é
  garantida. No hit-test o espelho não precisa de existir: um ponto com `x < 240` é refletido
  para `480 - x` antes de ser testado, contra a única metade que tem geometria.
- O `<path>` em `<defs>` **não pode ter `fill`**, senão a instância espelhada deixa de herdar
  a cor. Isso é estruturalmente impossível de quebrar porque o JSON só guarda `d`.
- Comandos absolutos apenas (`M`, `L`, `C`, `Z`): um path relativo não é revisável.
- `src/data/geometria-marcos.json` fixa a armadura anatômica (acrômio, umbigo, grande
  trocanter…). É ela que impede 54 formas de derivarem umas das outras.

Geometria como **dados** e não como JSX foi a escolha decisiva: com `environment: 'node'`,
a consistência desenho↔dados testa-se comparando chaves de objeto, sem jsdom.

### `src/lib/geometria.test.ts`

Sete asserções que tornam esse volume de desenho manual tratável: cobertura, ausência de
órfãos, `d` bem-formado, coordenadas dentro do viewBox (apanha um ponto decimal perdido, que
apagaria a figura inteira), convenção do espelho, centroide na faixa vertical da região, e —
a de maior valor — **nenhum `d` duplicado dentro da mesma vista**. Copiar-colar-e-esquecer-de-editar
é o erro mais provável aqui e é invisível na tela, porque o duplicado assenta exatamente
sob o original.

A constante `POR_DESENHAR` é o portão de sequenciamento: um músculo sem geometria só passa se
estiver nela, e o teste também falha se a lista contiver um id que já foi desenhado, então ela
não apodrece. Está vazia e deve continuar assim.

## Conteúdo de saúde

A aba chama-se **Queixas comuns**, não "Lesões": lesão implicaria um diagnóstico que a app não
pode fazer. A palavra "tratamento" não aparece; usa-se "o que costuma ajudar". Os sinais de
alarme são o **primeiro** elemento de cada ficha, nunca o rodapé.

`src/lib/dados.test.ts` exige de cada queixa pelo menos três sinais de alarme, pelo menos uma
fonte, e `evidencia` válida em cada alegação. Essa restrição é o que impede o conteúdo de
derivar para invenção confiante.

Exige também que **todo músculo que uma queixa manda fortalecer tenha algum exercício que o
treine**. Sem isso o usuário toca no chip e recebe lista vazia — foi justamente esse teste
que revelou que o catálogo prescrevia fortalecer extensores do antebraço, tibial anterior e
subescapular sem ter um único exercício para nenhum deles.

Nada disto substitui avaliação profissional.

## Estrutura

```
src/
  types.ts                 contrato inteiro: MapaDeRealce, Musculo, Atividade, Lesao
  data/                    JSON curado + index.ts (Maps e índices no carregamento do módulo)
  lib/                     lógica pura, testes colocados ao lado
  hooks/                   useAbaHash, useArmazenado
  components/corpo/        renderizador + index.ts ← ponto único de troca 2D→3D
  components/{mapa,exercicios,lesoes,sessao,shell}/
scripts/toque.mjs          verificação da interação num Chrome real
```

`CorpoComLeitura` envolve `Corpo` (nunca `CorpoSVG`) e acrescenta a linha que nomeia o músculo
sob o cursor. Um renderizador 3D herda-a de graça: só precisa de chamar `onDestacar`.

Convenções herdadas dos projetos vizinhos: Vite + React 19 + TS, oxlint, aspas simples, sem
ponto-e-vírgula, Vitest em `environment: 'node'` com testes apenas de lógica pura.

## Lacunas conhecidas

Com `environment: 'node'`, a interação do `CorpoSVG` não tem teste unitário — é a regra da
casa e fica. O que era verificação manual passou a ser `npm run toque`, que dirige a app num
Chrome real e defende oito afirmações: toque igual ao pintado nas duas vistas, espelho com o
mesmo músculo, toque de dedo abrindo a ficha certa, realce sobrevivendo ao fechar, aviso ao
trocar para uma vista onde o músculo não existe, clique no vazio limpando, e nenhum erro de
JavaScript. Usa o Chrome instalado via `puppeteer-core`, sem descarregar navegador; defina
`CHROME_PATH` se ele não estiver num caminho comum.

**Músculos finos exigem precisão.** Medido em viewport de 390px: o tensor da fáscia lata tem
12px de largura na tela, o tibial anterior 13px — abaixo dos 24px mínimos da WCAG 2.2. A
proximidade em anéis só alcança espaço vazio (a borda do corpo, o pescoço, o vão entre as
pernas), porque conter ganha primeiro; entre dois músculos vizinhos o toque continua a ter de
ser certeiro. A lista de músculos é o caminho preciso e existe para isso. A correção de fundo
é zoom e arrasto no mapa, que ainda não existe.

Fora do alcance do `npm run toque`: proporção e legibilidade num telefone físico, e o PWA
offline, que só se testa em `preview` com modo avião — nunca em `dev`.
