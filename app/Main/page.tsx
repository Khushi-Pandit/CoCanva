"use client";

import { motion } from "framer-motion";
import {useRouter} from "next/navigation";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Palette,
  Zap,
  Users,
  ArrowRight,
  Play,
  Star,
} from "lucide-react";

export default function MainScreen() {
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    "Professional Templates",
    "Drag & Drop Editor",
    "Team Collaboration",
    "Brand Kit Tools",
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      text: "Transformed our content creation process!",
      rating: 5,
    },
    {
      name: "Mike Rodriguez",
      role: "Small Business Owner",
      text: "Easy to use, stunning results every time.",
      rating: 5,
    },
    {
      name: "Jessica Park",
      role: "Social Media Manager",
      text: "My go-to tool for all design needs.",
      rating: 5,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 text-white overflow-hidden relative">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "10%", left: "10%" }}
        />
        <motion.div
          className="absolute w-72 h-72 bg-amber-300/20 rounded-full blur-2xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "20%", right: "15%" }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <motion.nav
          className="flex justify-between items-center p-6 md:p-8"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center space-x-2">
            <Palette className="w-8 h-8" />
            <span className="text-2xl font-bold">CanvasPro</span>
          </div>
          <div className="flex space-x-6">
            <button className="hover:text-amber-300 transition-colors">
              Templates
            </button>
            <button className="hover:text-amber-300 transition-colors">
              Features
            </button>
            <button className="hover:text-amber-300 transition-colors">
              Pricing
            </button>
            <button className="px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-amber-100 transition-all">
              Sign In
            </button>
          </div>
        </motion.nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 text-center">
          {/* Hero Section */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="max-w-4xl"
          >
            <motion.h1
              className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="inline-block">✨ Turn Your</span>
              <br />
              <span className="bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
                Ideas Into Magic
              </span>
            </motion.h1>

            <motion.p
              className="text-xl md:text-2xl mb-8 text-white/90 font-light max-w-2xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              Create stunning designs, presentations, and content with our
              intuitive drag-and-drop editor. No design experience needed.
            </motion.p>

            {/* Dynamic Feature Text */}
            <motion.div
              className="mb-8 h-8"
              key={currentFeature}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-lg text-amber-300 font-semibold">
                → {features[currentFeature]}
              </span>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-6 mb-12"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <motion.button
              className="group px-8 py-4 bg-white text-emerald-600 font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center space-x-2"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/next-page")}
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Creating Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              className="group px-8 py-4 bg-transparent border-2 border-white/80 font-bold rounded-2xl hover:bg-white hover:text-emerald-600 transition-all duration-300 flex items-center space-x-2"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </motion.button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 mb-12 text-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-300" />
              <span>10M+ Active Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-300" />
              <span>500K+ Templates</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-amber-300" />
              <span>4.9★ Rating</span>
            </div>
          </motion.div>
        </div>

        {/* Testimonials Section */}
        <motion.div
          className="pb-12 px-6"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        >
          <h3 className="text-center text-lg font-semibold mb-6 text-white/90">
            Trusted by creators worldwide
          </h3>
          <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-xs"
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex mb-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-300 text-amber-300"
                    />
                  ))}
                </div>
                <p className="text-sm mb-2 text-white/90">
                  {testimonial.text}
                </p>
                <div className="text-xs text-white/70">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div>{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
