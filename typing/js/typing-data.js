/**
 * Typing Test — Content Data & Text Generation
 * Word lists, sentences, paragraphs, code snippets, number generators.
 * Pure data + generator functions. No DOM access.
 *
 * All generators accept an optional rng function () => number in [0,1)
 * so results can be deterministic (daily challenge) or Math.random-based.
 */

window.TypingData = (function () {
  'use strict';

  /* ------------------------------------------------------------------
     Word pools
     ------------------------------------------------------------------ */

  const EN_COMMON = (
    'the of and to in is you that it he was for on are as with his they I at be this have ' +
    'from or one had by word but not what all were we when your can said there use an each ' +
    'which she do how their if will up other about out many then them these so some her would ' +
    'make like him into time has look two more write go see number no way could people my than ' +
    'first water been call who oil its now find long down day did get come made may part over ' +
    'new sound take only little work know place year live me back give most very after thing ' +
    'our just name good sentence man think say great where help through much before line right ' +
    'too mean old any same tell boy follow came want show also around form three small set put ' +
    'end does another well large must big even such because turn here why ask went men read ' +
    'need land different home us move try kind hand picture again change off play spell air ' +
    'away animal house point page letter mother answer found study still learn should world ' +
    'high every near add food between own below country plant last school father keep tree ' +
    'never start city earth eye light thought head under story saw left few while along might ' +
    'close something seem next hard open example begin life always those both paper together ' +
    'got group often run important until children side feet car mile night walk white sea began ' +
    'grow took river four carry state once book hear stop without second later miss idea enough ' +
    'eat face watch far real almost let above girl sometimes mountain cut young talk soon list ' +
    'song being leave family friends other ready simple clear quick brown fox jumps lazy system ' +
    'value error event list data code type test'
  ).split(/\s+/);

  const EN_RANDOM = (
    'design rhythm canvas pixel vector motion edit frame color layout grid type serif sans ' +
    'mono kerning contrast accent margin padding border shadow button cursor screen mobile ' +
    'desktop browser interface prototype wireframe user flow system token style theme warm ' +
    'linen editorial swiss poster brand logo mark glyph symbol icon craft detail focus clarity ' +
    'fast smooth sharp clean bold quiet calm precise honest useful durable flexible modern ' +
    'classic texture grain paper ink print press gallery studio client brief idea sketch draft ' +
    'refine ship build test learn improve measure observe listen speak write read think make ' +
    'break fix try fail win pace tempo beat cut scene story sound voice music lens camera ' +
    'depth grade export render timeline keyframe speed ramp transition mask track effect layer ' +
    'blend opacity fill stroke path anchor curve node mesh dpi trim bleed stock proof mockup ' +
    'deck pitch tone mood guide library component variant state hover active disabled radius ' +
    'spacing scale hierarchy balance alignment proximity affordance signifier feedback ' +
    'constraint mapping visibility archive method craft order logic rhythm pulse signal spark ' +
    'drift forge grasp hint index juice knack locus merit nerve orbit prism quest resin scope ' +
    'trait unity vivid wager yield zeal amber badge crane dune ember fjord glade harbor ' +
    'ivory jasper knoll lagoon maple nimbus onyx pearl quarry ridge summit thistle umber ' +
    'verdant willow xenial yonder zenith bloom'
  ).split(/\s+/);

  const EN_ADVANCED = (
    'algorithm asynchronous bureaucratic charismatic conscientious discrepancy embellishment ' +
    'phenomenological quintessential reconnaissance sophisticated unprecedented vulnerability ' +
    'juxtaposition mercurial obfuscation perennial rhapsody supercilious transience ubiquitous ' +
    'vernacular whimsical ambidextrous bombastic cacophony deleterious ephemeral formidable ' +
    'garrulous harangue iconoclast jettison kinetic lamentable maelstrom nebulous obsequious ' +
    'panacea resplendent salubrious taciturn umbrage vacillate wistful zephyr anachronism ' +
    'bourgeoisie cacophony didactic ephemeral fortuitous gesticulate hyperbole idiosyncrasy ' +
    'juxtapose kaleidoscope lament lucid machination nadir obstinate paradox quixotic rhetoric ' +
    'sycophant tenacious ubiquitous virtuoso zealous anthology buoyant conjecture dichotomy ' +
    'enigma fastidious galvanize heterogeneous idyllic jubilant kinesthetic labyrinthine ' +
    'metamorphosis nostalgic obfuscate paradigm quintessence recalcitrant somnolent ' +
    'transcendent untenable wistful'
  ).split(/\s+/);

  const ES_WORDS = (
    'el la de que y a en un ser se no por con su para como estar tener le si me ya o este ' +
    'sí porque esta entre cuando muy sin sobre también hasta hay donde quien desde todo nos ' +
    'durante todos uno les ni contra otros ese eso ante ellos esto antes algunos unos yo otro ' +
    'otras otra él tanto esa estos mucho quienes nada muchos cual poco ella estas algunas algo ' +
    'nosotros mujer hombre niño día año vida mundo tiempo mano parte lugar caso punto vez forma ' +
    'agua fuego tierra aire ciudad casa puerta mesa libro papel palabra historia nombre madre ' +
    'padre hijo hija amigo trabajo escuela camino campo cielo luna sol estrella flor árbol ' +
    'pájaro perro gato comer beber dormir caminar correr leer escribir jugar cantar mirar ' +
    'pensar saber poder querer decir hacer dar ver venir salir volver encontrar llevar dejar ' +
    'seguir pasar sentir creer hablar grande pequeño nuevo bueno malo joven rápido lento fácil ' +
    'difícil claro oscuro frío caliente alegría triste paz guerra amor guerra luz sombra'
  ).split(/\s+/);

  const FR_WORDS = (
    'le la de un une et en qui que pour dans ce il être à sur avec ne pas plus par faire ' +
    'comme mais nous son ou se cette leur homme femme temps jour année vie monde main partie ' +
    'lieu cas point fois forme eau feu terre air ville maison porte livre mot histoire nom ' +
    'mère père ami travail école chemin ciel lune soleil arbre oiseau chien chat manger boire ' +
    'dormir marcher courir lire écrire jouer regarder penser savoir pouvoir vouloir dire voir ' +
    'venir sortir trouver laisser suivre sentir croire parler grand petit nouveau bon mauvais ' +
    'jeune rapide lent facile difficile clair obscur froid chaud joie tristesse paix guerre ' +
    'amour lumière ombre fleur rivière montagne forêt mer vent pluie neige beau jeune russe ' +
    'toujours jamais encore ici là-bas maintenant hier aujourd\'hui demain tôt tard ensemble ' +
    'seul chaque aucun plusieurs tout rien personne quelque chose'
  ).split(/\s+/);

  const DE_WORDS = (
    'der die das und in den von zu mit sich des auf für ist im dem nicht ein eine als auch es ' +
    'an werden aus er hat dass sie nach wird bei einer um am sind noch wie einem über einen so ' +
    'zum war haben nur oder aber vor zur bis mehr durch man sein wurde prozent wir soll ich ' +
    'uns du wenn hier gibt keine schon jahr zeit mann frau kind tag welt leben hand teil platz ' +
    'punkt mal form wasser feuer erde luft stadt haus tür tafel buch papier wort geschichte ' +
    'name mutter vater freund arbeit schule weg himmel mond sonne baum vogel hund katze essen ' +
    'trinken schlafen gehen laufen lesen schreiben spielen singen sehen denken wissen können ' +
    'wollen sagen machen geben kommen finden lassen sprechen groß klein neu gut schlecht jung ' +
    'schnell langsam leicht schwer hell dunkel kalt warm freude traurig frieg lieber licht ' +
    'schatten blume fluss berg wald meer wind regen schnee schön bitte danke ja nein vielleicht'
  ).split(/\s+/);

  /* ------------------------------------------------------------------
     Sentences & paragraphs per difficulty
     ------------------------------------------------------------------ */

  const SENTENCES = {
    en: {
      beginner: [
        'The cat sat by the window and watched the rain fall.',
        'A small dog ran across the green field.',
        'She read a book and drank her tea.',
        'The sun went down behind the tall trees.',
        'We walked to the park after school.',
        'He wrote a short note and left it on the table.',
        'The train arrived at the station on time.',
        'My friend called me from the city last night.',
        'Birds sang early in the cold morning.',
        'The children played games until dark.'
      ],
      intermediate: [
        'The best way to predict the future is to design it with intention and care.',
        'Although the deadline was tight, the team delivered every feature on schedule.',
        'A well placed margin can transform an ordinary layout into a quiet composition.',
        'She paused for a moment, then continued typing without looking at the keyboard.',
        'Good design is as little design as possible, but never less than required.',
        'The editor trimmed the scene until only the essential frames remained.',
        'Numbers, symbols, and punctuation all demand their own kind of rhythm.',
        'He practised for thirty minutes each morning before the house woke up.',
        'The prototype answered questions that no amount of discussion could resolve.',
        'Consistency matters more than speed when you are learning a new skill.'
      ],
      advanced: [
        'The architect\'s methodology juxtaposed brutalist restraint with ephemeral lightness, producing a structure that felt simultaneously monumental and transient.',
        'Despite the bureaucratic obfuscation surrounding the project, the team persisted, meticulously documenting every discrepancy for posterity.',
        'Typography, at its most rigorous, is the craft of endowing human language with a durable visual form; it demands both analytical precision and aesthetic judgement.',
        'Quantum researchers observed that the phenomenon remained obstinately paradoxical, resisting every attempts at simplistic interpretation.',
        'Her prose oscillated between sycophantic praise and scathing critique, leaving readers uncertain whether to celebrate or lament the review.',
        'The algorithm\'s asynchronous execution introduced a quintessential race condition, one that only manifested under exceptionally high concurrency.',
        'To juxtapose such disparate influences — swiss rationalism, japanese wabi-sabi, and nepali craft traditions — requires a sophisticated understanding of cultural nuance.'
      ]
    },
    es: {
      beginner: [
        'El gato se sentó cerca de la ventana y miró la lluvia.',
        'Mi familia vive en una casa pequeña cerca del río.',
        'Los niños jugaron en el parque hasta el anochecer.',
        'Ella leyó un libro y bebió su té en la tarde.',
        'El tren llegó a la estación puntualmente.'
      ],
      intermediate: [
        'La mejor manera de predecir el futuro es diseñarlo con intención y cuidado.',
        'Aunque el plazo era ajustado, el equipo entregó todas las funciones a tiempo.',
        'Un margen bien colocado puede transformar una composición ordinaria.',
        'Él practicó treinta minutos cada mañana antes de que despertara la casa.'
      ],
      advanced: [
        'La metodología del arquitecto yuxtapuso el restricción brutalista con una ligereza efímera, produciendo una estructura monumental y transitoria.',
        'A pesar de la burocracia que rodeaba el proyecto, el equipo persistió documentando meticulosamente cada discrepancia.'
      ]
    },
    fr: {
      beginner: [
        'Le chat s\'est assis près de la fenêtre et a regardé la pluie.',
        'Ma famille vit dans une petite maison près de la rivière.',
        'Les enfants ont joué dans le parc jusqu\'à la nuit.',
        'Elle a lu un buit et bu son thé dans l\'après-midi.',
        'Le train est arrivé à la gare à l\'heure.'
      ],
      intermediate: [
        'La meilleure façon de prédire l\'avenir est de le concevoir avec intention.',
        'Bien que le délai soit court, l\'équipe a livré toutes les fonctions à temps.',
        'Une marge bien placée peut transformer une composition ordinaire.'
      ],
      advanced: [
        'La méthodologie de l\'architecte juxtaposait la retenue brutaliste avec une légèreté éphémère, produisant une structure à la fois monumentale et transitoire.',
        'Malgré la bureaucratie entourant le projet, l\'équipe a persisté en documentant chaque discrepancy.'
      ]
    },
    de: {
      beginner: [
        'Die Katze saß am Fenster und beobachtete den Regen.',
        'Meine Familie lebt in einem kleinen Haus am Fluss.',
        'Die Kinder spielten im Park bis zum Abend.',
        'Sie las ein Buch und trank ihren Tee am Nachmittag.',
        'Der Zug kam pünktlich am Bahnhof an.'
      ],
      intermediate: [
        'Die beste Vorhersage der Zukunft entsteht durch bewusstes Gestalten.',
        'Obwohl die Frist knapp war, lieferte das Team alle Funktionen pünktlich.',
        'Ein gut gesetzter Rand kann eine gewöhnliche Komposition verwandeln.'
      ],
      advanced: [
        'Die Methodik des Architekten stellte brutale Zurückhaltung einer flüchtigen Leichtigkeit gegenüber und schuf ein monumentales wie transitorisches Bauwerk.',
        'Trotz der Bürokratie um das Projekt hielt das Team durch und dokumentierte jeden Widerspruch sorgfältig.'
      ]
    }
  };

  const PARAGRAPHS = {
    en: {
      beginner: [
        'Morning light moved slowly across the wooden floor. She made coffee, opened the window, and let the cool air fill the room. Outside, the street was quiet. A neighbour waved from across the road, and she waved back before sitting down to work.',
        'The library was almost empty. He chose a book near the window, sat in the tall chair, and read until the lamps came on. When he finally looked up, the sky had turned a deep, clear blue.'
      ],
      intermediate: [
        'Every craft has its quiet discipline. A writer returns to the same desk each morning, not because the words come easily, but because the ritual lowers the cost of beginning. Over months, small sessions compound into finished work. The secret is rarely inspiration; it is the patient arrangement of ordinary hours.',
        'The studio smelled of paper and coffee. On the wall, grids held swatches, schedules, and half finished sketches. When a client asked how long the identity would last, the designer answered honestly: good systems age slowly, but they must be allowed to breathe, adapt, and occasionally break their own rules.'
      ],
      advanced: [
        'The history of typography is, in no small part, a history of constraint. Movable type imposed modularity; the telegraph imposed brevity; the screen imposes resolution independence. Each generation of tools redefines what counts as clarity, and designers learn to treat limitation not as an obstacle but as the very material of their craft.',
        'Resilience is rarely dramatic. It is the accumulation of small corrections: a route adjusted, an assumption tested, a conversation held earlier than comfortable. Systems that survive are rarely the strongest at any single moment; they are the ones capable of learning fastest from their own errors.'
      ]
    },
    es: {
      beginner: [
        'La luz de la mañana se movía despacio por el piso de madera. Ella preparó café, abrió la ventana y dejó que el aire fresco llenara la habitación.',
        'La biblioteca estaba casi vacía. Él eligió un libro junto a la ventana y leyó hasta que se encendieron las lámparas.'
      ],
      intermediate: [
        'Cada oficio tiene su disciplina silenciosa. Un escritor vuelve al mismo escritorio cada mañana, no porque las palabras fluyan fácilmente, sino porque el ritual reduce el coste de empezar.'
      ],
      advanced: [
        'La historia de la tipografía es, en gran medida, una historia de limitaciones. La tipografía móvil impuso modularidad; la pantalla impuso independencia de resolución, y cada generación redefine la claridad.'
      ]
    },
    fr: {
      beginner: [
        'La lumière du matin se déplaçait lentement sur le plancher de bois. Elle a préparé du café et ouvert la fenêtre.',
        'La bibliothèque était presque vide. Il a choisi un livre près de la fenêtre et a lu jusqu\'à l\'allumage des lampes.'
      ],
      intermediate: [
        'Chaque métier a sa discipline silencieuse. Un écrivain revient au même bureau chaque matin, non parce que les mots viennent facilement, mais parce que le rituel réduit le coût du début.'
      ],
      advanced: [
        'L\'histoire de la typographie est, en grande partie, une histoire de contraintes. Chaque génération d\'outils redéfinit ce qui compte comme clarté, et les designers apprennent à traiter la limitation comme la matière même de leur métier.'
      ]
    },
    de: {
      beginner: [
        'Das Morgenlicht bewegte sich langsam über den Holzboden. Sie machte Kaffee und öffnete das Fenster.',
        'Die Bibliothek war fast leer. Er wählte ein Buch am Fenster und las, bis die Lampen angehen.'
      ],
      intermediate: [
        'Jedes Handwerk hat seine stille Disziplin. Ein Schriftsteller kehrt jeden Morgen an denselben Schreibtisch zurück, nicht weil die Worte leicht kommen, sondern weil das Ritual die Kosten des Anfangens senkt.'
      ],
      advanced: [
        'Die Geschichte der Typografie ist weitgehend eine Geschichte von Beschränkungen. Jede Generation von Werkzeugen definiert Klarheit neu, und Gestalter lernen, Beschränkung als Material ihres Handwerks zu behandeln.'
      ]
    }
  };

  /* ------------------------------------------------------------------
     Code snippets
     ------------------------------------------------------------------ */

  const CODE_SNIPPETS = [
    `function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}`,
    `const sum = (arr) => arr.reduce((total, n) => total + n, 0);

console.log(sum([1, 2, 3, 4])); // 10`,
    `class Timer {
  constructor(ms) {
    this.ms = ms;
    this.id = null;
  }
  start() {
    this.id = setInterval(() => console.log("tick"), this.ms);
  }
  stop() {
    clearInterval(this.id);
  }
}`,
    `def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print(fibonacci(10))`,
    `from collections import Counter

words = ["design", "type", "design", "code"]
counts = Counter(words)
print(counts.most_common(1))`,
    `if __name__ == "__main__":
    data = load_config("app.json")
    for key, value in data.items():
        print(f"{key}: {value}")`,
    `<button class="btn btn--primary" type="submit">
  Send Message
</button>`,
    `.container {
  display: grid;
  gap: var(--space-md);
  padding: 1rem 2rem;
  max-width: 1340px;
  margin: 0 auto;
}`,
    `:root {
  --accent: #bd3a1b;
  --text-primary: #121211;
}

[data-theme="dark"] {
  --text-primary: #f5f3ec;
}`,
    `const app = document.getElementById("app");
app.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (target) handleAction(target.dataset.action);
});`,
    `SELECT id, name, email
FROM users
WHERE active = 1
ORDER BY name ASC
LIMIT 20;`,
    `git add -A && git commit -m "Fix timer drift on pause"
git push origin main`,
    `public static int Clamp(int v, int min, int max) {
  return v < min ? min : (v > max ? max : v);
}`,
    `for (const row of rows) {
  const [key, val] = row.split("=");
  map.set(key.trim(), val.trim());
}`,
    `export default async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}`
  ];

  /* ------------------------------------------------------------------
     Deterministic RNG (for the daily challenge)
     ------------------------------------------------------------------ */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function shuffled(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function poolFor(language, difficulty, content, complexity) {
    if (language !== 'en') {
      return ES_WORDS_FOR(language);
    }
    if (complexity === 'complex') {
      if (content === 'random') return EN_ADVANCED.concat(EN_RANDOM.slice(0, 80));
      return EN_ADVANCED;
    }
    if (content === 'random') return EN_RANDOM;
    if (difficulty === 'advanced') return EN_ADVANCED;
    if (difficulty === 'beginner') return EN_COMMON.slice(0, 150);
    return EN_COMMON;
  }

  function ES_WORDS_FOR(language) {
    if (language === 'es') return ES_WORDS;
    if (language === 'fr') return FR_WORDS;
    if (language === 'de') return DE_WORDS;
    return EN_COMMON;
  }

  function sentencePool(language, difficulty) {
    const lang = SENTENCES[language] ? language : 'en';
    const pools = SENTENCES[lang];
    if (difficulty === 'beginner') return pools.beginner;
    if (difficulty === 'advanced') return pools.advanced.concat(pools.intermediate);
    if (difficulty === 'easy') return pools.beginner;
    return pools.intermediate.concat(pools.beginner, pools.advanced);
  }

  function paragraphPool(language, difficulty) {
    const lang = PARAGRAPHS[language] ? language : 'en';
    return PARAGRAPHS[lang][difficulty] || PARAGRAPHS[lang].intermediate;
  }

  function capitalizeWords(text, rng, chance) {
    return text.split(' ').map((w) => (rng() < chance ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
  }

  /* ------------------------------------------------------------------
     Generators
     ------------------------------------------------------------------ */

  function generateWords(count, language, difficulty, content, complexity, rng) {
    const pool = poolFor(language, difficulty, content, complexity);
    const words = [];
    let last = '';
    while (words.length < count) {
      let w = pick(rng, pool);
      if (w === last && words.length >= 2 && words[words.length - 2] === w) continue;
      words.push(w);
      last = w;
    }
    return words;
  }

  function generateSentencePassage(minWords, language, difficulty, rng) {
    const sentences = sentencePool(language, difficulty);
    const parts = [];
    let count = 0;
    let i = Math.floor(rng() * sentences.length);
    while (count < minWords) {
      const s = sentences[i % sentences.length];
      parts.push(s);
      count += s.split(/\s+/).length;
      i += 1 + Math.floor(rng() * 2);
    }
    return parts.join(' ');
  }

  function generateParagraphPassage(minWords, language, difficulty, rng) {
    const paras = paragraphPool(language, difficulty);
    const parts = [];
    let count = 0;
    let i = Math.floor(rng() * paras.length);
    while (count < minWords) {
      const p = paras[i % paras.length];
      parts.push(p);
      count += p.split(/\s+/).length;
      i += 1;
    }
    return parts.join(' ');
  }

  function generateNumbers(count, rng) {
    const parts = [];
    for (let i = 0; i < count; i++) {
      const kind = rng();
      if (kind < 0.45) {
        parts.push(String(Math.floor(rng() * 10000)));
      } else if (kind < 0.75) {
        parts.push((rng() * 100).toFixed(2));
      } else if (kind < 0.92) {
        parts.push(String(Math.floor(rng() * 90) + 10) + '%' );
      } else {
        const a = Math.floor(rng() * 900) + 100;
        const b = Math.floor(rng() * 90) + 10;
        parts.push(rng() < 0.5 ? `${a}-${b}` : `${a}+${b}`);
      }
    }
    return parts.join(' ');
  }

  function generatePunctuationSentences(minWords, language, difficulty, rng) {
    // Sentences plus occasional quotes, dashes, parentheses, semicolons
    const base = generateSentencePassage(minWords, language, difficulty, rng);
    const extras = ['—', '(', ')', '"', ';', ':', "'", '%', '&'];
    const words = base.split(' ');
    for (let i = 0; i < words.length; i += 4 + Math.floor(rng() * 5)) {
      if (rng() < 0.35) {
        const ex = pick(rng, extras);
        if (ex === '(' || ex === '"') words[i] = ex + words[i];
        else if (ex === ')' || ex === '"') words[i] = words[i] + ex;
        else words[i] = words[i] + ex;
      }
    }
    return words.join(' ');
  }

  function generateMixed(minWords, rng) {
    // Alternate sentence fragments with number clusters
    const out = [];
    let count = 0;
    while (count < minWords) {
      if (rng() < 0.5) {
        const n = generateNumbers(2 + Math.floor(rng() * 4), rng);
        out.push(n);
        count += n.split(/\s+/).length;
      } else {
        const s = pick(rng, SENTENCES.en.intermediate.concat(SENTENCES.en.beginner));
        out.push(s);
        count += s.split(/\s+/).length;
      }
    }
    return out.join(' ');
  }

  function generateCode(minWords, rng) {
    const needed = Math.max(minWords, 25);
    const out = [];
    let count = 0;
    let guard = 0;
    while (count < needed && guard < 20) {
      const snippet = pick(rng, CODE_SNIPPETS);
      out.push(snippet);
      count += snippet.split(/\s+/).length;
      guard++;
    }
    return out.join('\n\n');
  }

  function cleanCustomText(text) {
    if (!text) return '';
    let t = String(text).replace(/\r\n/g, '\n').replace(/\t/g, '  ').trim();
    t = t.replace(/[ ]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
    return t;
  }

  /**
   * Generate a full passage from settings.
   * settings: { mode, limit, content, language, difficulty, uppercase, punctuation, customText }
   * For time mode, limit is seconds; word estimate ≈ limit * 1.2 words for fast typists.
   * Returns a non-empty string; throws nothing — returns '' only for empty custom text.
   */
  function generateText(settings, rng) {
    rng = rng || Math.random;
    const content = settings.content || 'common';
    const language = settings.language || 'en';
    const complexity = settings.complexity || settings.difficulty || 'easy';
    const difficulty = settings.difficulty || (complexity === 'easy' ? 'beginner' : 'advanced');

    if (content === 'custom') {
      return cleanCustomText(settings.customText || '');
    }
    if (content === 'code') {
      const words = settings.mode === 'words' ? settings.limit : Math.max(40, Math.round(settings.limit * 1.4));
      return generateCode(words, rng);
    }

    let minWords;
    if (settings.mode === 'words') {
      minWords = Math.max(1, Math.min(500, parseInt(settings.limit, 10) || 25));
    } else {
      // Time mode: generously sized stream; engine tops up as needed
      const secs = Math.max(5, Math.min(600, parseInt(settings.limit, 10) || 30));
      minWords = Math.max(50, Math.round(secs * 1.6));
    }

    let text;
    if (content === 'numbers') {
      text = generateNumbers(Math.max(8, Math.round(minWords * 0.8)), rng);
    } else if (content === 'mixed') {
      text = generateMixed(minWords, rng);
    } else if (content === 'punctuation') {
      text = generatePunctuationSentences(minWords, language, difficulty, rng);
    } else if (content === 'sentences') {
      const easy = complexity === 'easy';
      if (easy) {
        text = generateSentencePassage(minWords, language, 'beginner', rng);
      } else {
        text = generatePunctuationSentences(minWords, language, difficulty, rng);
        if (rng() < 0.45) text = generateParagraphPassage(minWords, language, difficulty, rng);
      }
    } else {
      const words = generateWords(minWords, language, difficulty, content, complexity, rng);
      text = words.join(' ');
      if (complexity === 'complex' && content === 'common') {
        text = generatePunctuationSentences(minWords, language, difficulty, rng);
      }
    }

    if (settings.uppercase) {
      text = capitalizeWords(text, rng, 0.3);
    }
    if (settings.punctuation && content !== 'punctuation' && content !== 'sentences' && content !== 'mixed') {
      // Add sentence-style punctuation to plain word streams
      const words = text.split(' ');
      const out = [];
      for (let i = 0; i < words.length; i++) {
        if (i > 0 && i % (6 + Math.floor(rng() * 6)) === 0) {
          out.push(words[i - 1] + (rng() < 0.5 ? '.' : ','));
          out.push(words[i]);
        } else if (out.length === 0 || out[out.length - 1] !== words[i]) {
          out.push(words[i]);
        }
      }
      text = out.join(' ');
      if (!/[.!?]$/.test(text)) text += '.';
    }

    return text.trim();
  }

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */

  return {
    EN_COMMON,
    EN_RANDOM,
    EN_ADVANCED,
    CODE_SNIPPETS,
    mulberry32,
    hashString,
    generateText,
    cleanCustomText,
    languages: [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' },
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' }
    ]
  };
})();
