import { useState, useEffect } from 'react';

export interface TutorialStep {
  title: string;
  body: string;
  illustration: React.ReactNode;
}

interface Props {
  tutorialKey: string;   // e.g. 'hunt', 'collection'
  steps: TutorialStep[];
  onDone?: () => void;
}

function storageKey(k: string) { return `katchii_tuto_${k}`; }

export function isTutorialDone(key: string): boolean {
  return localStorage.getItem(storageKey(key)) === '1';
}

export function TutorialOverlay({ tutorialKey, steps, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animDir, setAnimDir] = useState<'in' | 'out'>('in');

  // Mark done on first render
  useEffect(() => {
    localStorage.setItem(storageKey(tutorialKey), '1');
  }, [tutorialKey]);

  if (!visible) return null;

  const close = () => { setVisible(false); onDone?.(); };

  const goNext = () => {
    if (step < steps.length - 1) {
      setAnimDir('out');
      setTimeout(() => { setStep(s => s + 1); setAnimDir('in'); }, 160);
    } else {
      close();
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setAnimDir('out');
      setTimeout(() => { setStep(s => s - 1); setAnimDir('in'); }, 160);
    }
  };

  const current = steps[step];

  return (
    <div
      className="fixed inset-0 z-[800] flex flex-col items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)' }}
    >
      {/* Skip */}
      <button
        onClick={close}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        ✕
      </button>

      {/* Step indicators */}
      <div className="absolute top-5 left-0 right-0 flex justify-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300"
            style={{
              width: i === step ? 20 : 6, height: 6,
              background: i <= step ? '#facc15' : 'rgba(255,255,255,0.2)',
            }} />
        ))}
      </div>

      {/* Card */}
      <div
        className="w-full px-4 pb-8"
        style={{
          opacity: animDir === 'in' ? 1 : 0,
          transform: animDir === 'in' ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.16s ease, transform 0.16s ease',
        }}
      >
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid rgba(250,204,21,0.25)',
            boxShadow: '0 0 40px rgba(250,204,21,0.1)',
          }}
        >
          {/* Illustration area */}
          <div className="w-full flex items-center justify-center pt-6 pb-2"
            style={{ minHeight: 160, background: 'rgba(0,0,0,0.25)' }}>
            {current.illustration}
          </div>

          {/* Text */}
          <div className="px-5 pt-4 pb-5">
            <h2 className="text-white font-black text-xl mb-2" style={{ textShadow: '0 0 20px rgba(250,204,21,0.4)' }}>
              {current.title}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">{current.body}</p>
          </div>

          {/* Navigation */}
          <div className="px-5 pb-5 flex items-center gap-3">
            {step > 0 && (
              <button onClick={goPrev}
                className="h-12 px-4 rounded-2xl font-bold text-slate-300"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', minWidth: 52 }}>
                ←
              </button>
            )}
            <button onClick={goNext}
              className="flex-1 h-12 rounded-2xl font-black text-slate-900 text-base"
              style={{
                background: 'linear-gradient(90deg, #facc15, #f59e0b)',
                boxShadow: '0 4px 20px rgba(250,204,21,0.35)',
              }}>
              {step === steps.length - 1 ? "C'est parti ! 🚀" : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
