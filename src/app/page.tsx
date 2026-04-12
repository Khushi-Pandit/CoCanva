'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sparkles, ArrowRight, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Wait for auth to mount
  useEffect(() => setMounted(true), []);

  // ── Hero Interactive Canvas Animation ───────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Dot = { x: number; y: number; vx: number; vy: number; baseR: number; targetR: number; currentR: number };
    const dots: Dot[] = [];
    const spacing = 40;
    for (let x = 0; x < canvas.width + spacing; x += spacing) {
      for (let y = 0; y < canvas.height + spacing; y += spacing) {
        dots.push({ x, y, vx: 0, vy: 0, baseR: 1, targetR: 1, currentR: 1 });
      }
    }

    let mouseX = -1000, mouseY = -1000;
    const handleMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    const handleLeave = () => { mouseX = -1000; mouseY = -1000; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);

    let raf: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const dot of dots) {
        const dx = mouseX - dot.x;
        const dy = mouseY - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          dot.targetR = 3;
          const force = (150 - dist) / 150;
          dot.vx -= (dx / dist) * force * 0.5;
          dot.vy -= (dy / dist) * force * 0.5;
        } else {
          dot.targetR = 1;
        }

        dot.x += dot.vx;
        dot.y += dot.vy;
        
        // Spring back to original grid position
        const origX = Math.round(dot.x / spacing) * spacing;
        const origY = Math.round(dot.y / spacing) * spacing;
        dot.vx += (origX - dot.x) * 0.05;
        dot.vy += (origY - dot.y) * 0.05;
        
        // Friction
        dot.vx *= 0.8;
        dot.vy *= 0.8;

        dot.currentR += (dot.targetR - dot.currentR) * 0.2;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.currentR, 0, Math.PI * 2);
        
        // Color based on activity
        const speed = Math.abs(dot.vx) + Math.abs(dot.vy);
        if (speed > 1) {
          ctx.fillStyle = `rgba(52, 211, 153, ${Math.min(1, speed)})`; // emerald-400
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.2)'; // slate-400 low opacity
        }
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-900 text-slate-50 selection:bg-emerald-500/30 overflow-hidden font-sans">
      {/* Background Interactive Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* ── Navigation ── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <span className="text-white font-black text-[12px] tracking-tight">DS</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">DrawSync</span>
        </div>

        <div className="flex items-center gap-4">
          {!mounted || loading ? null : firebaseUser ? (
            <Link href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold backdrop-blur-md border border-white/10 transition-all active:scale-95">
              Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">Sign in</Link>
              <Link href="/signup" className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)] text-sm font-semibold transition-all active:scale-95">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-40 max-w-5xl mx-auto h-[80vh]">
        {/* Fake cursor floaters */}
        <div className="absolute top-20 left-20 animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="relative">
            <MousePointer2 size={24} className="text-emerald-400 fill-emerald-400 drop-shadow-lg" />
            <div className="absolute top-full left-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">Alex</div>
          </div>
        </div>
        <div className="absolute bottom-32 right-10 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
          <div className="relative">
            <MousePointer2 size={24} className="text-indigo-400 fill-indigo-400 drop-shadow-lg" />
            <div className="absolute top-full left-4 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">Sarah</div>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 leading-[1.1] mb-6 drop-shadow-sm">
          Think outside the <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">rectangle.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          The collaborative canvas that moves as fast as your team. With multi-model AI, voice chat, and real-time multiplayer built for speed.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href={mounted && firebaseUser ? '/dashboard' : '/signup'}
            className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-full bg-white text-slate-900 text-base font-bold shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all active:scale-95">
            Start drawing for free
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#features" className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-full bg-slate-800/50 hover:bg-slate-800 backdrop-blur-md border border-white/10 text-white text-base font-medium transition-all">
            <Sparkles size={18} className="text-emerald-400" /> See what's inside
          </a>
        </div>
      </main>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 bg-slate-950 py-32 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Everything you need to map complex ideas</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Skip the heavy modeling tools. DrawSync is instantly familiar, infinitely scalable, and surprisingly powerful.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              title="Multi-Model AI" 
              desc="Chat with Claude, Gemini, or Groq directly on your canvas. Auto-route picks the best model for code-to-diagram or ghost suggestions."
              border="border-indigo-500/30"
              bg="bg-indigo-500/10"
              icon="🧠"
            />
            <FeatureCard 
              title="Real-Time Engine" 
              desc="WebSockets power millisecond-sync. See cursor movements, stroke rendering, and voice chat avatars update instantly."
              border="border-emerald-500/30"
              bg="bg-emerald-500/10"
              icon="⚡"
            />
            <FeatureCard 
              title="Infinite Canvas" 
              desc="Pinch to zoom, space to pan. Drop SVGs, text blocks, code snippets, and post-it notes anywhere. A true spatial workspace."
              border="border-pink-500/30"
              bg="bg-pink-500/10"
              icon="🌌"
            />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-slate-800/50 bg-slate-950 py-12 text-center text-slate-500">
        <p className="text-sm font-medium">© {new Date().getFullYear()} DrawSync. Designed for builders.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ title, desc, border, bg, icon }: { title: string, desc: string, border: string, bg: string, icon: string }) {
  return (
    <div className={cn('p-8 rounded-3xl border backdrop-blur-sm transition-all hover:-translate-y-1', border, bg)}>
      <div className="text-4xl mb-6">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
