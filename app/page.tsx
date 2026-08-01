"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useAnimationFrame, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Trophy, Shield, Sparkles, Code2, Network, ExternalLink, Calendar, PenTool, FileText, X } from "lucide-react";
import Link from "next/link";
import CinematicCanvas from "@/app/components/CinematicCanvas";
import Logo from "@/app/components/Logo";

const NODE_DATA: Record<string, { left: any[], right: any[], title: string, subtitle: string }> = {
  "Geeks Community": {
    title: "The Geeks Community",
    subtitle: "Solely architected and independently engineered digital society.",
    left: [
      { title: "Tech Geeks ⚙️", link: "https://chat.whatsapp.com/K63swM9EZHD2auoKKADVr7", type: "whatsapp" },
      { title: "Irony Geeks 😉", link: "https://chat.whatsapp.com/GJczJxfDoZd9snXDeLsoWa", type: "whatsapp" },
      { title: "Litrature Geeks 📜", link: "https://chat.whatsapp.com/DIWFLAe5o4yD0rtUbRn05D", type: "whatsapp" },
      { title: "Geopolitics Geeks 🌍", link: "https://chat.whatsapp.com/FFDt9VLP1DE9qnJ4cVUVyy", type: "whatsapp" },
      { title: "Cinema Geeks 🎬", link: "https://chat.whatsapp.com/HgrnH9nSmOH4ffH9Tg4tia", type: "whatsapp" },
      { title: "Cyber Geeks 🌐", link: "https://chat.whatsapp.com/DtAHzx0Yc7g2mHTLwfkasO?mode=gi_t", type: "whatsapp" },
    ],
    right: [
      { title: "Broken Geeks ❤️‍🩹", link: "https://chat.whatsapp.com/G03Ehwg1wfZG8cgd63qDDX", type: "whatsapp" },
      { title: "Chess Geeks ♟", link: "https://chat.whatsapp.com/KSPWvo2WoZH7KCPKYqgwk2", type: "whatsapp" },
      { title: "Maths & Physics Geeks 🤓", link: "https://chat.whatsapp.com/LMtTHvbk2cUEZ3uK5tgebI", type: "whatsapp" },
      { title: "Fact Geeks 💯", link: "https://chat.whatsapp.com/Fur2ZJNbeMnBqnTvzCwaaP", type: "whatsapp" },
      { title: "Anime Geeks ⛩️", link: "https://chat.whatsapp.com/FV1qQH0XJE7LU23D1RhcP2?mode=gi_t", type: "whatsapp" },
      { title: "Event Geeks 📅", link: "https://chat.whatsapp.com/LUuzb4A8cfj34NXcrCWYWc?mode=gi_t", type: "whatsapp" },
    ]
  },
  "vzn-SHOWDOWN": {
    title: "vzn-SHOWDOWN",
    subtitle: "Flagship cognitive decompression events.",
    left: [
      { title: "Free Fire Tournament", desc: "Professional-grade esports brackets under the EXAMS banner. Live scorecard tracking.", icon: <Trophy className="w-5 h-5 text-yellow-500" /> },
      { title: "Tactical Analysis", desc: "Breakdowns of recent tournament mechanics and advanced strategies.", icon: <Shield className="w-5 h-5 text-blue-400" /> },
    ],
    right: [
      { title: "Upcoming: Poetry Recitals", desc: "Creative writing showcases designed to balance algorithmic logic with linguistic expression.", icon: <PenTool className="w-5 h-5 text-pink-400" /> },
      { title: "Event Horizons", desc: "Future decompression schedules and community meetups.", icon: <Calendar className="w-5 h-5 text-purple-400" /> },
    ]
  },
  "Academic Synergy": {
    title: "Academic Synergy",
    subtitle: "Peer-curated intelligence.",
    left: [{ title: "Semester Notes", desc: "Categorized, high-yield documentation.", icon: <BookOpen className="w-5 h-5" /> }],
    right: [{ title: "Previous Year Questions", desc: "Historical data analysis for exam preparation.", icon: <FileText className="w-5 h-5" /> }]
  },
  "Curated Access": {
    title: "Curated Access",
    subtitle: "Verified ecosystem integrity.",
    left: [{ title: "Admin Protocols", desc: "Strict quality control over all material.", icon: <Shield className="w-5 h-5" /> }],
    right: [{ title: "User Verification", desc: "Ensuring an exclusive hub for genuine students.", icon: <Network className="w-5 h-5" /> }]
  },
  "devSPACE Hub": {
    title: "devSPACE Hub",
    subtitle: "Unified digital workflows.",
    left: [{ title: "Architecture", desc: "The foundational systems linking all communities.", icon: <Code2 className="w-5 h-5" /> }],
    right: [{ title: "Deployment", desc: "Live application states and database health.", icon: <Network className="w-5 h-5" /> }]
  }
};

export default function LandingPage() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const mobileStreamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeNode && window.innerWidth < 1024 && mobileStreamRef.current) {
      setTimeout(() => {
        mobileStreamRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [activeNode]);

  return (
    <div className="relative min-h-screen bg-[#020202] text-white selection:bg-white/20 font-sans overflow-x-hidden flex flex-col">
      <div className="pointer-events-none fixed inset-0 z-[60] h-full w-full opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      <CinematicCanvas />

      <nav className="relative z-50 flex items-center justify-between px-6 py-6 lg:px-12 max-w-[1400px] w-full mx-auto flex-shrink-0">
        <motion.div onClick={() => setActiveNode(null)} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="cursor-pointer group">
          <Logo className="w-28 md:w-36 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      </nav>

      <main className="relative z-10 flex flex-col lg:flex-row flex-1 w-full max-w-[1600px] mx-auto items-center justify-between px-4 lg:px-0">

        <div className="hidden lg:flex w-[280px] h-[75vh] relative z-20 flex-col justify-center items-end ml-8">
          <AnimatePresence mode="wait">
            {activeNode && NODE_DATA[activeNode]?.left && <DataStream streamData={NODE_DATA[activeNode].left} direction="up" key={`left-${activeNode}`} />}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative z-30 pointer-events-none w-full py-12 lg:py-0">
          <div className="pointer-events-auto flex flex-col items-center w-full max-w-4xl px-4">

            <div className="flex flex-col items-center justify-center text-center transition-all duration-500 w-full z-30">
              <AnimatePresence mode="wait">
                {!activeNode ? (
                  <motion.div key="default-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-2 mb-4 md:mb-6 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md">
                      <Sparkles className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] sm:text-xs font-medium text-gray-300 tracking-wider uppercase">Engineered for Gurugram University</span>
                    </div>
                    <StaggeredHeading text="The Exclusive Hub for" />
                    <h1 className="whitespace-nowrap text-[2.2rem] sm:text-6xl lg:text-[5.5rem] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 drop-shadow-2xl leading-normal mt-2">
                      Gurugram University
                    </h1>
                  </motion.div>
                ) : (
                  <motion.div key="active-hero" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className="flex flex-col items-center">
                    <button onClick={() => setActiveNode(null)} className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all duration-300 active:scale-95">
                      <X className="w-3.5 h-3.5" /> Return to Core
                    </button>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-xl mb-4 whitespace-nowrap">
                      {NODE_DATA[activeNode].title}
                    </h2>
                    <p className="text-gray-400 text-sm md:text-base max-w-md text-center font-light leading-relaxed">
                      {NODE_DATA[activeNode].subtitle}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-8 mb-8 z-40 pointer-events-auto flex justify-center w-full">
              <Link href="/auth">
                <MagneticButton>
                  <span className="mr-2 relative z-10 text-white font-bold tracking-wide">Enter the Vault</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10 text-white" />
                </MagneticButton>
              </Link>
            </motion.div>

            <div className="scale-75 md:scale-100 z-20">
              <RadialOrbit activeNode={activeNode} setActiveNode={setActiveNode} />
            </div>

          </div>
        </div>

        <div className="hidden lg:flex w-[280px] h-[75vh] relative z-20 flex-col justify-center items-start mr-8">
          <AnimatePresence mode="wait">
            {activeNode && NODE_DATA[activeNode]?.right && <DataStream streamData={NODE_DATA[activeNode].right} direction="down" key={`right-${activeNode}`} />}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {activeNode && (
            <motion.div
              ref={mobileStreamRef}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex flex-col lg:hidden w-full max-w-md mx-auto px-4 mt-8 pb-24 gap-4 pointer-events-auto scroll-mt-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">Access Links</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20" />
              </div>
              {NODE_DATA[activeNode]?.left.map((item, idx) => <TracedBentoBox key={`mob-left-${idx}`} data={item} />)}
              {NODE_DATA[activeNode]?.right.map((item, idx) => <TracedBentoBox key={`mob-right-${idx}`} data={item} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 1.5 }} className="fixed bottom-6 right-8 z-[100] pointer-events-auto hidden md:block">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium opacity-50 hover:opacity-100 transition-opacity cursor-default flex items-center gap-2">
          Architected by <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Divyanshu</span>
        </p>
      </motion.div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .marquee-container { display: flex; flex-direction: column; gap: 1.5rem; height: max-content; }
        .animate-marquee-up { animation: marquee-vertical-up 30s linear infinite; }
        .animate-marquee-down { animation: marquee-vertical-down 30s linear infinite; }
        .pause-on-hover:hover .animate-marquee-up, .pause-on-hover:hover .animate-marquee-down { animation-play-state: paused; }
        @keyframes marquee-vertical-up { 0% { transform: translateY(0%); } 100% { transform: translateY(-50%); } }
        @keyframes marquee-vertical-down { 0% { transform: translateY(-50%); } 100% { transform: translateY(0%); } }
      `}} />
    </div>
  );
}

function StaggeredHeading({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h2 className="text-lg sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-400 flex flex-wrap justify-center gap-[0.3em]">
      {words.map((word, i) => (
        <motion.span key={i} initial={{ opacity: 0, y: 15, rotateX: -40 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.8, delay: i * 0.08 + 0.2, ease: [0.16, 1, 0.3, 1] }} className="inline-block" style={{ transformPerspective: 400 }}>
          {word}
        </motion.span>
      ))}
    </h2>
  );
}

function DataStream({ streamData, direction }: { streamData: any[], direction: "up" | "down" }) {
  const duplicatedData = [...streamData, ...streamData];
  const animationClass = direction === "up" ? "animate-marquee-up" : "animate-marquee-down";
  return (
    <motion.div initial={{ opacity: 0, x: direction === "up" ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction === "up" ? -30 : 30 }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full w-full overflow-hidden relative pause-on-hover pointer-events-auto [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]">
      <div className={`marquee-container ${animationClass}`}>{duplicatedData.map((item, idx) => <TracedBentoBox key={idx} data={item} />)}</div>
    </motion.div>
  );
}

function TracedBentoBox({ data }: { data: any }) {
  const isLink = data.type === "whatsapp";
  const content = (
    <div className="relative group overflow-hidden rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-md border border-dashed border-white/20 p-5 hover:border-white/50 transition-colors duration-300 w-full shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-[15px] font-bold text-gray-100 mb-1 flex items-center gap-2">{data.icon} {data.title}</h4>
          {data.desc && <p className="text-xs text-gray-400 leading-relaxed mt-2">{data.desc}</p>}
          {isLink && <span className="text-[10px] text-green-400/80 font-bold tracking-widest uppercase mt-3 block">Join Network</span>}
        </div>
        {isLink && <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors ml-3 flex-shrink-0" />}
      </div>
    </div>
  );
  if (isLink) return <a href={data.link} target="_blank" rel="noopener noreferrer" className="block w-full">{content}</a>;
  return <div className="block w-full">{content}</div>;
}

function RadialOrbit({ activeNode, setActiveNode }: { activeNode: string | null, setActiveNode: (val: string | null) => void }) {
  const orbitRadius = 170;
  const rotationAngle = useMotionValue(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const speedMultiplier = useRef(1);

  useAnimationFrame((t, delta) => {
    const safeDelta = Math.min(delta, 32);
    const targetSpeed = (hoveredNode !== null || activeNode !== null) ? 0 : 1;
    speedMultiplier.current += (targetSpeed - speedMultiplier.current) * 0.08;
    rotationAngle.set(rotationAngle.get() + (0.015 * safeDelta * speedMultiplier.current));
  });

  const orbitItems = [
    { id: "Academic Synergy", icon: <BookOpen className="w-5 h-5 text-gray-300" />, label: "Academic Synergy" },
    { id: "vzn-SHOWDOWN", icon: <Trophy className="w-5 h-5 text-gray-300" />, label: "vzn-SHOWDOWN" },
    { id: "Geeks Community", icon: <Code2 className="w-5 h-5 text-gray-300" />, label: "Geeks Community" },
    { id: "Curated Access", icon: <Shield className="w-5 h-5 text-gray-300" />, label: "Curated Access" },
    { id: "devSPACE Hub", icon: <Network className="w-5 h-5 text-gray-300" />, label: "devSPACE Hub" },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: activeNode ? 0.95 : 1 }} transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }} className="relative flex items-center justify-center w-full max-w-[400px] h-[350px]">
      <div onClick={() => setActiveNode(null)} className={`absolute z-20 flex items-center justify-center w-20 h-20 rounded-full shadow-[0_0_80px_rgba(79,70,229,0.4)] backdrop-blur-md pointer-events-auto cursor-pointer hover:scale-125 transition-all duration-500 ${activeNode ? 'bg-gradient-to-br from-indigo-500/40 to-purple-600/40 border-indigo-400/50 scale-110 shadow-[0_0_100px_rgba(99,102,241,0.6)]' : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-400/30 border'}`}>
        <div className={`flex items-center justify-center w-12 h-12 rounded-full animate-pulse transition-colors duration-500 ${activeNode ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
          <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,1)]" />
        </div>
      </div>
      <motion.div style={{ rotate: rotationAngle }} className={`absolute z-10 w-[340px] h-[340px] rounded-full border border-dashed transition-colors duration-500 ${activeNode ? 'border-indigo-500/30' : 'border-white/20'}`}>
        {orbitItems.map((item, i) => {
          const staticAngle = (i / orbitItems.length) * 360;
          const counterRotate = useTransform(rotationAngle, (r) => -r - staticAngle);
          const isActive = activeNode === item.id;
          const isHovered = hoveredNode === item.id;
          return (
            <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(-50%, -50%) rotate(${staticAngle}deg) translateY(-${orbitRadius}px)` }}>
              <motion.div style={{ rotate: counterRotate }} className="relative flex flex-col items-center gap-3 w-40 cursor-pointer pointer-events-auto" onMouseEnter={() => setHoveredNode(item.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => setActiveNode(isActive ? null : item.id)}>

                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute -top-[100px] left-1/2 -translate-x-1/2 w-48 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-none z-50 flex flex-col items-center text-center"
                    >
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0a0a]/95 border-b border-r border-white/10 rotate-45" />
                      <p className="text-xs font-bold text-white mb-1.5">{item.label}</p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{NODE_DATA[item.id]?.subtitle}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`relative flex items-center justify-center w-14 h-14 rounded-full bg-[#0a0a0a] border backdrop-blur-xl shadow-lg transition-all duration-300 ${isActive ? 'scale-125 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.4)]' : isHovered ? 'scale-110 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'border-white/10'}`}>
                  <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isActive ? 'bg-indigo-500/20 opacity-100' : 'bg-white/5 opacity-0 group-hover:opacity-100'}`} />
                  {item.icon}
                </div>
                <span className={`text-[11px] font-medium tracking-wide uppercase text-center drop-shadow-md transition-colors duration-300 ${isActive ? 'text-indigo-300 font-bold' : isHovered ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    setPosition({ x: (clientX - (left + width / 2)) * 0.15, y: (clientY - (top + height / 2)) * 0.15 });
  };
  const reset = () => setPosition({ x: 0, y: 0 });
  return (
    <motion.button ref={ref} onMouseMove={handleMouse} onMouseLeave={reset} animate={{ x: position.x, y: position.y }} transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }} className="group relative inline-flex items-center justify-center px-8 py-4 sm:px-10 sm:py-5 font-semibold bg-white/5 border border-white/20 rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-95 backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
      {children}
    </motion.button>
  );
}