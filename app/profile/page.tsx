"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit2, X, Check, Medal, Trophy, Mail, User, ShieldCheck, Clock, BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ShimmerText from "@/app/components/ShimmerText";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ xp: 0, rank: "-" });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ semester: "1", branch: "CSE-AI", customBranch: "" });

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch Profile
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileData);

    if (profileData) {
      const currentBranch = profileData.branch || "CSE-AI";
      const isStandardBranch = ["CSE-AI", "CSE CORE", "CSE CORE-A", "CSE CORE-B", "CSE-CS", "CSE-IoT"].includes(currentBranch);

      setEditData({
        semester: profileData.semester?.toString() || "1",
        branch: isStandardBranch ? currentBranch : "Other",
        customBranch: isStandardBranch ? "" : currentBranch
      });
    }

    // Fetch Submissions
    const { data: mySubmissions } = await supabase
      .from("resources")
      .select("*")
      .eq("submitted_by", session.user.id)
      .order("created_at", { ascending: false });

    if (mySubmissions) setSubmissions(mySubmissions);

    // Fetch Leaderboard for XP and Global Rank
    const { data: leaderboardData } = await supabase.rpc('get_leaderboard');
    if (leaderboardData) {
      const myRank = leaderboardData.find((u: any) => u.user_id === session.user.id);
      if (myRank) setUserStats({ xp: myRank.xp_score, rank: `#${myRank.rank}` });
      else setUserStats({ xp: 0, rank: "-" });
    }
  }

  const handleSaveProfile = async () => {
    const finalBranch = editData.branch === "Other" ? editData.customBranch : editData.branch;
    if (editData.branch === "Other" && !editData.customBranch) {
      toast.error("Please specify your custom branch.");
      return;
    }

    const loadingToast = toast.loading("Saving profile...");
    const { error } = await supabase
      .from("profiles")
      .update({ semester: editData.semester, branch: finalBranch })
      .eq("id", profile?.id);

    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success("Profile updated successfully!", { id: loadingToast });
      setIsEditing(false);
      fetchData(); // Silently refresh the data to lock it in
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300 pb-20">

        {/* Navbar */}
        <nav className="border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> BACK TO VAULT
            </Link>
            <div className="text-xl font-bold tracking-tighter flex items-center absolute left-1/2 -translate-x-1/2">
              <ShimmerText className="text-black dark:text-white">EXAMS</ShimmerText><span className="text-blue-500">.</span>
            </div>
            <div>
              {mounted && <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>}
            </div>
          </div>
        </nav>

        {/* Main Content Layout */}
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Profile Info */}
          <div className="md:col-span-4 flex flex-col gap-6">

            {/* Identity Card */}
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative">
              <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tight">{profile?.full_name?.split(" ")[0]}</h2>
              <div className="flex items-center gap-2 text-gray-400 mb-6">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-xs">{profile?.email || "Student"}</span>
              </div>

              {/* Gamification Stats */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <Medal className="w-6 h-6 text-yellow-500 mb-2" />
                  <span className="text-xl font-black text-gray-900 dark:text-white">{userStats.xp}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total XP</span>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-500 mb-2" />
                  <span className="text-xl font-black text-gray-900 dark:text-white">{userStats.rank}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Global Rank</span>
                </div>
              </div>
            </div>

            {/* Academic Profile Card */}
            <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm relative transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Academic Profile</h3>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!isEditing ? (
                  <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* RESTORED: Immutable Roll Number */}
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Roll Number</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono tracking-wider">{profile?.roll_no || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Semester</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Sem {profile?.semester || "-"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Branch</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.branch || "Not set"}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                    {/* Locked Roll Number Input */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Roll Number</span>
                      <input
                        type="text"
                        value={profile?.roll_no || ""}
                        disabled
                        className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-gray-400 dark:text-gray-600 text-sm font-mono tracking-wider cursor-not-allowed"
                      />
                      <p className="text-[9px] text-gray-400 mt-1.5 ml-1">Contact an Admin to modify your University Roll Number.</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Semester</span>
                      <select
                        value={editData.semester}
                        onChange={e => setEditData({ ...editData, semester: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white text-sm font-medium"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={`edit-sem-${n}`} value={n.toString()}>Sem {n}</option>)}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Branch</span>
                      <select
                        value={editData.branch}
                        onChange={e => setEditData({ ...editData, branch: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white text-sm font-medium"
                      >
                        <option value="CSE-AI">CSE-AI</option>
                        <option value="CSE CORE">CSE CORE</option>
                        <option value="CSE-CS">CSE-CS</option>
                        <option value="CSE-IoT">CSE-IoT</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {editData.branch === "Other" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 mt-2">Custom Branch</span>
                        <input
                          type="text"
                          placeholder="Enter your branch"
                          value={editData.customBranch}
                          onChange={e => setEditData({ ...editData, customBranch: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white text-sm font-medium"
                        />
                      </motion.div>
                    )}

                    <button onClick={handleSaveProfile} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-4 shadow-md">
                      <Check className="w-4 h-4" /> Save Changes
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT COLUMN: Contribution Ledger */}
          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Contribution Ledger</h2>
                <p className="text-sm text-gray-500">Track the status of materials you've submitted to the Vault.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full shadow-sm">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{submissions.length} Submissions</span>
              </div>
            </div>

            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="w-full bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">No contributions yet</h3>
                  <p className="text-sm text-gray-500 max-w-sm">When you upload materials to the Vault, their approval status will appear here.</p>
                </div>
              ) : (
                submissions.map((sub) => (
                  <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-white dark:bg-[#121212] border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${sub.is_approved ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'border-gray-200 dark:border-white/10 shadow-sm'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-blue-500 dark:text-blue-400">{sub.subject_code}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">{sub.resource_type}</span>
                      </div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">{sub.title}</h4>
                    </div>
                    <div className="flex-shrink-0">
                      {sub.is_approved ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wide">
                          <ShieldCheck className="w-4 h-4" /> LIVE
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-full text-xs font-bold uppercase tracking-wide">
                          <Clock className="w-4 h-4" /> PENDING
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  );
}