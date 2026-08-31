"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Ghost, Clock, Flame, ShieldAlert, ArrowLeft, CheckCircle2, Camera, X, Loader2, Trash2, Sun, Moon, Key, Lock } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { uploadToCloud } from "@/app/actions/upload"; // <-- Secure Server Action

const MOODS = {
    cyan: { color: "bg-cyan-400", glow: "shadow-[0_0_30px_rgba(34,211,238,0.15)]", border: "border-cyan-500/30", gradient: "from-cyan-500" },
    violet: { color: "bg-violet-500", glow: "shadow-[0_0_30px_rgba(139,92,246,0.15)]", border: "border-violet-500/30", gradient: "from-violet-500" },
    crimson: { color: "bg-rose-500", glow: "shadow-[0_0_30px_rgba(244,63,94,0.15)]", border: "border-rose-500/30", gradient: "from-rose-500" }
};

const REACTION_EMOJIS = ['🔥', '💡', '💀', '💯', '😂'];

export default function ChhodoJaaneDo() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [profile, setProfile] = useState<any>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    // Key Gate States
    const [keyInput, setKeyInput] = useState("");
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Feed States
    const [posts, setPosts] = useState<any[]>([]);
    const [content, setContent] = useState("");
    const [isGhost, setIsGhost] = useState(false);
    const [ttlHours, setTtlHours] = useState(24);
    const [activeMood, setActiveMood] = useState<"cyan" | "violet" | "crimson">("cyan");

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [justSubmitted, setJustSubmitted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    async function fetchData() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(prof);

        if (prof) {
            if (prof.is_admin || prof.has_nexus_access) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
        }
        setIsCheckingAccess(false);

        // Fetch feed
        const { data: feed } = await supabase
            .from("cjd_posts")
            .select("*, profiles(full_name, branch, semester)")
            .eq("is_approved", true)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false });

        if (feed) setPosts(feed);
    }

    // --- ACCESS GATE VALIDATION ---
    const handleUnlockAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyInput.trim()) return;
        setIsUnlocking(true);
        const toastId = toast.loading("Verifying Nexus Pass...");

        const cleanKey = keyInput.trim().toUpperCase();

        const { data: invite, error: inviteError } = await supabase
            .from("garuda_invites")
            .select("*")
            .eq("code", cleanKey)
            .eq("is_used", false)
            .maybeSingle();

        if (inviteError || !invite) {
            toast.error("Invalid or claimed Nexus Pass key.", { id: toastId });
            setIsUnlocking(false);
            return;
        }

        // Mark key used & activate access
        await supabase.from("garuda_invites").update({ is_used: true, used_by: profile.id }).eq("code", cleanKey);
        const { error: profError } = await supabase.from("profiles").update({ has_nexus_access: true }).eq("id", profile.id);

        if (profError) {
            toast.error("Failed to grant access: " + profError.message, { id: toastId });
        } else {
            toast.success("Access Granted. Welcome to the Void.", { id: toastId, icon: "🔐" });
            setHasAccess(true);
            setProfile((prev: any) => ({ ...prev, has_nexus_access: true }));
        }
        setIsUnlocking(false);
    };

    // --- HIGH-FIDELITY WEBP COMPRESSION (CLIENT SIDE) ---
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const MAX_WIDTH = 1920;
                let scaleSize = 1;

                if (img.width > MAX_WIDTH) {
                    scaleSize = MAX_WIDTH / img.width;
                }

                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                const compressedDataUrl = canvas.toDataURL("image/webp", 0.95);
                setImagePreview(compressedDataUrl);
            };
        };
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!content.trim() && !imagePreview) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Processing transmission...");

        let uploadedUrl = null;
        if (imagePreview) {
            // SECURE SERVER ACTION CALL
            uploadedUrl = await uploadToCloud(imagePreview);
            if (!uploadedUrl) {
                toast.error("Failed to process image.", { id: toastId });
                setIsSubmitting(false);
                return;
            }
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + ttlHours);

        const { error } = await supabase.from("cjd_posts").insert([{
            content,
            author_id: profile.id,
            is_ghost: isGhost,
            ttl_hours: ttlHours,
            expires_at: expiresAt.toISOString(),
            mood: activeMood,
            image_url: uploadedUrl
        }]);

        if (error) {
            toast.error("Transmission failed.", { id: toastId });
            setIsSubmitting(false);
        } else {
            setJustSubmitted(true);
            setContent("");
            setImagePreview(null);
            toast.success("Released to the void. Awaiting Admin verification.", { id: toastId, icon: '🌌' });

            setTimeout(() => {
                setJustSubmitted(false);
                setIsSubmitting(false);
            }, 1500);
        }
    }

    async function handleDeleteOwnPost(postId: string) {
        if (!confirm("Scrub this transmission from the network?")) return;

        setPosts(posts.filter(p => p.id !== postId));

        const { error } = await supabase.from("cjd_posts").delete().eq("id", postId).eq("author_id", profile.id);
        if (error) toast.error("Failed to scrub post.");
        else toast.success("Transmission scrubbed.");
    }

    async function handleResonance(postId: string, newValue: number) {
        if (!profile) return;
        const post = posts.find(p => p.id === postId);

        const userVotes = post.user_votes || {};
        const previousValue = userVotes[profile.id];
        const hasVoted = previousValue !== undefined;

        let newSum = post.resonance_sum;
        let newCount = post.resonance_count;

        if (hasVoted) {
            newSum = newSum - previousValue + newValue;
        } else {
            newSum += newValue;
            newCount += 1;
        }

        const newUserVotes = { ...userVotes, [profile.id]: newValue };

        setPosts(posts.map(p => p.id === postId ? {
            ...p,
            resonance_sum: newSum,
            resonance_count: newCount,
            user_votes: newUserVotes
        } : p));

        await supabase.from("cjd_posts").update({
            resonance_sum: newSum,
            resonance_count: newCount,
            user_votes: newUserVotes
        }).eq("id", postId);
    }

    async function toggleReaction(postId: string, emoji: string) {
        if (!profile) return;
        const post = posts.find(p => p.id === postId);

        const reactions = post.reactions || {};
        const usersWhoReacted = reactions[emoji] || [];

        let newUsersList;
        if (usersWhoReacted.includes(profile.id)) {
            newUsersList = usersWhoReacted.filter((id: string) => id !== profile.id);
        } else {
            newUsersList = [...usersWhoReacted, profile.id];
        }

        const newReactions = { ...reactions, [emoji]: newUsersList };

        setPosts(posts.map(p => p.id === postId ? { ...p, reactions: newReactions } : p));
        await supabase.from("cjd_posts").update({ reactions: newReactions }).eq("id", postId);
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#030303] text-gray-900 dark:text-white font-sans selection:bg-blue-500/20 pb-24 relative overflow-hidden transition-colors duration-300">

                <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

                <nav className="border-b border-black/5 dark:border-white/5 bg-[#FAFAFA]/80 dark:bg-[#030303]/80 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300">
                    <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" /> THE NEXUS
                        </Link>

                        <div className="flex items-center gap-4">
                            <div className="font-black tracking-widest text-sm text-gray-800 dark:text-gray-300">
                                CHHODO JAANE DO <span className="text-blue-500">;)</span>
                            </div>

                            {mounted && (
                                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400">
                                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    </div>
                </nav>

                {/* --- SECURITY ACCESS GATE (NON-ADMINS WITHOUT ACCESS) --- */}
                <AnimatePresence>
                    {!isCheckingAccess && !hasAccess && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center mb-6 mx-auto">
                                    <Lock className="w-7 h-7 text-blue-500" />
                                </div>

                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                        Restricted Network
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        CHHODO JAANE DO ;) is gated. Enter your single-use Nexus Pass code to initialize access.
                                    </p>
                                </div>

                                <form onSubmit={handleUnlockAccess} className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. GU-DEV-ACCESS"
                                            value={keyInput}
                                            onChange={(e) => setKeyInput(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                                            className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-center font-mono font-bold text-gray-900 dark:text-white text-base focus:border-blue-500 focus:outline-none uppercase tracking-widest placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isUnlocking || !keyInput.trim()}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        {isUnlocking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                                        Redeem Nexus Pass
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <Link href="/dashboard" className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                        Return to Nexus Dashboard
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* --- FEED VIEW --- */}
                {hasAccess && (
                    <main className="max-w-2xl mx-auto px-4 pt-12 relative z-10">

                        {/* --- THE SUBMISSION MATRIX --- */}
                        <div className="mb-20 relative">
                            <AnimatePresence>
                                {justSubmitted && (
                                    <motion.div
                                        initial={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                                        animate={{ opacity: 0, filter: "blur(20px)", scale: 1.1, y: -50 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        className="absolute inset-0 z-20 flex items-center justify-center bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-white/5"
                                    >
                                        <p className="text-gray-500 font-mono text-sm uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" /> Disintegrating...
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className={`bg-white dark:bg-[#0a0a0a] border ${MOODS[activeMood].border} p-6 rounded-3xl shadow-xl transition-all duration-500 ${theme === 'dark' ? MOODS[activeMood].glow : 'shadow-sm'}`}>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => setActiveMood("cyan")} className={`w-3 h-3 rounded-full transition-all ${activeMood === "cyan" ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee] scale-125" : "bg-gray-300 dark:bg-gray-800 hover:bg-cyan-500 dark:hover:bg-cyan-900"}`} />
                                        <button onClick={() => setActiveMood("violet")} className={`w-3 h-3 rounded-full transition-all ${activeMood === "violet" ? "bg-violet-500 shadow-[0_0_10px_#8b5cf6] scale-125" : "bg-gray-300 dark:bg-gray-800 hover:bg-violet-500 dark:hover:bg-violet-900"}`} />
                                        <button onClick={() => setActiveMood("crimson")} className={`w-3 h-3 rounded-full transition-all ${activeMood === "crimson" ? "bg-rose-500 shadow-[0_0_10px_#f43f5e] scale-125" : "bg-gray-300 dark:bg-gray-800 hover:bg-rose-500 dark:hover:bg-rose-900"}`} />
                                    </div>
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500">Mood Ring</span>
                                </div>

                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="What's on your mind? Snap a pic, drop a thought, and let it go..."
                                    className="w-full bg-transparent text-lg md:text-xl text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-700 resize-none focus:outline-none min-h-[100px] mb-4"
                                />

                                <AnimatePresence>
                                    {imagePreview && (
                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative mb-6 inline-block">
                                            <div className="p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl inline-block shadow-md">
                                                <img src={imagePreview} alt="Snap" className="max-h-[200px] rounded-lg object-cover" />
                                            </div>
                                            <button onClick={() => setImagePreview(null)} className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-white/5 pt-4">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                            <Camera className="w-4 h-4" />
                                        </button>

                                        <button onClick={() => setIsGhost(!isGhost)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isGhost ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                            <Ghost className="w-4 h-4" /> {isGhost ? 'Ghost Mode' : 'Verified'}
                                        </button>

                                        <select value={ttlHours} onChange={(e) => setTtlHours(Number(e.target.value))} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-xs font-bold px-3 py-1.5 rounded-xl border-none outline-none appearance-none cursor-pointer">
                                            <option value={12}>12 Hours</option>
                                            <option value={24}>24 Hours</option>
                                            <option value={168}>1 Week</option>
                                        </select>
                                    </div>

                                    <button onClick={handleSubmit} disabled={isSubmitting || (!content.trim() && !imagePreview)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-black transition-all">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Release
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- THE LIVE FEED --- */}
                        <div className="space-y-12">
                            {posts.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <Flame className="w-8 h-8 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                                    <p className="font-mono text-xs uppercase tracking-widest text-gray-500">The void is empty.</p>
                                </div>
                            ) : (
                                posts.map((post) => {
                                    const created = new Date(post.created_at).getTime();
                                    const expires = new Date(post.expires_at).getTime();
                                    const now = new Date().getTime();
                                    const totalLifespan = expires - created;
                                    const timeRemaining = expires - now;
                                    const percentageRemaining = Math.max(0, Math.min(100, (timeRemaining / totalLifespan) * 100));

                                    const avgResonance = post.resonance_count === 0 ? 0 : Math.round(post.resonance_sum / post.resonance_count);
                                    const userVote = post.user_votes?.[profile?.id];
                                    const hasVoted = userVote !== undefined;

                                    const postMood = MOODS[(post.mood as keyof typeof MOODS)] || MOODS.cyan;
                                    const decayOpacity = timeRemaining < (1000 * 60 * 60) ? 0.7 : 1;

                                    const isAuthor = post.author_id === profile?.id;

                                    return (
                                        <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: decayOpacity, y: 0 }} className={`relative bg-gray-50 dark:bg-[#080808] rounded-3xl p-1 shadow-lg dark:shadow-xl transition-all duration-1000 group ${theme === 'dark' ? postMood.glow : ''}`}>

                                            <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 dark:via-white to-transparent rounded-t-3xl transition-all duration-1000 z-20" style={{ width: `${percentageRemaining}%` }} />

                                            <div className="bg-white dark:bg-[#0a0a0a] rounded-[1.4rem] p-6 h-full relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-2">
                                                        {post.is_ghost ? (
                                                            <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                                                                <Ghost className="w-3.5 h-3.5" /> [GHOST_{post.id.substring(0, 4)}]
                                                                <span className="opacity-50">•</span> Sem {post.profiles?.semester || "1"}
                                                                {isAuthor && <span className="text-blue-500/80 ml-1">(You)</span>}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-md flex items-center gap-2">
                                                                {isAuthor ? <span className="text-blue-500 font-black">You</span> : post.profiles?.full_name?.split(" ")[0]}
                                                                <span className="text-gray-400 dark:text-gray-600 opacity-50">•</span>
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono">Sem {post.profiles?.semester || "1"}</span>
                                                                <span className="text-gray-400 dark:text-gray-600 opacity-50">•</span>
                                                                <span className="text-gray-500 dark:text-gray-500 font-mono">{post.profiles?.branch}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.ceil(timeRemaining / (1000 * 60 * 60))}h left</span>
                                                        {isAuthor && (
                                                            <button onClick={() => handleDeleteOwnPost(post.id)} className="text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-500 transition-colors bg-gray-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/10 p-1.5 rounded-lg">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {post.image_url && (
                                                    <div className="mb-6 p-2 pb-6 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl rotate-[-1deg] shadow-md dark:shadow-lg">
                                                        <img src={post.image_url} alt="Snap" className="w-full max-h-[400px] object-cover rounded-lg mix-blend-normal dark:mix-blend-luminosity grayscale-0 dark:grayscale-[30%] dark:hover:grayscale-0 transition-all duration-700" />
                                                    </div>
                                                )}

                                                <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed mb-8 whitespace-pre-wrap">{post.content}</p>

                                                {post.admin_reply && (
                                                    <div className={`mb-6 bg-gradient-to-r ${postMood.gradient}/10 to-transparent border border-${postMood.color.split('-')[1]}-500/20 rounded-xl p-4 flex items-start gap-3`}>
                                                        <ShieldAlert className={`w-4 h-4 ${postMood.color.replace('bg-', 'text-')} shrink-0 mt-0.5`} />
                                                        <div>
                                                            <p className={`text-[10px] font-bold ${postMood.color.replace('bg-', 'text-')} uppercase tracking-widest mb-1`}>Admin Verified Context</p>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300">{post.admin_reply}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Kinetic Resonance & Revote Slider */}
                                                <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Community Resonance</span>
                                                        <span className={`text-xs font-mono font-bold ${postMood.color.replace('bg-', 'text-')}`}>{avgResonance}%</span>
                                                    </div>
                                                    <div className="relative w-full h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                                                        <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${postMood.gradient} transition-all duration-700 ease-out`} style={{ width: `${avgResonance}%` }} />
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <input
                                                            type="range" min="0" max="100" defaultValue={hasVoted ? userVote : 50}
                                                            className="w-full h-1 bg-gray-300 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                            onChange={(e) => {
                                                                const el = e.target as HTMLInputElement;
                                                                el.onmouseup = () => handleResonance(post.id, Number(el.value));
                                                                el.ontouchend = () => handleResonance(post.id, Number(el.value));
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap min-w-[75px] text-right">
                                                            {hasVoted ? `Voted: ${userVote}%` : "Drag to Vibe"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Holographic Quick Reactions */}
                                                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-white/5 overflow-x-auto custom-scrollbar pb-1">
                                                    {REACTION_EMOJIS.map(emoji => {
                                                        const reacts = post.reactions?.[emoji] || [];
                                                        const count = reacts.length;
                                                        const hasReacted = reacts.includes(profile?.id);

                                                        return (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => toggleReaction(post.id, emoji)}
                                                                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all duration-300 ${hasReacted
                                                                    ? 'bg-blue-50 dark:bg-white/10 scale-105 border border-blue-200 dark:border-white/10'
                                                                    : 'bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 grayscale opacity-60 dark:opacity-40 hover:grayscale-0 hover:opacity-100 border border-transparent'
                                                                    }`}
                                                            >
                                                                <span>{emoji}</span>
                                                                {count > 0 && <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300">{count}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </main>
                )}
            </div>
        </ProtectedRoute>
    );
}