"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
    Terminal, ShieldCheck, KeyRound, Sparkles, BookOpen,
    Code2, ArrowLeft, ChevronRight, CheckCircle2,
    Layers, Flame, Play, FileText, CodeSquare
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";

type TrackLevel = "All" | "Fundamentals" | "DSA & Logic" | "Advanced & System";

export default function GarudaPortal() {
    const [profile, setProfile] = useState<any>(null);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [inviteCode, setInviteCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const [languages, setLanguages] = useState<any[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<any | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
    const [activeTrack, setActiveTrack] = useState<TrackLevel>("All");
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    useEffect(() => {
        fetchSessionAndStatus();
    }, []);

    // --- STATE RETENTION LOGIC ---
    useEffect(() => {
        if (hasAccess && languages.length > 0 && !selectedLanguage) {
            const savedLangSlug = sessionStorage.getItem("garuda_last_lang");
            if (savedLangSlug) {
                const langObj = languages.find(l => l.slug === savedLangSlug);
                if (langObj) handleSelectLanguage(langObj);
            }
        }
    }, [hasAccess, languages]);

    async function fetchSessionAndStatus() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

        setProfile(profileData);
        const accessGranted = profileData?.has_nexus_access || profileData?.has_garuda_access || profileData?.is_admin || false;
        setHasAccess(accessGranted);

        if (accessGranted) {
            loadLanguages();
            loadUserSubmissions(session.user.id);
        }
    }

    async function loadLanguages() {
        const { data } = await supabase.from("garuda_languages").select("*").order("name");
        if (data) setLanguages(data);
    }

    async function loadUserSubmissions(userId: string) {
        const { data } = await supabase.from("garuda_submissions").select("question_id, status").eq("user_id", userId);
        if (data) setUserSubmissions(data);
    }

    async function handleClaimInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteCode.trim()) return toast.error("Enter a valid clearance code.");
        setIsVerifying(true);
        const cleanCode = inviteCode.trim().toUpperCase();

        const { data: inviteData, error: inviteErr } = await supabase.from("garuda_invites").select("*").eq("code", cleanCode).eq("is_used", false).maybeSingle();

        if (inviteErr || !inviteData) {
            setIsVerifying(false);
            return toast.error("Invalid or expired clearance key.");
        }

        await supabase.from("garuda_invites").update({ is_used: true, used_by: profile.id }).eq("code", cleanCode);
        const { error: profErr } = await supabase.from("profiles").update({ has_nexus_access: true }).eq("id", profile.id);

        setIsVerifying(false);
        if (profErr) {
            toast.error("Failed to upgrade clearance: " + profErr.message);
        } else {
            toast.success("Clearance Granted.", { icon: "🦅" });
            setHasAccess(true);
            loadLanguages();
            loadUserSubmissions(profile.id);
        }
    }

    async function handleSelectLanguage(lang: any) {
        sessionStorage.setItem("garuda_last_lang", lang.slug); // Save position
        setSelectedLanguage(lang);
        setLoadingQuestions(true);
        setActiveTrack("All");

        const { data, error } = await supabase.from("garuda_questions").select("*").eq("language_id", lang.id).order("created_at", { ascending: true });

        if (error) toast.error("Failed to load modules: " + error.message);
        if (data) setQuestions(data);
        setLoadingQuestions(false);
    }

    const clearLanguageSelection = () => {
        sessionStorage.removeItem("garuda_last_lang"); // Clear position
        setSelectedLanguage(null);
    }

    const filteredNodes = questions.filter(q => {
        if (activeTrack === "All") return true;
        return q.difficulty === activeTrack;
    });

    const materials = filteredNodes.filter(q => q.xp_reward === 0);
    const challenges = filteredNodes.filter(q => q.xp_reward > 0);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#07090e] text-white font-sans relative overflow-x-hidden selection:bg-blue-500 selection:text-white pb-24">

                <nav className="border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-4 h-4" /> THE NEXUS
                            </Link>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2 cursor-pointer group" onClick={clearLanguageSelection}>
                                <Terminal className="w-5 h-5 text-blue-400" />
                                <span className="font-mono font-black text-lg tracking-wider group-hover:text-blue-300 transition-colors">
                                    DEV's <span className="text-blue-500 font-normal">practice and tests</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-bold font-mono shadow-sm shadow-blue-500/10">
                                <Flame className="w-3.5 h-3.5" /> {profile?.xp_score || 0} XP
                            </div>
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono font-bold">
                                <ShieldCheck className="w-3.5 h-3.5" /> SYSTEM LIVE
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">

                    {hasAccess === false && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#0e131f] border border-blue-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] text-center relative overflow-hidden">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6 text-blue-400">
                                    <KeyRound className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-black mb-2 tracking-tight">Restricted Clearance</h2>
                                <p className="text-gray-400 text-xs leading-relaxed mb-6">
                                    <span className="font-mono text-blue-400">DEV's practice and tests</span> requires a valid Nexus Pass code.
                                </p>
                                <form onSubmit={handleClaimInvite} className="space-y-4">
                                    <input type="text" placeholder="ENTER NEXUS PASS" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3.5 text-center font-mono text-sm tracking-widest uppercase focus:outline-none focus:border-blue-500 transition-colors text-white placeholder:text-gray-600" />
                                    <button type="submit" disabled={isVerifying} className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25">
                                        {isVerifying ? "Verifying Matrix..." : "Authenticate Clearance"}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {hasAccess && !selectedLanguage && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                            <div className="max-w-6xl mx-auto mb-16">
                                <Link href="/garuda/sandbox" className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900/40 to-[#0e131f] border border-blue-500/30 p-8 shadow-[0_0_40px_rgba(59,130,246,0.1)] hover:shadow-[0_0_60px_rgba(59,130,246,0.2)] transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-3 bg-blue-500/20 rounded-xl"><CodeSquare className="w-6 h-6 text-blue-400" /></div>
                                            <h2 className="text-3xl font-black">Global Sandbox Editor</h2>
                                        </div>
                                        <p className="text-gray-400 text-sm max-w-xl leading-relaxed">Need a place to test your own logic? Open the multi-language freeform editor. Write, compile, test, and save your scripts locally or directly to your profile database.</p>
                                    </div>
                                    <div className="shrink-0">
                                        <div className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors">
                                            Open Playground <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            </div>

                            <div className="text-center max-w-2xl mx-auto mb-12">
                                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold inline-flex items-center gap-1.5 mb-4">
                                    <Sparkles className="w-3.5 h-3.5" /> CURATED TRACKS
                                </span>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Select Your Weapon</h1>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                                {languages.map((lang) => (
                                    <motion.div key={lang.id} whileHover={{ y: -6 }} transition={{ duration: 0.2 }} onClick={() => handleSelectLanguage(lang)} className="group relative cursor-pointer bg-[#0e131f]/80 hover:bg-[#131a2b] border border-white/10 hover:border-blue-500/40 p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between h-64 transition-all overflow-hidden shadow-lg">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                                        <div className="flex items-center justify-between">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-3 group-hover:scale-105 transition-transform">
                                                {lang.icon_url ? <img src={lang.icon_url} alt={lang.name} className="w-full h-full object-contain" /> : <Code2 className="w-6 h-6 text-blue-400" />}
                                            </div>
                                            <span className="font-mono text-[11px] text-gray-500 group-hover:text-blue-400 transition-colors">/{lang.slug}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black mb-1 group-hover:text-blue-400 transition-colors">{lang.name}</h3>
                                            <p className="text-xs text-gray-400">Integrated modules & dynamic test cases.</p>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                                            <span>Initialize Track</span><ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {hasAccess && selectedLanguage && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
                                <div className="flex items-center gap-4">
                                    <button onClick={clearLanguageSelection} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-black flex items-center gap-3">
                                            {selectedLanguage.icon_url ? <img src={selectedLanguage.icon_url} className="w-6 h-6" /> : <Code2 className="w-6 h-6 text-blue-500" />}
                                            {selectedLanguage.name} Tests
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl self-start sm:self-auto overflow-x-auto max-w-full">
                                    {(["All", "Fundamentals", "DSA & Logic", "Advanced & System"] as TrackLevel[]).map((track) => (
                                        <button key={track} onClick={() => setActiveTrack(track)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTrack === track ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                            {track}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loadingQuestions ? (
                                <div className="py-20 text-center text-gray-500 font-mono text-sm animate-pulse">Syncing nodes from mainframes...</div>
                            ) : filteredNodes.length === 0 ? (
                                <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl max-w-2xl mx-auto p-8">
                                    <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold mb-1">Sector Empty</h3>
                                    <p className="text-gray-400 text-xs max-w-sm mx-auto mb-6">No nodes found in the <span className="text-blue-400">{activeTrack}</span> track for this language.</p>
                                </div>
                            ) : (
                                <div className="space-y-12 max-w-5xl mx-auto">

                                    {materials.length > 0 && (
                                        <section>
                                            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-gray-300">
                                                <BookOpen className="w-5 h-5 text-purple-400" /> Reference Vault
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {materials.map((m) => {
                                                    const link = m.learning_materials?.[0]?.url || "#";
                                                    return (
                                                        <a key={m.id} href={link} target="_blank" rel="noopener noreferrer" className="bg-[#0e131f] hover:bg-[#151d2f] border border-white/10 hover:border-purple-500/30 p-4 rounded-2xl flex items-start gap-4 transition-all group">
                                                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0"><FileText className="w-5 h-5" /></div>
                                                            <div>
                                                                <h4 className="font-bold text-sm text-gray-200 group-hover:text-purple-400 transition-colors mb-1 line-clamp-1">{m.title}</h4>
                                                                <p className="text-xs text-gray-500 line-clamp-2">{m.description}</p>
                                                            </div>
                                                        </a>
                                                    )
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {challenges.length > 0 && (
                                        <section>
                                            <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-gray-300">
                                                <Terminal className="w-5 h-5 text-blue-400" /> Execution Tests
                                            </h3>
                                            <div className="space-y-3">
                                                {challenges.map((q, idx) => {
                                                    const isPassed = userSubmissions.some(s => s.question_id === q.id && s.status === 'passed');

                                                    return (
                                                        <div key={q.id} className={`bg-[#0e131f] border p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group ${isPassed ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-blue-500/30'}`}>
                                                            <div className="flex items-start sm:items-center gap-4">
                                                                <span className="font-mono text-xs font-bold text-gray-600 w-6 shrink-0 mt-1 sm:mt-0">#{String(idx + 1).padStart(2, '0')}</span>
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <h4 className="font-bold text-base text-gray-200 group-hover:text-blue-400 transition-colors">{q.title}</h4>
                                                                        {isPassed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${q.difficulty === 'Fundamentals' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                                            q.difficulty === 'DSA & Logic' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                                                'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                            }`}>
                                                                            {q.difficulty}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 line-clamp-1">{q.description}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                                                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 shrink-0">
                                                                    +{q.xp_reward} XP
                                                                </span>
                                                                <Link href={`/garuda/${selectedLanguage.slug}/${q.id}`} className={`px-5 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${isPassed ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-white text-black hover:bg-blue-500 hover:text-white'}`}>
                                                                    {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                                                    {isPassed ? "Review" : "Execute"}
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </main>
            </div>
        </ProtectedRoute>
    );
}