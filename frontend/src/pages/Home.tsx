import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { Sparkles, ArrowUp, Layers, X, ChevronDown } from 'lucide-react';
import { BACKEND_URL, readSseStream } from '@/utility/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_FRAMEWORK, type Framework } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectIsEnhancingPrompt } from '@/store/selectors';
import { setIsEnhancingPrompt } from '@/store/workspaceSlice';


const QUOTES = [
  "If you can name it, you can askh for it.",
  "The life you want begins with the courage to askh.",
  "You don’t get lucky, you get what you askh for.",
  "Silence keeps you stuck. Askhing moves you forward.",
  "Opportunities open for those who dare to askh.",
  "Your future changes the moment you askh.",
  "Nothing happens until you askh."
];


export default function Home() {
  const dispatch = useAppDispatch();
  const isEnhancing = useAppSelector(selectIsEnhancingPrompt);
  const [idea, setIdea] = useState('');
  const [framework, setFramework] = useState<Framework>(DEFAULT_FRAMEWORK);
  const [stackDialogOpen, setStackDialogOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      navigate('/workspace', { state: { prompt: idea, framework } });
    }
  };

  const enhancePrompt = async () => {
    try {
      dispatch(setIsEnhancingPrompt(true));
      const response = await fetch(`${BACKEND_URL}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: idea, framework }),
      });
      setIdea('');
      await readSseStream(response, (text) => setIdea((c) => c + text));
    } catch (error) {
      console.error('Error enhancing prompt:', error);
    } finally {
      dispatch(setIsEnhancingPrompt(false));
    }
  };

  const detailedFeatures = [
    {
      id: 1,
      image: '/chat.png',
      title: 'Iterate with Chat',
      description: 'A chat UI to keep iterating on your apps',
      marketingCopy: 'We know you want to refine and perfect your ideas. Our intuitive chat interface lets you continuously iterate and evolve your application until it\'s exactly what you envisioned.',
      align: 'left' as const,
    },
    {
      id: 2,
      image: '/preview-restore.png',
      title: 'Preview & Restore Any Iteration',
      description: 'Ability to preview-restore any of your iterations in the middle of your chat',
      marketingCopy: 'We know you might want to iterate and go back to the best idea again, so better version. Never lose a great iteration—preview and restore any checkpoint instantly.',
      align: 'right' as const,
    },
    {
      id: 3,
      image: '/codeeditor.png',
      title: 'Full Code Control',
      description: 'Ability to make changes in the code with the inbuilt code editor',
      marketingCopy: 'We know you want control over your code—and we give it to you. It\'s all yours. Edit directly in our powerful built-in editor and take full ownership of your codebase.',
      align: 'left' as const,
    },
    {
      id: 4,
      image: '/error.png',
      title: 'One-Click Error Fix',
      description: 'Errors detected automatically and one button fix',
      marketingCopy: 'We know not everyone is perfect, and both human and LLM can make errors. Our one-click error fix UI experience makes your life easier, automatically detecting and resolving issues.',
      align: 'right' as const,
    },
    {
      id: 5,
      image: '/stack.png',
      title: 'Choose Your Framework',
      description: 'We don\'t assume that you are a React enthusiast and respect all frameworks equally',
      marketingCopy: 'We don\'t assume that you are a React enthusiast and respect all frameworks equally so you get to choose your stack. React, Vue, Svelte, or Node.js—pick what works best for you.',
      align: 'left' as const,
    },
  ];

  return (
    <div className="bg-hero-gradient text-white">
      {/* Hero Section - Full Viewport */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <div className="w-full text-center">
            {/* Title */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
              <h1 className="text-5xl font-medium bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                ASKH
              </h1>
            </div>

            {/* Tagline */}
            <div
              className="text-white/70 text-xl mb-12 max-w-xl mx-auto min-h-[4.5rem] flex flex-col items-center justify-center font-light tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              aria-live="polite"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-center italic"
                >
                  <p>{QUOTES[quoteIndex]}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Main CTA: large input box */}
            <div className="w-full max-w-xl mx-auto mb-12">
              <form ref={formRef} onSubmit={handleSubmit} className="w-full block">
                <div className="flex flex-col rounded-2xl border border-white/25 bg-white/10 shadow-lg overflow-hidden focus-within:bg-white/15 transition-colors">
                  <Textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        formRef.current?.requestSubmit();
                      }
                    }}
                    placeholder="Askh what you want to build...."
                    rows={4}
                    className="flex-1 w-full resize-none border-0 bg-transparent py-5 px-5 text-lg md:text-lg text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none shadow-none"
                  />
                  <div className="flex items-center justify-between px-4 pb-4 pt-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={enhancePrompt}
                        disabled={isEnhancing || !idea.trim()}
                        className="p-2.5 text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:bg-white/10"
                        title="Enhance your prompt for better results"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                      <Dialog open={stackDialogOpen} onOpenChange={setStackDialogOpen}>
                        <button
                          type="button"
                          onClick={() => setStackDialogOpen(true)}
                          className="p-2.5 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                          title="Choose stack (React, Vue, Svelte)"
                          aria-haspopup="dialog"
                          aria-expanded={stackDialogOpen}
                        >
                          <Layers className="w-5 h-5" />
                        </button>
                        <DialogContent
                          className="border-white/20 bg-[hsl(142,28%,14%)] text-white"
                          onPointerDownOutside={() => setStackDialogOpen(false)}
                          onEscapeKeyDown={() => setStackDialogOpen(false)}
                        >
                          <DialogHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
                            <DialogTitle className="flex items-center gap-2">
                              <Layers className="w-5 h-5 text-white/80" />
                              Choose your stack
                            </DialogTitle>
                            <button
                              type="button"
                              onClick={() => setStackDialogOpen(false)}
                              className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                              aria-label="Close"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div>
                              <p className="text-sm text-white/80 mb-2">Webapp</p>
                              <div className="flex gap-2 flex-wrap">
                                {(['react', 'vue', 'svelte'] as const).map((fw) => (
                                  <button
                                    key={fw}
                                    type="button"
                                    onClick={() =>
                                      setFramework({ webapp: fw, service: '' })
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                                      framework.webapp === fw && !framework.service
                                        ? 'bg-white/20 text-white border border-white/40'
                                        : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
                                    }`}
                                  >
                                    {fw}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-white/80 mb-2">Service</p>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFramework({ webapp: '', service: 'node' })
                                  }
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    framework.service === 'node'
                                      ? 'bg-white/20 text-white border border-white/40'
                                      : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
                                  }`}
                                >
                                  Node
                                </button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Button
                      type="submit"
                      disabled={!idea.trim() || isEnhancing}
                      size="icon"
                      className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Main Value Proposition */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-2xl md:text-3xl font-light text-white/90 mb-3 max-w-2xl mx-auto leading-relaxed">
                Kickstart Your MVP Without Opening Your IDE
              </h2>
              <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto font-light">
                Everything you need to go from idea to working application in minutes
              </p>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-16 flex flex-col items-center gap-2 cursor-pointer group"
              onClick={() => {
                window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
              }}
            >
              <p className="text-white/50 text-sm font-light tracking-wide">
                See what we've prepared for you
              </p>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-white/40 group-hover:text-white/60 transition-colors"
              >
                <ChevronDown className="w-6 h-6" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section - Below Viewport */}
      <div className="w-full max-w-7xl mx-auto px-4 py-24">

        <div className="space-y-20 md:space-y-28">
          {detailedFeatures.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  feature: {
    id: number;
    image: string;
    title: string;
    description: string;
    marketingCopy: string;
    align: 'left' | 'right';
  };
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const isLeft = feature.align === 'left';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isLeft ? -30 : 30 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-12`}
    >
      {/* Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        transition={{ duration: 0.7, delay: index * 0.1 + 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 w-full"
      >
        <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
          <img
            src={feature.image}
            alt={feature.title}
            className="w-full h-auto object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: index * 0.1 + 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 space-y-3"
      >
        <h3 className="text-2xl md:text-3xl font-light text-white/95 leading-tight">
          {feature.title}
        </h3>
        <p className="text-lg text-white/80 font-light">
          {feature.description}
        </p>
        <p className="text-white/65 text-base leading-relaxed font-light">
          {feature.marketingCopy}
        </p>
      </motion.div>
    </motion.div>
  );
}
