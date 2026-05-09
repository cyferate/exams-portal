"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Trophy, Shield } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white/30 font-sans overflow-hidden">
      
      {/* Background Glow (Minimalist) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tighter"
        >
          EXAMS<span className="text-gray-500">.</span>
        </motion.div>
        <motion.button 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
        >
          Admin Login
        </motion.button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-20 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            The Exclusive Hub for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-600">
              Gurugram University
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Exploration, Academics, Management, and Strategy. Access curated Notes, PYQs, and Assignments, or decompress with our flagship esports tournaments.
          </p>

          {/* Call to Action Button */}
          <Link href="/auth">
            <button className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-black bg-white rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95">
             <span className="mr-2">Enter the Vault</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>

        {/* Glassmorphic Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full max-w-6xl">
          
          <FeatureCard 
            delay={0.2}
            icon={<BookOpen className="w-6 h-6 text-gray-300" />}
            title="Academic Synergy"
            desc="Semester-wise categorized Notes, PYQs, and Assignments directly from your peers."
          />
          <FeatureCard 
            delay={0.4}
            icon={<Trophy className="w-6 h-6 text-gray-300" />}
            title="vzn-SHOWDOWN"
            desc="Professional-grade Free Fire esports tournaments for cognitive decompression."
          />
          <FeatureCard 
            delay={0.6}
            icon={<Shield className="w-6 h-6 text-gray-300" />}
            title="Curated Access"
            desc="A strictly managed ecosystem. Quality over quantity, led by dedicated admins."
          />

        </div>
      </main>
    </div>
  );
}

// Reusable Glassmorphism Card Component
function FeatureCard({ icon, title, desc, delay }: { icon: any, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.6 }}
      className="flex flex-col items-start p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors"
    >
      <div className="p-3 bg-black/50 rounded-2xl mb-6 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-gray-100">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm text-left">
        {desc}
      </p>
    </motion.div>
  );
}