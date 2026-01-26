"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Palette,
  Zap,
  Users,
  ArrowRight,
  Play,
  Star,
} from "lucide-react";

export default function MainScreen() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const router = useRouter();

  const features = [
    "Professional Templates",
    "Drag & Drop Editor",
    "Team Collaboration",
    "Brand Kit Tools",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 text-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-emerald-400/20 rounded-3xl blur-3xl"
          animate={{
            x: [-20, 40, -20],
            y: [-30, 20, -30],
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "10%", left: "5%" }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-blue-400/20 rounded-2xl blur-2xl"
          animate={{
            x: [0, -40, 0],
            y: [20, -30, 20],
            scale: [1, 0.9, 1],
            rotate: [0, -3, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "15%", right: "10%" }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <motion.nav
          className="flex items-center justify-between px-6 md:px-8 py-4 backdrop-blur-md bg-white/80 border-b border-slate-200/50"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Canvasly
            </span>
          </div>

          <div className="flex items-center space-x-6 text-sm font-medium">
            <button className="px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
              Templates
            </button>
            <button className="px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
              Features
            </button>
            <button className="px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700">
              Pricing
            </button>
            <motion.button
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-slate-500 text-white font-semibold rounded-xl shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
            </motion.button>
          </div>
        </motion.nav>

        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 text-center py-12 md:py-24">
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span className="block bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Turn Ideas Into
            </span>
            <span className="block bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
              Reality
            </span>
          </motion.h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl">
            Create beautiful designs, presentations, and content with our
            intuitive editor that makes creativity effortless.
          </p>

          <div className="flex flex-row items-center justify-center gap-4 mb-16">
            <motion.button
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-slate-500 text-white font-bold rounded-2xl shadow-xl text-lg flex items-center space-x-3 overflow-hidden"
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/Main")}
            >
              {/* <Sparkles className="w-5 h-5 relative z-10 group-hover:rotate-180 transition-transform duration-500" /> */}
              <span className="relative z-10">Start Creating</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-2 transition-transform" />

              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>

            <motion.button
              className="px-8 py-4 bg-white/70 backdrop-blur-sm border-2 border-slate-300 text-slate-800 font-semibold rounded-2xl shadow-lg flex items-center space-x-3 text-lg"
              whileHover={{ scale: 1.05, y: -2 }} 
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </motion.button>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: Users, text: "10.0M+", label: "Active Users" },
              { icon: Zap, text: "500.0K+", label: "Templates" },
              { icon: Star, text: "4.90★", label: "Rating" },
            ].map((stat, i) => (  
              <div
                key={i}
                className="flex items-center space-x-2 bg-white/70 px-6 py-3 rounded-xl border shadow-lg"
              >
                <stat.icon className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-black text-xl">{stat.text}</div>
                  <div className="text-xs text-slate-600">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
