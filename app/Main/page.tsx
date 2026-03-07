"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Minimal self-contained cursor sparkle + canvas scribble effect
export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [activeUser, setActiveUser] = useState(0);
  const lastPos = useRef({ x: 0, y: 0 });

  const users = ["Aryan", "Meera", "Zaid", "Priya"];
  const userColors = ["#10b981", "#38bdf8", "#a78bfa", "#fb923c"];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUser((p) => (p + 1) % users.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Canvas scribble zone
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x: e.clientX, y: e.clientY });
      setCursorVisible(true);
      if (isDrawing) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.7;
        ctx.stroke();
      }
      lastPos.current = { x, y };
    };
    const onMouseDown = (e: MouseEvent) => {
      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      lastPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    const onMouseUp = () => setIsDrawing(false);
    const onMouseLeave = () => {
      setIsDrawing(false);
      setCursorVisible(false);
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [isDrawing]);

  const [cleared, setCleared] = useState(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCleared(true);
    setTimeout(() => setCleared(false), 1000);
  };

  const gotoLogin = () => router.push("/login");

  return (
    <main className="bg-[#f5f3ee] min-h-screen font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600&display=swap');

        * { cursor: none !important; }

        .font-display { font-family: 'DM Serif Display', serif; }
        .font-mono-custom { font-family: 'DM Mono', monospace; }
        .font-body { font-family: 'Outfit', sans-serif; }

        .custom-cursor {
          position: fixed;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: multiply;
          transition: transform 0.1s ease;
        }
        .custom-cursor-ring {
          position: fixed;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid #10b98166;
          pointer-events: none;
          z-index: 9998;
          transition: all 0.15s ease;
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes float-rev {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(10px) rotate(-1deg); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes draw-line {
          from { stroke-dashoffset: 500; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .float-1 { animation: float-slow 5s ease-in-out infinite; }
        .float-2 { animation: float-rev 6s ease-in-out infinite; }
        .float-3 { animation: float-slow 7s ease-in-out infinite 1s; }
        .marquee-track { animation: marquee 18s linear infinite; }
        .cursor-blink { animation: blink 1s step-end infinite; }
        .fade-up { animation: fade-up 0.7s ease forwards; }
        .scale-in { animation: scale-in 0.5s ease forwards; }
        .spin-slow { animation: spin-slow 12s linear infinite; }

        .noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.4;
          pointer-events: none;
          border-radius: inherit;
        }

        .scratch-line {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: draw-line 1.5s ease forwards;
        }

        .tag-pill {
          background: #10b98115;
          border: 1px solid #10b98140;
          color: #059669;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.05em;
        }

        .canvas-zone {
          cursor: crosshair !important;
        }
        .canvas-zone * {
          cursor: crosshair !important;
        }

        .emerald-glow {
          box-shadow: 0 0 40px #10b98130, 0 0 80px #10b98110;
        }

        .feature-card {
          background: #ffffffcc;
          backdrop-filter: blur(8px);
          border: 1px solid #e2e8f020;
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px #10b98120;
          border-color: #10b98140;
        }

        .btn-primary {
          background: #10b981;
          color: white;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 40%, #ffffff25 100%);
        }
        .btn-primary:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px #10b98150;
        }

        .btn-outline {
          border: 1.5px solid #10b981;
          color: #10b981;
          transition: all 0.2s ease;
        }
        .btn-outline:hover {
          background: #10b981;
          color: white;
          transform: translateY(-2px);
        }

        .grid-bg {
          background-image:
            linear-gradient(#10b98108 1px, transparent 1px),
            linear-gradient(90deg, #10b98108 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .sticky-note {
          transform: rotate(-2deg);
          transition: transform 0.3s ease;
        }
        .sticky-note:hover { transform: rotate(0deg) scale(1.03); }
        .sticky-note-2 { transform: rotate(1.5deg); }
        .sticky-note-2:hover { transform: rotate(0deg) scale(1.03); }

        .scribble-underline {
          position: relative;
          display: inline-block;
        }
        .scribble-underline::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 3px;
          background: #38bdf8;
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }
        .scribble-underline:hover::after { transform: scaleX(1); }

        .number-badge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #10b981;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          flex-shrink: 0;
        }

        .avatar-ring {
          border: 2px solid #f5f3ee;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          margin-left: -8px;
          color: white;
        }

        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #10b981;
        }

        .big-counter {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(48px, 7vw, 96px);
          color: #10b981;
          line-height: 1;
        }

        .ai-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #10b98120, #38bdf820);
          border: 1px solid #10b98130;
          border-radius: 8px;
          padding: 4px 10px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #0d9488;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f5f3ee; }
        ::-webkit-scrollbar-thumb { background: #10b98150; border-radius: 3px; }
      `}</style>

      {/* Custom Cursor */}
      {cursorVisible && (
        <>
          <div
            className="custom-cursor"
            style={{ left: mousePos.x - 6, top: mousePos.y - 6 }}
          />
          <div
            className="custom-cursor-ring"
            style={{ left: mousePos.x - 18, top: mousePos.y - 18 }}
          />
        </>
      )}

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: "#f5f3eecc",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #10b98115",
        }}
      >
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <div className="relative w-8 h-8">
            <div
              className="absolute inset-0 rounded-lg bg-emerald-500"
              style={{ transform: "rotate(8deg)" }}
            />
            <div
              className="absolute inset-0 rounded-lg bg-sky-400 opacity-60"
              style={{ transform: "rotate(-4deg)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 14L8 2L14 14"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 10H12"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <span className="font-display text-xl">
            <span className="text-[#064e3b]">Canvas</span>
            <span className="text-[#10b981]">ly</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-body text-sm text-slate-600">
          {["Features", "Pricing", "Changelog", "Docs"].map((item) => (
            <a
              key={item}
              href="#"
              className="scribble-underline hover:text-slate-900 transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={gotoLogin}
            className="btn-outline font-body text-sm px-4 py-2 rounded-lg font-medium"
          >
            Sign in
          </button>
          <button className="btn-primary font-body text-sm px-4 py-2 rounded-lg font-medium">
            Get started →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen grid-bg flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden noise-bg">
        {/* Decorative orbs */}
        <div
          className="absolute top-32 left-16 w-64 h-64 rounded-full opacity-20 float-1"
          style={{
            background: "radial-gradient(circle, #10b981, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute bottom-24 right-20 w-80 h-80 rounded-full opacity-15 float-2"
          style={{
            background: "radial-gradient(circle, #38bdf8, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        {/* Floating sticky notes */}
        <div className="sticky-note absolute top-36 right-16 hidden lg:block bg-yellow-100 border border-yellow-200 rounded p-3 w-36 shadow-md z-10">
          <div className="font-mono-custom text-xs text-yellow-800 leading-relaxed">
            ✏️ draw freely
            <br />
            💡 ask AI anything
            <br />
            👥 invite anyone
          </div>
        </div>
        <div className="sticky-note-2 absolute bottom-32 left-12 hidden lg:block bg-sky-50 border border-sky-200 rounded p-3 w-32 shadow-md z-10">
          <div className="font-mono-custom text-xs text-sky-800 leading-relaxed">
            🔄 real-time sync
            <br />⚡ zero lag
          </div>
        </div>

        {/* Spinning badge */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 -translate-y-8 opacity-30">
          <svg width="90" height="90" viewBox="0 0 90 90" className="spin-slow">
            <path
              id="circle"
              d="M 45,45 m -32,0 a 32,32 0 1,1 64,0 a 32,32 0 1,1 -64,0"
              fill="none"
            />
            <text
              fontSize="8.5"
              fontFamily="DM Mono, monospace"
              fill="#10b981"
              letterSpacing="2"
            >
              <textPath href="#circle">
                COLLABORATE · CREATE · INNOVATE ·{" "}
              </textPath>
            </text>
          </svg>
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto fade-up">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="ai-chip">
              <span>✦</span> AI-Powered Whiteboard
            </div>
            <span className="tag-pill">Beta</span>
          </div>

          <h1
            className="font-display text-slate-900 leading-[1.05] mb-6"
            style={{ fontSize: "clamp(42px, 7vw, 88px)" }}
          >
            Your teams
            <br />
            <em style={{ color: "#10b981", fontStyle: "italic" }}>
              shared canvas,
            </em>
            <br />
            supercharged
          </h1>

          <p className="font-body text-slate-500 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Draw, diagram, brainstorm — all together, in real time. Then let AI
            turn your mess of ideas into structured gold.
          </p>

          {/* Live avatars */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center">
              {["#10b981", "#38bdf8", "#a78bfa", "#fb923c"].map((color, i) => (
                <div
                  key={i}
                  className="avatar-ring"
                  style={{ background: color, zIndex: 4 - i }}
                >
                  {["A", "M", "Z", "P"][i]}
                </div>
              ))}
            </div>
            <div className="font-body text-sm text-slate-500">
              <span
                className="font-semibold text-slate-700"
                style={{ color: userColors[activeUser] }}
              >
                {users[activeUser]}
              </span>{" "}
              is drawing right now<span className="cursor-blink">|</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button className="btn-primary font-body font-semibold px-7 py-3.5 rounded-xl text-base">
              Open Whiteboard →
            </button>
            <button className="btn-outline font-body font-medium px-7 py-3.5 rounded-xl text-base">
              Watch 60s demo
            </button>
          </div>

          <p className="font-mono-custom text-xs text-slate-400 mt-4">
            No credit card · Free forever for small teams
          </p>
        </div>

        {/* Hero whiteboard preview */}
        <div
          className="relative z-10 mt-16 w-full max-w-4xl mx-auto scale-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl emerald-glow canvas-zone"
            style={{ border: "1px solid #10b98130", background: "#ffffff" }}
          >
            {/* Whiteboard toolbar */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100"
              style={{ background: "#fafafa" }}
            >
              <div className="flex gap-1.5">
                {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                  <div
                    key={c}
                    className="w-3 h-3 rounded-full"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 ml-4">
                {["✏️", "⬜", "⭕", "📝", "🖱️"].map((tool, i) => (
                  <button
                    key={i}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-sm hover:bg-slate-100 transition-colors ${i === 0 ? "bg-emerald-50 ring-1 ring-emerald-200" : ""}`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="ai-chip text-xs">✦ Ask AI</div>
                <button
                  onClick={clearCanvas}
                  className="font-mono-custom text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded"
                >
                  {cleared ? "✓ cleared" : "clear"}
                </button>
              </div>
            </div>

            {/* Actual drawable canvas */}
            <div className="relative" style={{ height: "320px" }}>
              {/* Pre-drawn SVG strokes */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 1 }}
              >
                {/* User 1 - emerald */}
                <path
                  d="M 80,80 C 120,60 160,100 200,80"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  className="scratch-line"
                />
                <rect
                  x="240"
                  y="60"
                  width="120"
                  height="80"
                  rx="8"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  fill="#10b98108"
                  strokeDasharray="500"
                  strokeDashoffset="500"
                  style={{ animation: "draw-line 2s ease 0.5s forwards" }}
                />
                <text
                  x="300"
                  y="105"
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="DM Mono"
                  fill="#10b981"
                >
                  User Flow
                </text>

                {/* User 2 - sky */}
                <circle
                  cx="440"
                  cy="100"
                  r="50"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  fill="#38bdf808"
                  strokeDasharray="500"
                  strokeDashoffset="500"
                  style={{ animation: "draw-line 2s ease 0.3s forwards" }}
                />
                <text
                  x="440"
                  y="105"
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="DM Mono"
                  fill="#38bdf8"
                >
                  Brainstorm
                </text>

                {/* Arrow */}
                <path
                  d="M 360,100 L 390,100"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  markerEnd="url(#arrow)"
                  strokeDasharray="500"
                  strokeDashoffset="500"
                  style={{ animation: "draw-line 1.5s ease 1s forwards" }}
                />
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="6"
                    markerHeight="6"
                    refX="3"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M 0,0 L 6,3 L 0,6 Z" fill="#94a3b8" />
                  </marker>
                </defs>

                {/* Scribble line */}
                <path
                  d="M 80,200 Q 140,170 200,200 Q 260,230 320,200 Q 380,170 440,200"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                  strokeDasharray="500"
                  strokeDashoffset="500"
                  style={{ animation: "draw-line 3s ease 0.8s forwards" }}
                />

                {/* Sticky note */}
                <rect
                  x="520"
                  y="180"
                  width="110"
                  height="80"
                  rx="4"
                  fill="#fef08a"
                  stroke="#fde047"
                  strokeWidth="1"
                />
                <text
                  x="575"
                  y="210"
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="DM Mono"
                  fill="#854d0e"
                >
                  💡 idea:
                </text>
                <text
                  x="575"
                  y="225"
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="DM Mono"
                  fill="#713f12"
                >
                  onboarding flow
                </text>
                <text
                  x="575"
                  y="240"
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="DM Mono"
                  fill="#713f12"
                >
                  needs rework
                </text>

                {/* AI suggestion box */}
                <rect
                  x="60"
                  y="240"
                  width="180"
                  height="56"
                  rx="8"
                  fill="#10b98112"
                  stroke="#10b98140"
                  strokeWidth="1"
                />
                <text
                  x="73"
                  y="262"
                  fontSize="9"
                  fontFamily="DM Mono"
                  fill="#059669"
                >
                  ✦ AI Suggestion
                </text>
                <text
                  x="73"
                  y="277"
                  fontSize="9"
                  fontFamily="Outfit"
                  fill="#047857"
                >
                  Group these into a sprint
                </text>
                <text
                  x="73"
                  y="289"
                  fontSize="9"
                  fontFamily="Outfit"
                  fill="#047857"
                >
                  backlog? → Yes / Dismiss
                </text>
              </svg>

              {/* Real drawable canvas layer */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full canvas-zone"
                style={{ zIndex: 2, background: "transparent" }}
              />

              {/* "Try drawing" hint */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <span className="font-mono-custom text-xs text-slate-300 select-none">
                  ← try drawing here →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE STRIP */}
      <div
        className="py-4 overflow-hidden"
        style={{
          background: "#10b981",
          borderTop: "2px solid #059669",
          borderBottom: "2px solid #059669",
        }}
      >
        <div
          className="marquee-track flex gap-12 whitespace-nowrap"
          style={{ width: "max-content" }}
        >
          {Array(2)
            .fill([
              "✦ Real-time Sync",
              "✦ AI Suggestions",
              "✦ Infinite Canvas",
              "✦ Smart Shapes",
              "✦ Voice Notes",
              "✦ Export to PDF",
              "✦ Figma Import",
              "✦ Version History",
              "✦ Guest Links",
              "✦ Cursor Chat",
            ])
            .flat()
            .map((item, i) => (
              <span
                key={i}
                className="font-mono-custom text-white text-sm tracking-wide"
              >
                {item}
              </span>
            ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="section-label mb-3">What you get</div>
          <h2
            className="font-display text-slate-900"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Everything your team needs
            <br />
            to <em style={{ color: "#38bdf8" }}>think out loud</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: "⚡",
              color: "#10b981",
              title: "Zero-lag collaboration",
              desc: "CRDTs under the hood. Multiple cursors, zero conflicts. Works even on a bad train WiFi.",
              tag: "Real-time",
            },
            {
              icon: "✦",
              color: "#38bdf8",
              title: "AI that actually helps",
              desc: "Highlight any region of your board and ask AI to summarize, restructure, or suggest next steps.",
              tag: "AI-powered",
            },
            {
              icon: "∞",
              color: "#a78bfa",
              title: "Infinite canvas",
              desc: "No boundaries. Zoom out to the universe, zoom in to a pixel. Your ideas have room to breathe.",
              tag: "Spatial",
            },
            {
              icon: "🔗",
              color: "#fb923c",
              title: "Link anything",
              desc: "Connect cards to Notion pages, Figma files, GitHub issues. One board, all your context.",
              tag: "Integrations",
            },
            {
              icon: "🎙️",
              color: "#10b981",
              title: "Voice-to-canvas",
              desc: "Speak. Canvo transcribes and places it as a sticky note or diagram — wherever your cursor is.",
              tag: "Voice",
            },
            {
              icon: "📦",
              color: "#38bdf8",
              title: "Smart templates",
              desc: "Retro, sprint planning, user journeys, and 40+ more. Start structured, go wild from there.",
              tag: "Templates",
            },
          ].map((feat, i) => (
            <div
              key={i}
              className="feature-card rounded-2xl p-6 relative overflow-hidden noise-bg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl">
                  {feat.icon === "✦" || feat.icon === "∞" ? (
                    <span
                      className="font-display text-4xl"
                      style={{ color: feat.color }}
                    >
                      {feat.icon}
                    </span>
                  ) : (
                    feat.icon
                  )}
                </div>
                <span
                  className="tag-pill"
                  style={{
                    background: feat.color + "15",
                    borderColor: feat.color + "40",
                    color: feat.color,
                  }}
                >
                  {feat.tag}
                </span>
              </div>
              <h3 className="font-display text-xl text-slate-900 mb-2">
                {feat.title}
              </h3>
              <p className="font-body text-slate-500 text-sm leading-relaxed">
                {feat.desc}
              </p>
              <div
                className="absolute bottom-0 right-0 w-24 h-24 rounded-tl-full opacity-5"
                style={{ background: feat.color }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6" style={{ background: "#0f172a" }}>
        <div className="max-w-4xl mx-auto">
          <div className="section-label text-emerald-400 mb-3 text-center">
            How it works
          </div>
          <h2
            className="font-display text-white text-center mb-16"
            style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
          >
            From blank canvas to
            <br />
            <em style={{ color: "#10b981" }}>shipped idea</em> in minutes
          </h2>

          <div className="space-y-10">
            {[
              {
                step: "01",
                title: "Open a board, invite your team",
                desc: "Create a board in 2 seconds. Share a link — no signups required for guests. See everyone's cursor live.",
                note: "guests join instantly →",
              },
              {
                step: "02",
                title: "Draw, write, drop anything",
                desc: "Freehand drawing, sticky notes, shapes, images, PDFs, embeds. The canvas accepts everything.",
                note: "infinite canvas →",
              },
              {
                step: "03",
                title: "Let AI make sense of it",
                desc: "Lasso a chaotic section. Ask 'summarize this' or 'turn this into action items'. Done.",
                note: "✦ AI magic →",
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-6 items-start group">
                <div
                  className="font-mono-custom text-4xl font-medium flex-shrink-0 w-16 text-right"
                  style={{ color: "#10b98130" }}
                >
                  {step.step}
                </div>
                <div className="flex-1 border-l border-slate-700 pl-6 pb-6 group-last:border-transparent">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-white text-xl">
                      {step.title}
                    </h3>
                    <span className="font-mono-custom text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {step.note}
                    </span>
                  </div>
                  <p className="font-body text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "10k+", label: "boards created" },
            { num: "98%", label: "uptime guaranteed" },
            { num: "<50ms", label: "sync latency" },
            { num: "40+", label: "smart templates" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="big-counter">{stat.num}</div>
              <div className="font-body text-slate-500 text-sm mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 px-6" style={{ background: "#f0fdf4" }}>
        <div className="max-w-5xl mx-auto">
          <div className="section-label text-emerald-600 mb-8 text-center">
            From the community
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote:
                  "We replaced Miro, FigJam, and half our Notion usage. Everything just lives on the board now.",
                name: "Shreya K.",
                role: "Head of Design, Razorpay",
                color: "#10b981",
              },
              {
                quote:
                  "The AI feature that auto-summarizes a messy brainstorm into action items saved our weekly retro.",
                name: "Rohan M.",
                role: "Engineering Lead, Zepto",
                color: "#38bdf8",
              },
              {
                quote:
                  "Guest links are a game changer. Clients draw on the board with us in real time. No friction at all.",
                name: "Ananya S.",
                role: "Product Manager, Groww",
                color: "#a78bfa",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden noise-bg"
              >
                <div
                  className="font-display text-5xl mb-3 leading-none"
                  style={{ color: t.color, opacity: 0.3 }}
                >
                </div>
                <p className="font-body text-slate-700 text-sm leading-relaxed mb-4 -mt-3">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ background: t.color }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-body text-slate-800 text-sm font-medium">
                      {t.name}
                    </div>
                    <div className="font-mono-custom text-slate-400 text-xs">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-28 px-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #0c4a6e 100%)",
        }}
      >
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #10b981, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #38bdf8, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="text-5xl mb-6 float-1 inline-block">✦</div>
          <h2
            className="font-display text-white mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 60px)" }}
          >
            Start building together
          </h2>
          <p className="font-body text-emerald-200 text-lg mb-10 leading-relaxed">
            One link. Infinite canvas. AI on call.
            <br />
            Free for teams under 5. Always.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button className="font-body font-semibold px-8 py-4 rounded-xl text-base bg-white text-emerald-900 hover:bg-emerald-50 transition-all hover:-translate-y-1 shadow-lg">
              Create your first board →
            </button>
            <button className="font-body font-medium px-8 py-4 rounded-xl text-base border border-white/30 text-white hover:bg-white/10 transition-all">
              Talk to us
            </button>
          </div>
          <p className="font-mono-custom text-emerald-400 text-xs mt-6">
            No setup · No card · Ships in 10 seconds
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-12 px-8 border-t border-slate-200"
        style={{ background: "#f5f3ee" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-6 h-6">
                <div
                  className="absolute inset-0 rounded bg-emerald-500"
                  style={{ transform: "rotate(8deg)" }}
                />
                <div
                  className="absolute inset-0 rounded bg-sky-400 opacity-60"
                  style={{ transform: "rotate(-4deg)" }}
                />
              </div>
              <span className="font-display text-xl">
                <span className="text-[#064e3b]">Canvas</span>
                <span className="text-[#10b981]">ly</span>
              </span>
            </div>
            <p className="font-mono-custom text-slate-400 text-xs">
              Think together. Ship faster.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-12 text-sm">
            {[
              {
                heading: "Product",
                links: ["Features", "Pricing", "Changelog", "Roadmap"],
              },
              {
                heading: "Resources",
                links: ["Docs", "Templates", "Blog", "Status"],
              },
              {
                heading: "Company",
                links: ["About", "Careers", "Privacy", "Terms"],
              },
            ].map((col) => (
              <div key={col.heading}>
                <div className="font-mono-custom text-xs text-slate-400 mb-3 uppercase tracking-wider">
                  {col.heading}
                </div>
                {col.links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="block font-body text-slate-600 hover:text-emerald-600 transition-colors mb-1.5"
                  >
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <span className="font-mono-custom text-xs text-slate-400">
            © 2025 Canvasly. Made with ✦ and a lot of coffee.
          </span>
          <div className="flex gap-4">
            {["𝕏", "in", "gh"].map((s) => (
              <a
                key={s}
                href="#"
                className="font-mono-custom text-sm text-slate-400 hover:text-emerald-600 transition-colors"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
