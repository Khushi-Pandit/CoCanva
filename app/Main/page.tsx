"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
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

  const router = useRouter();
  const canvasPage = () => {
    router.push("/canvas");
  };

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
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-mint-200 to-cyan-400 text-gray-900 overflow-hidden relative">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[28rem] h-[28rem] bg-cyan-300/30 rounded-full blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, -80, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "15%", left: "10%" }}
        />
        <motion.div
          className="absolute w-[22rem] h-[22rem] bg-green-300/30 rounded-full blur-2xl"
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 0.85, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "20%", right: "15%" }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <motion.nav
          className="flex justify-between items-center p-6 md:p-10"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center space-x-2">
            <Palette className="w-8 h-8 text-cyan-500" />
            <span className="text-2xl font-bold tracking-tight">Canvasly</span>
          </div>
          <div className="flex space-x-8 text-sm md:text-base">
            <button className="hover:text-cyan-600 transition-colors">
              Templates
            </button>
            <button className="hover:text-cyan-600 transition-colors">
              Features
            </button>
            <button className="hover:text-cyan-600 transition-colors">
              Pricing
            </button>
            <button className="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-all">
              Sign In
            </button>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 text-center">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="max-w-4xl"
          >
            <motion.h1
              className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-gray-900"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="inline-block">✨ Turn Ideas Into Reality</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-500 to-green-500 bg-clip-text text-transparent">
                With Canvasly
              </span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-2xl mb-8 text-gray-700 font-light max-w-2xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              Create beautiful designs, presentations, and content with an
              intuitive editor that makes creativity effortless.
            </motion.p>

            {/* Dynamic Feature Text */}
            <motion.div
              className="mb-10 h-8"
              key={currentFeature}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-lg text-cyan-600 font-semibold tracking-wide">
                → {features[currentFeature]}
              </span>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-6 mb-14"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            {/* Start Free → Canvas Page */}
            <motion.button
              className="group px-8 py-4 bg-cyan-500 text-white font-bold rounded-2xl shadow-lg hover:bg-cyan-600 transition-all duration-300 flex items-center space-x-2"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={canvasPage} // ✅ navigation fixed
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Previous Work Button */}
            <motion.button
              className="group px-8 py-4 bg-transparent border-2 border-cyan-600 text-cyan-600 font-bold rounded-2xl hover:bg-cyan-600 hover:text-white transition-all duration-300 flex items-center space-x-2"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-5 h-5" />
              <span>Previous Work</span>
            </motion.button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 mb-12 text-sm md:text-base text-gray-800"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-600" />
              <span>10M+ Active Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-cyan-600" />
              <span>500K+ Templates</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-cyan-600" />
              <span>4.9★ Rating</span>
            </div>
          </motion.div>
        </div>

        {/* Testimonials Section */}
        <motion.div
          className="pb-16 px-6"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        >
          <h3 className="text-center text-lg md:text-xl font-semibold mb-8 text-gray-800">
            Trusted by creators worldwide 🌍
          </h3>
          <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 max-w-sm shadow-md border border-cyan-100"
                whileHover={{ scale: 1.03, y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-cyan-500 text-cyan-500"
                    />
                  ))}
                </div>
                <p className="text-base mb-3 text-gray-700 italic">
                  “{testimonial.text}”
                </p>
                <div className="text-sm text-gray-600">
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
