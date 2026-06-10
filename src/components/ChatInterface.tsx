import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import ParticleText from './ParticleText';
import DraggableWindow from './DraggableWindow';

type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  href: string;
  featured: boolean;
};

type Post = {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  href: string;
  featured: boolean;
};

type Publication = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  abstract?: string;
  href: string;
};

type Message = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  links?: PageLink[];
  actions?: Prompt[];
};

// A button in a reply that opens the matching page in a preview window.
type PageLink = {
  label: string;
  href: string;
  title: string;
  compact?: boolean;
};

type PreviewPage = {
  href: string;
  title: string;
  initial?: { x: number; y: number };
  width: string;
  heightClass: string;
};

type Prompt = {
  label: string;
  query: string;
};

type Props = {
  projects: Project[];
  posts: Post[];
  publications: Publication[];
};

type RouteLabel = 'greeting' | 'about' | 'projects' | 'research' | 'writing' | 'product' | 'contact';
type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

function ChatGlyph({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.25 6.75h13.5v8.5H12l-4.1 3.2v-3.2H5.25v-8.5Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
      <path d="M8.25 10.25h7.5M8.25 12.75h4.75" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

const starterPrompts: Prompt[] = [
  { label: 'About Wenjin', query: 'who are you' },
  { label: 'Projects', query: 'projects' },
  { label: 'Research', query: 'research and publications' },
  { label: 'Contact', query: 'contact' },
];

// Anchor questions per intent. The user's message is embedded and matched against
// these via cosine similarity to pick the closest intent (semantic routing).
const intentExamples: Partial<Record<RouteLabel, string[]>> = {
  greeting: [
    'hi',
    'hello there',
    'hey, how are you',
    'good morning',
    "what's up",
    "how's it going",
    'nice to meet you',
  ],
  about: [
    'who are you',
    'tell me about yourself',
    'introduce yourself',
    'what is your background',
    'what do you do',
  ],
  projects: [
    'show me your projects',
    'what have you built',
    'see your portfolio',
    'computer vision and robotics work',
    'examples of your work',
  ],
  research: [
    'show me your research and publications',
    'what papers have you published',
    'your academic work',
    'digital twin research',
  ],
  product: [
    'how do you work',
    'what is your experience',
    'tell me about bright machines',
    'how do you build and ship ai',
  ],
  contact: [
    'how can i contact you',
    'get in touch',
    'how do i reach you',
    'connect on linkedin',
  ],
};

const routeQueries: Record<RouteLabel, string> = {
  greeting: 'hello',
  about: 'about',
  projects: 'projects',
  research: 'research publications',
  writing: 'blog writing',
  product: 'product experience',
  contact: 'contact',
};

function matchesAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

const GREETING_WORDS = new Set([
  'hi', 'hello', 'hey', 'heya', 'hiya', 'yo', 'howdy', 'sup', 'hii', 'hiii',
  'greetings', 'hai', 'hallo', 'morning', 'afternoon', 'evening', 'gm',
  '你好', '您好', '嗨', '哈喽', '哈啰', '你好啊',
]);

// A greeting is a short message whose words are (mostly) just hellos — matched on
// whole words so "hi" doesn't trigger on "which", "thing", etc.
function isGreeting(input: string) {
  const words = input.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 3 && words.some((word) => GREETING_WORDS.has(word));
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Rotate a few phrasings for the most-repeated replies so the twin feels less canned.
const GREETING_REPLIES = [
  "Hey! I'm Wenjin's digital twin. I can walk you through his projects, research, how he builds and ships AI in manufacturing, or how to reach him — what are you curious about?",
  "Hi there — Wenjin's digital twin here. Ask me about his projects, his research, how he builds and ships AI on the factory floor, or how to get in touch.",
  "Hey, good to see you. I can show you Wenjin's projects and research, explain how he works, or point you to contact — where do you want to start?",
];

const FALLBACK_REPLIES = [
  "I'm not quite sure what you're after. Pick one of these, or ask about Wenjin's projects, research, how he works, or how to reach him.",
  "Hmm, I didn't quite catch that. Try one of these, or ask about his projects, research, how he works, or how to reach him.",
  "Let me point you somewhere useful — pick a topic below, or ask about Wenjin's projects, research, how he works, or contact.",
];

function createEmbedHref(href: string) {
  const [path, hash = ''] = href.split('#');
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}embed=1${hash ? `#${hash}` : ''}`;
}

function Typewriter({
  text,
  speed = 18,
  startDelay = 250,
  className,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    let frame = 0;
    let timer = 0;
    const tick = () => {
      setCount((current) => {
        const next = current + 1;
        if (next < text.length) {
          timer = window.setTimeout(tick, speed);
        }
        return next;
      });
    };
    frame = window.setTimeout(tick, startDelay);
    return () => {
      window.clearTimeout(frame);
      window.clearTimeout(timer);
    };
  }, [text, speed, startDelay]);

  const done = count >= text.length;

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      <span
        aria-hidden="true"
        className={`ml-0.5 inline-block w-[2px] -translate-y-px self-stretch bg-cyan-300 align-middle ${
          done ? 'animate-pulse' : ''
        }`}
        style={{ height: '1em' }}
      />
    </p>
  );
}

export default function ChatInterface(_props: Props) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activePreview, setActivePreview] = useState<PreviewPage | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [useTransformer, setUseTransformer] = useState(true);
  const [introOpen, setIntroOpen] = useState(true);
  const [topWindow, setTopWindow] = useState<'intro' | 'preview'>('intro');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      text: "Hi — I'm Wenjin's digital twin. Ask me anything.",
    },
  ]);
  const nextId = useRef(2);
  const classifierRef = useRef<Promise<any> | null>(null);
  const anchorsRef = useRef<{ route: RouteLabel; vec: Float32Array }[] | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  function buildResponse(rawQuery: string): Omit<Message, 'id' | 'role'> {
    const query = rawQuery.trim().toLowerCase();

    if (isGreeting(query)) {
      return {
        text: pick(GREETING_REPLIES),
      };
    }

    const projectsLink: PageLink = { label: 'Projects', href: '/projects', title: 'Projects' };
    const researchLink: PageLink = { label: 'Research', href: '/publications', title: 'Research' };
    const contactLink: PageLink = { label: 'Contact', href: '/contact', title: 'Contact', compact: true };

    if (matchesAny(query, ['project', 'projects', '项目', 'portfolio', 'work', 'robotics', 'vision', 'computer vision', 'cv'])) {
      return {
        text:
          'Wenjin has shipped work across robotics, computer vision, industrial analytics, and operator guidance — built to run in production. Open the projects page to browse them.',
        links: [projectsLink],
      };
    }

    if (matchesAny(query, ['publication', 'publications', 'research', 'paper', 'papers', '研究', '论文', 'digital twin', 'digital twins'])) {
      return {
        text:
          'His research centers on human-centered manufacturing, digital twins, and applied AI that connects factory data to decisions — across robotics and computer vision.',
        links: [researchLink],
      };
    }

    if (matchesAny(query, ['product', 'pm', 'manager', 'bright machines', 'experience', '经验', '产品'])) {
      return {
        text:
          'At Bright Machines, Wenjin works end-to-end: find the real operational pain, turn it into system requirements, align engineering and factory stakeholders, then ship AI tools that improve production decisions.',
        links: [projectsLink, researchLink],
      };
    }

    if (matchesAny(query, ['who', 'about', 'bio', 'intro', '介绍', '你是谁', 'background'])) {
      return {
        text:
          'Wenjin builds and ships AI solutions in manufacturing — computer vision, digital twins, and applied ML that go from prototype to the factory floor. The throughline: turn hard, systems-level problems into production systems that actually work.',
        links: [projectsLink, researchLink, contactLink],
      };
    }

    if (matchesAny(query, ['contact', 'email', 'reach', 'connect', '联系', '合作'])) {
      return {
        text: 'The best way to reach Wenjin is LinkedIn — open the contact page for the link.',
        links: [contactLink],
      };
    }

    return {
      text: pick(FALLBACK_REPLIES),
      actions: starterPrompts,
    };
  }

  // Load the sentence-embedding model once and precompute the anchor-question
  // vectors, so each query only needs a single embedding + cosine comparison.
  async function ensureClassifier() {
    if (!classifierRef.current) {
      classifierRef.current = (async () => {
        setModelStatus('loading');
        const { env, pipeline } = await import('@huggingface/transformers');
        // Self-host the model + ONNX runtime so we don't depend on the HF CDN.
        const base = import.meta.env.BASE_URL;
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = `${base}models/`;
        const wasmBackend = env.backends?.onnx?.wasm;
        if (wasmBackend) {
          wasmBackend.wasmPaths = `${base}ort/`;
          wasmBackend.numThreads = 1;
        }
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          dtype: 'q8',
          device: 'wasm',
        });

        const anchors: { route: RouteLabel; vec: Float32Array }[] = [];
        for (const [route, examples] of Object.entries(intentExamples)) {
          for (const example of examples ?? []) {
            const output = await extractor(example, { pooling: 'mean', normalize: true });
            anchors.push({ route: route as RouteLabel, vec: output.data as Float32Array });
          }
        }
        anchorsRef.current = anchors;

        setModelStatus('ready');
        return extractor;
      })().catch((error) => {
        console.error('Embedding model failed to load', error);
        classifierRef.current = null;
        anchorsRef.current = null;
        setModelStatus('error');
        throw error;
      });
    }

    return classifierRef.current;
  }

  // Cosine similarity of two normalized vectors reduces to a dot product.
  function cosine(a: Float32Array, b: Float32Array) {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
    return sum;
  }

  async function routeWithTransformer(query: string): Promise<string> {
    if (!useTransformer) return query;

    try {
      const extractor = await ensureClassifier();
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      const queryVec = output.data as Float32Array;

      let best: { route: RouteLabel | null; score: number } = { route: null, score: -1 };
      for (const anchor of anchorsRef.current ?? []) {
        const score = cosine(queryVec, anchor.vec);
        if (score > best.score) best = { route: anchor.route, score };
      }

      if (best.route && best.score >= 0.45) {
        return routeQueries[best.route];
      }
    } catch {
      return query;
    }

    return query;
  }

  async function submitQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: nextId.current++,
      role: 'user',
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');

    const routedQuery = isGreeting(trimmed) ? trimmed : await routeWithTransformer(trimmed);
    const response = buildResponse(routedQuery);
    const assistantMessage: Message = {
      id: nextId.current++,
      role: 'assistant',
      ...response,
    };

    setMessages((current) => [...current, assistantMessage]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuery(input);
  }

  function openPanel() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setIsOpen(true);
    // Warm up the semantic-routing model so the first reply isn't blocked on it.
    if (useTransformer) void ensureClassifier().catch(() => {});
  }

  function handleChatButtonClick() {
    if (isOpen) {
      closePanel();
      return;
    }

    openPanel();
  }

  function clearChat() {
    nextId.current = 2;
    setMessages([
      { id: 1, role: 'assistant', text: "Hi — I'm Wenjin's digital twin. Ask me anything." },
    ]);
    setInput('');
  }

  function closePanel() {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 180);
  }

  // Open a page in a centered preview window. Content-light pages (e.g. Contact)
  // open in a smaller window. Shared by the dock and by in-chat cards.
  function showPreview(href: string, title: string, compact = false) {
    const maxWidth = compact ? 460 : 820;
    const heightFraction = compact ? 0.5 : 0.78;
    const width = Math.min(maxWidth, window.innerWidth - 24);
    const height = Math.min(window.innerHeight * heightFraction, window.innerHeight - 96);
    const initial = {
      x: Math.max(12, Math.round((window.innerWidth - width) / 2)),
      y: Math.max(24, Math.round((window.innerHeight - height) / 2)),
    };
    setActivePreview({
      href: createEmbedHref(href),
      title,
      initial,
      width: compact ? 'w-[min(460px,calc(100vw-1.5rem))]' : 'w-[min(820px,calc(100vw-1.5rem))]',
      heightClass: compact ? 'h-[min(50vh,calc(100vh-6rem))]' : 'h-[min(78vh,calc(100vh-6rem))]',
    });
    setTopWindow('preview');
  }

  function openPage(href: string, title: string, compact = false) {
    showPreview(href, title, compact);
  }

  const dockApps: { label: string; href: string; compact?: boolean }[] = [
    { label: 'Projects', href: '/projects' },
    { label: 'Research', href: '/publications' },
    { label: 'Contact', href: '/contact', compact: true },
  ];

  function getModelLabel() {
    if (!useTransformer) return 'Keyword routing';
    if (modelStatus === 'loading') return 'Loading AI model';
    if (modelStatus === 'ready') return 'Semantic routing';
    if (modelStatus === 'error') return 'AI model unavailable';
    return 'Semantic routing on demand';
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#02040b]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.055)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(34,211,238,0.18),transparent_22%),radial-gradient(circle_at_18%_78%,rgba(45,212,191,0.12),transparent_24%),linear-gradient(180deg,rgba(2,4,11,0.1),rgba(2,4,11,0.86))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-300/60 shadow-[0_0_30px_rgba(34,211,238,0.55)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background:repeating-linear-gradient(180deg,transparent_0,transparent_12px,rgba(125,249,255,0.2)_13px)]" />
      <div className="absolute inset-0 grid place-items-center px-6">
        <ParticleText text="Vibe Crafting..." dispersed={activePreview !== null || isOpen} />
      </div>

      {activePreview && (
        <DraggableWindow
          title={`${activePreview.title.toLowerCase()}.view`}
          width={activePreview.width}
          className={activePreview.heightClass}
          bodyClassName="p-0"
          initial={activePreview.initial ?? { x: 40, y: 72 }}
          zIndex={topWindow === 'preview' ? 44 : 34}
          onFocus={() => setTopWindow('preview')}
          onClose={() => setActivePreview(null)}
        >
          <iframe
            title={activePreview.title}
            src={activePreview.href}
            className="h-full w-full bg-transparent"
          />
        </DraggableWindow>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[46]" onClick={closePanel}>
        <div className="absolute bottom-[9px] right-3 flex justify-end sm:right-7" onClick={(event) => event.stopPropagation()}>
          <div
            className={`flex h-[min(720px,calc(100vh-3.5rem))] w-[calc(100vw-1.5rem)] max-w-[520px] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#06101d]/80 shadow-[0_0_60px_rgba(34,211,238,0.18)] backdrop-blur-2xl sm:w-[calc(100vw-3.5rem)] ${
              isClosing
                ? 'animate-[panel-close_180ms_cubic-bezier(0.4,0,1,1)_both]'
                : 'animate-[panel-open_220ms_cubic-bezier(0.2,0.8,0.2,1)_both]'
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-cyan-300/15 bg-[#04101b]/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">digital twin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearChat}
                  aria-label="Clear chat history"
                  title="Clear chat"
                  className="grid h-6 w-6 place-items-center rounded-md border border-cyan-300/15 text-cyan-100/70 transition hover:border-cyan-200/50 hover:text-cyan-100"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close chat"
                  className="grid h-6 w-6 place-items-center rounded-md border border-cyan-300/15 text-cyan-100/70 transition hover:border-rose-300/50 hover:text-rose-200"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="space-y-5">
                {messages.map((message) => (
                  <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex w-full flex-col gap-3 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
                            <ChatGlyph className="h-4 w-4" />
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Wenjin · twin</span>
                        </div>
                      )}
                      <div
                        className={
                          message.role === 'user'
                            ? 'max-w-[82%] rounded-2xl rounded-br-md bg-cyan-300 px-4 py-3 text-sm leading-6 text-[#06101d] shadow-lg shadow-cyan-500/15'
                            : 'max-w-[92%] rounded-2xl rounded-bl-md border border-cyan-300/15 bg-[#071827]/80 px-4 py-3 text-sm leading-6 text-slate-200'
                        }
                      >
                        {message.text}
                      </div>

                      {message.links && (
                        <div className="flex w-full flex-wrap gap-2">
                          {message.links.map((link) => (
                            <button
                              key={`${message.id}-${link.href}`}
                              type="button"
                              onClick={() => showPreview(link.href, link.title, link.compact)}
                              className="inline-flex items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3.5 py-2 text-sm text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.12]"
                            >
                              {link.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {message.actions && (
                        <div className="flex flex-wrap gap-2">
                          {message.actions.map((action) => (
                            <button
                              key={`${message.id}-${action.label}`}
                              type="button"
                              onClick={() => void submitQuery(action.query)}
                              className="inline-flex items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3.5 py-2 text-sm text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/[0.12]"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-cyan-300/15 bg-[#04101b]/92 py-4 pl-4 pr-0">
              <div className="mb-2 flex items-center justify-end pr-4">
                <button
                  type="button"
                  onClick={() => setUseTransformer((value) => !value)}
                  aria-pressed={useTransformer}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                    useTransformer
                      ? 'border-cyan-300/45 bg-cyan-300/10 text-cyan-100'
                      : 'border-cyan-300/12 bg-cyan-300/[0.04] text-slate-400 hover:text-cyan-100'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${useTransformer ? 'bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-slate-600'}`} />
                  {getModelLabel()}
                </button>
              </div>
              <div className="relative">
                <label htmlFor="chat-input" className="sr-only">
                  Ask about Wenjin's projects, research, or product work
                </label>
                <input
                  id="chat-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border border-cyan-300/15 bg-white/[0.045] py-3 pl-4 pr-14 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:bg-white/[0.065] sm:text-sm"
                  placeholder="Ask about projects, industrial AI..."
                />
                {input.trim() && (
                  <button
                    type="submit"
                    aria-label="Send message"
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-cyan-300 text-[#06101d] transition hover:bg-cyan-200"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        </div>
      )}

      {introOpen && (
        <DraggableWindow
          title="readme.md"
          eyebrow="// whoami"
          initial={{ x: 48, y: 104 }}
          zIndex={topWindow === 'intro' ? 40 : 30}
          onFocus={() => setTopWindow('intro')}
          onClose={() => setIntroOpen(false)}
        >
          <div className="mt-3">
            <h1 className="text-xl font-semibold text-white">Wenjin Tao</h1>
            <p className="mt-1 font-mono text-xs lowercase tracking-[0.12em] text-cyan-300/70">
              building &amp; shipping ai solutions in manufacturing @ bright machines
            </p>
          </div>
          <Typewriter
            className="mt-4 min-h-[3rem] text-sm leading-6 text-slate-300"
            text="I enjoy solving real problems, love the complex ones, and lately I've been obsessed with shipping AI that solves them in production — on the real factory floor."
          />
        </DraggableWindow>
      )}

      <div className="scrollbar-none fixed bottom-7 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-cyan-300/15 bg-[#04101b]/70 px-2 py-1.5 backdrop-blur-xl sm:left-7 sm:max-w-none sm:translate-x-0">
        <button
          type="button"
          onClick={() => {
            setIntroOpen(true);
            setTopWindow('intro');
          }}
          aria-pressed={introOpen}
          className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-200 ${
            introOpen
              ? 'bg-cyan-300/10 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
              : 'text-cyan-100/45 hover:bg-white/5 hover:text-cyan-100'
          }`}
        >
          Intro
        </button>
        <span className="mx-0.5 h-5 w-px bg-cyan-300/15" />
        {dockApps.map((app) => {
          const active = activePreview?.href === createEmbedHref(app.href);
          return (
            <button
              key={app.href}
              type="button"
              onClick={() => openPage(app.href, app.label, app.compact)}
              aria-pressed={active}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-200 ${
                active
                  ? 'bg-cyan-300/10 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
                  : 'text-cyan-100/45 hover:bg-white/5 hover:text-cyan-100'
              }`}
            >
              {app.label}
            </button>
          );
        })}
      </div>

      {!(isOpen && input.trim()) && (
        <button
          type="button"
          onClick={handleChatButtonClick}
          aria-label={isOpen ? 'Close chat' : 'Open portfolio chat'}
          className={`fixed bottom-20 right-5 z-50 h-10 w-10 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)] backdrop-blur-xl transition-all hover:border-cyan-200/70 hover:bg-cyan-300/22 hover:shadow-[0_0_26px_rgba(34,211,238,0.32)] focus:outline-none focus:ring-2 focus:ring-cyan-300/60 sm:bottom-7 sm:right-7 ${
            isOpen ? 'hidden sm:grid' : 'grid'
          }`}
        >
          <span className="absolute inset-[-6px] rounded-full border border-cyan-300/15" />
          <ChatGlyph />
        </button>
      )}
    </section>
  );
}
