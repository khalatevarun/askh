import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ArrowUp, Code, Eye, Edit, Layers, X } from 'lucide-react';
import { BACKEND_URL, readSseStream } from '@/utility/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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

  const features = [
    {
      icon: <Code className="w-6 h-6" />,
      title: 'Production-Ready Code',
      description: 'Get fully functional code instantly from your ideas',
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'Live Preview',
      description: 'See your application come to life in real-time',
    },
    {
      icon: <Edit className="w-6 h-6" />,
      title: 'Flexible Editing',
      description: 'Edit via prompts or use the built-in code editor',
    },
  ];

  return (
    <div className="min-h-screen bg-hero-gradient text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        <div className="w-full text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              ASKH
            </h1>
          </div>

          <div
            className="text-white/70 text-xl mb-10 max-w-xl mx-auto min-h-[4.5rem] flex flex-col items-center justify-center font-light tracking-wide"
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

          {/* Main CTA: large input box with bottom-left enhance, stack, and submit */}
          <div className="w-full max-w-xl mx-auto">
            <form ref={formRef} onSubmit={handleSubmit} className="w-full block">
              <div className=" flex flex-col rounded-2xl border border-white/25 bg-white/10 shadow-lg overflow-hidden focus-within:bg-white/15 transition-colors">
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
                className="flex-1  w-full resize-none border-0 bg-transparent py-5 px-5 text-lg md:text-lg text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none shadow-none"
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
        </div>

        <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl mt-4">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="rounded-xl border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-white"
            >
              <CardContent className="p-6">
                <div className="rounded-lg bg-white/10 p-3 w-fit mb-4 text-primary-foreground">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
