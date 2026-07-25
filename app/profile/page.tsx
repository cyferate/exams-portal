"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Mail, Award, BookOpen, Clock, ShieldCheck, Edit2, Save, X, Trophy, Sun, Moon } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import CinematicCanvas from "@/app/components/CinematicCanvas";
import ShimmerText from "@/app/components/ShimmerText";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [xpScore, setXpScore] = useState<number>(0); // FIXED: Added dedicated state for dynamically calculated XP

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ semester: "", branch: "" });

  useEffect(() => {
    setMounted(true);
    fetchUserData();
  }, []);

  async function fetchUserData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 1. Fetch Profile
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profileData) {
      setProfile(profileData);
      setEditData({ semester: profileData.semester || "", branch: profileData.branch || "" });
    }

    // 2. Fetch Leaderboard Rank & XP
    const { data: leaderboardData } = await supabase.rpc('get_leaderboard');
    if (leaderboardData) {
      const userRank = leaderboardData.find((u: any) => u.user_id === session.user.id);
      if (userRank) {
        setRank(userRank.rank);
        setXpScore(userRank.xp_score || 0); // FIXED: Extracting dynamic XP from the leaderboard function
      }
    }

    // 3. Fetch User's Contributions
    const { data: myContributions } = await supabase
      .from("resources")
      .select("*")
      .eq("submitted_by", session.user.id)
      .order("created_at", { ascending: false });

    if (myContributions) setContributions(myContributions);
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Updating profile...");

    const { error } = await supabase
      .from('profiles')
      .update({ semester: editData.semester, branch: editData.branch })
      .eq('id', profile.id);

    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success("Profile updated successfully.", { id: loadingToast });
      setIsEditing(false);
      fetchUserData();
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white selection:bg-blue-500/20 dark:selection:bg-white/20 font-sans relative transition-colors duration-300">

        {/* Cinematic Background */}
        <div className="hidden dark:block">
          <CinematicCanvas />
          <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        </div>

        {/* Sync'd Navbar */}
        <nav className="relative z-50 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-lg sticky top-0 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold tracking-widest uppercase hidden sm:block">Back to Vault</span>
            </Link>

            <div className="text-xl font-bold tracking-tighter flex items-center">
              <ShimmerText className="text-black dark:text-white">EXAMS</ShimmerText><span className="text-blue-500 dark:text-gray-500">.</span>
            </div>

            <div className="flex items-center space-x-4">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* LEFT COLUMN: IDENTIFICATION CARD */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative rounded-[2rem] p-[1.5px] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 opacity-0 dark:opacity-50 dark:group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative bg-white dark:bg-[#121212]/90 backdrop-blur-xl rounded-[calc(2rem-1.5px)] p-8 shadow-xl dark:shadow-2xl flex flex-col items-center text-center border border-gray-200 dark:border-white/5 transition-colors duration-300">

                {/* Avatar Placeholder */}
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gradient-to-br dark:from-gray-800 dark:to-black border border-gray-200 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner relative overflow-hidden transition-colors duration-300">
                  <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-1">{profile?.full_name}</h1>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> {profile?.email}
                </p>

                {/* Gamification Stats */}
                <div className="w-full grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center transition-colors duration-300">
                    <Award className="w-6 h-6 text-yellow-500 mb-2" />
                    {/* FIXED: Rendering dynamic xpScore here */}
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{xpScore}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total XP</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center transition-colors duration-300">
                    <Trophy className="w-6 h-6 text-blue-500 dark:text-blue-400 mb-2" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{rank ? `#${rank}` : "-"}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">Global Rank</span>
                  </div>
                </div>

                {/* Academic Details & Edit Mode */}
                <div className="w-full bg-gray-50 dark:bg-black/50 rounded-2xl p-6 border border-gray-200 dark:border-white/5 text-left relative transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Academic Profile</h3>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Roll Number</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile?.roll_no}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Branch</p>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile?.branch}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Semester</p>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Sem {profile?.semester}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase mb-1 block">Semester</label>
                        <select value={editData.semester} onChange={(e) => setEditData({ ...editData, semester: e.target.value })} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white transition-colors">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num} className="bg-white dark:bg-black text-gray-900 dark:text-white">Sem {num}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase mb-1 block">Branch</label>
                        <input type="text" value={editData.branch} onChange={(e) => setEditData({ ...editData, branch: e.target.value })} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white transition-colors" />
                      </div>
                      <button type="submit" className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm">
                        <Save className="w-4 h-4" /> Save Changes
                      </button>
                    </form>
                  )}
                </div>

              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: CONTRIBUTION LEDGER */}
          <div className="lg:col-span-7">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Contribution Ledger</h2>
                  <p className="text-sm text-gray-500">Track the status of materials you've submitted to the Vault.</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-white/5 px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{contributions.length} Submissions</span>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {contributions.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/10 border-dashed transition-colors duration-300">
                      <p className="text-gray-500 dark:text-gray-400">You haven't submitted any materials yet.</p>
                      <Link href="/dashboard" className="inline-block mt-4 text-sm font-bold text-black dark:text-white bg-gray-100 dark:bg-white/10 px-6 py-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">Go Contribute</Link>
                    </motion.div>
                  ) : (
                    contributions.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-[#121212]/80 backdrop-blur-md border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500 dark:hover:border-white/20 transition-colors group shadow-sm dark:shadow-none"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-500 dark:text-gray-500 uppercase tracking-wider">{item.subject_code}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.resource_type}</span>
                          </div>
                          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{item.title}</h4>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto">
                          {item.is_approved ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold uppercase tracking-widest">Live</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-600 dark:text-yellow-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold uppercase tracking-widest">Pending</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  );
}