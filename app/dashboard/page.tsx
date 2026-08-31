"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, LogOut, Download, ExternalLink, Star, Heart, UploadCloud, Plus, X, Sun, Moon, Trophy, ArrowUp, ArrowDown, Search, Filter, Flag, Terminal, MessageSquareDashed, ShieldAlert, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import VaporText from "@/app/components/VaporText";
import Logo from "@/app/components/Logo";

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const [profile, setProfile] = useState<any>(null);
  const [groupedResources, setGroupedResources] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [rawResources, setRawResources] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSemester, setFilterSemester] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"existing" | "new">("existing");
  const [uniqueSubjects, setUniqueSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadData, setUploadData] = useState({ name: "", code: "", type: "Notes", title: "", link: "", target_semester: "1", target_branch: "Common First Year" });

  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [step2Data, setStep2Data] = useState({ rollNo: "", semester: "1", branch: "Common First Year", customBranch: "" });

  useEffect(() => {
    setMounted(true);
    fetchData();
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isUploadModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isUploadModalOpen]);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileData);

    if (profileData) {
      const userSem = profileData.semester?.toString() || "1";
      const isFirstYear = userSem === "1" || userSem === "2";
      const userBranch = isFirstYear ? "Common First Year" : (profileData.branch || "CSE-AI");

      setUploadData(prev => ({ ...prev, target_semester: userSem, target_branch: userBranch }));
      setFilterSemester(isFirstYear ? "1-2" : userSem);
      setFilterBranch(userBranch);
    }

    if (!profileData?.roll_no || !profileData?.branch) setIsProfileIncomplete(true);

    // Fetch Vault Resources
    const { data: resourceData } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (resourceData) {
      setRawResources(resourceData);
      const approvedAndMine = resourceData.filter(r => (r.is_approved || r.submitted_by === session.user.id) && (r.flags_count || 0) < 3);

      const subjectsMap = new Map();
      resourceData.filter(r => r.is_approved && (r.flags_count || 0) < 3).forEach(r => {
        if (!subjectsMap.has(r.subject_code)) subjectsMap.set(r.subject_code, { code: r.subject_code, name: r.subject_name });
      });
      const subjectsArray = Array.from(subjectsMap.values());
      setUniqueSubjects(subjectsArray);
      if (subjectsArray.length > 0 && !selectedSubject) setSelectedSubject(JSON.stringify(subjectsArray[0]));

      const grouped = approvedAndMine.reduce((acc: any, curr: any) => {
        const code = curr.subject_code;
        if (!acc[code]) acc[code] = { subject_name: curr.subject_name, subject_code: curr.subject_code, target_semester: curr.target_semester || "1", target_branch: curr.target_branch || "CSE-AI", Notes: [], PYQs: [], Assignments: [] };
        if (acc[code][curr.resource_type]) acc[code][curr.resource_type].push(curr);
        return acc;
      }, {});
      setGroupedResources(Object.values(grouped));
    }

    const { data: bookmarkData } = await supabase.from("bookmarks").select("resource_id").eq("user_id", session.user.id);
    if (bookmarkData) setBookmarks(bookmarkData.map(b => b.resource_id));

    const { data: likesData } = await supabase.from("likes").select("resource_id").eq("user_id", session.user.id);
    if (likesData) setUserLikes(likesData.map(l => l.resource_id));

    // --- ALGORITHM FUSION: MERGE GARUDA XP + VAULT XP ---
    const { data: leaderboardData } = await supabase.rpc('get_leaderboard');
    const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, branch, xp_score');

    if (allProfiles) {
      let unifiedLeaderboard = allProfiles.map(prof => {
        // Find Vault XP from the RPC
        const vaultEntry = (leaderboardData || []).find((u: any) => u.id === prof.id || u.user_id === prof.id || u.full_name === prof.full_name);
        const vaultXp = vaultEntry ? Number(vaultEntry.xp_score || 0) : 0;

        // Find Garuda XP from Profile
        const garudaXp = Number(prof.xp_score || 0);

        // Mathematically Combine Both
        const totalXp = vaultXp + garudaXp;

        return {
          id: prof.id,
          user_id: prof.id,
          full_name: prof.full_name || vaultEntry?.full_name || "Unknown Hacker",
          branch: prof.branch || vaultEntry?.branch || "Student",
          xp_score: totalXp
        };
      });

      // Filter out 0 XP ghosts and re-rank everyone correctly
      unifiedLeaderboard = unifiedLeaderboard.filter(u => u.xp_score > 0);
      unifiedLeaderboard.sort((a, b) => b.xp_score - a.xp_score);
      unifiedLeaderboard = unifiedLeaderboard.map((u, index) => ({
        ...u,
        rank: index + 1
      }));

      setLeaderboard(unifiedLeaderboard);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const toggleBookmark = async (resourceId: string) => {
    const isBookmarked = bookmarks.includes(resourceId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (isBookmarked) {
      setBookmarks(bookmarks.filter(id => id !== resourceId));
      await supabase.from("bookmarks").delete().eq("resource_id", resourceId).eq("user_id", session.user.id);
      toast.success("Removed from Saved Items", { icon: '🗑️' });
    } else {
      setBookmarks([...bookmarks, resourceId]);
      await supabase.from("bookmarks").insert([{ user_id: session.user.id, resource_id: resourceId }]);
      toast.success("Saved for Exam Week!", { icon: '⭐' });
    }
  };

  const handleLike = async (resourceId: string) => {
    const isLiked = userLikes.includes(resourceId);
    if (isLiked) {
      setUserLikes(userLikes.filter(id => id !== resourceId));
      setRawResources(rawResources.map(r => r.id === resourceId ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) - 1) } : r));
    } else {
      setUserLikes([...userLikes, resourceId]);
      setRawResources(rawResources.map(r => r.id === resourceId ? { ...r, likes_count: (r.likes_count || 0) + 1 } : r));
    }
    await supabase.rpc('toggle_like', { res_id: resourceId });
  };

  const handleFlag = async (resourceId: string) => {
    const loadingToast = toast.loading("Reporting link...");
    await supabase.rpc('increment_flag', { res_id: resourceId });
    toast.success("Flagged for Admin Review. Thanks for keeping the Vault clean!", { id: loadingToast });
    fetchData();
  };

  const trackClickAndOpen = async (resourceId: string, url: string) => {
    window.open(url, "_blank");
    await supabase.rpc('increment_view_count', { res_id: resourceId });
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Submitting to Admins...");
    const { data: { session } } = await supabase.auth.getSession();
    let finalCode = uploadData.code;
    let finalName = uploadData.name;
    if (uploadMode === "existing") {
      const parsed = JSON.parse(selectedSubject);
      finalCode = parsed.code;
      finalName = parsed.name;
    }

    const finalBranch = (uploadData.target_semester === "1" || uploadData.target_semester === "2") ? "Common First Year" : uploadData.target_branch;

    const { error } = await supabase.from("resources").insert([{
      subject_name: finalName, subject_code: finalCode, resource_type: uploadData.type, title: uploadData.title, drive_link: uploadData.link, is_approved: false, submitted_by: session?.user.id, target_semester: uploadData.target_semester, target_branch: finalBranch
    }]);

    if (error) toast.error("Submission failed: " + error.message, { id: loadingToast });
    else {
      toast.success("Submitted! Waiting for Admin approval.", { id: loadingToast, duration: 4000 });
      setIsUploadModalOpen(false);
      setUploadData({ name: "", code: "", type: "Notes", title: "", link: "", target_semester: profile?.semester?.toString() || "1", target_branch: profile?.branch || "Common First Year" });
      fetchData();
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(step2Data.rollNo)) return toast.error("Roll Number must be exactly 12 digits.");

    const isFirstYear = step2Data.semester === "1" || step2Data.semester === "2";
    const finalBranch = isFirstYear ? "Common First Year" : (step2Data.branch === "Other" ? step2Data.customBranch : step2Data.branch);

    if (!isFirstYear && step2Data.branch === "Other" && !step2Data.customBranch) return toast.error("Specify custom branch.");

    const loadingToast = toast.loading("Updating profile...");
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('profiles').update({ roll_no: step2Data.rollNo, semester: step2Data.semester, branch: finalBranch }).eq('id', session?.user.id);

    if (error) toast.error(error.message, { id: loadingToast });
    else { toast.success("Profile Complete. Welcome to the Vault.", { id: loadingToast }); setIsProfileIncomplete(false); fetchData(); }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  const scrollToVault = () => {
    const vaultSection = document.getElementById("vault-section");
    if (vaultSection) vaultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pinnedResources = rawResources.filter(res => bookmarks.includes(res.id) && (res.flags_count || 0) < 3);

  const filteredSubjects = groupedResources.filter(sub => {
    const matchesSearch = sub.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || sub.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSem = filterSemester === "All" ? true : filterSemester === "1-2" ? (sub.target_semester === "1" || sub.target_semester === "2") : sub.target_semester === filterSemester;
    const matchesBranch = filterBranch === "All" || sub.target_branch === filterBranch || sub.target_branch === "Common First Year";
    return matchesSearch && matchesSem && matchesBranch;
  });

  const rank1 = leaderboard.find(u => Number(u.rank) === 1);
  const rank2 = leaderboard.find(u => Number(u.rank) === 2);
  const rank3 = leaderboard.find(u => Number(u.rank) === 3);
  const podiumUsers = [rank1, rank2, rank3].filter(Boolean);

  // Sync the Hero XP with the combined Leaderboard XP calculation
  const currentUserLeaderboardEntry = leaderboard.find((u: any) => u.id === profile?.id || u.user_id === profile?.id || u.full_name === profile?.full_name);
  const displayXp = currentUserLeaderboardEntry?.xp_score || profile?.xp_score || 0;

  const isAtTop = scrollY < 200;
  const isAtBottom = typeof window !== 'undefined' && (window.innerHeight + scrollY >= document.body.offsetHeight - 200);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-black dark:text-white font-sans relative transition-colors duration-300 pb-20">

        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-purple-500/10 dark:bg-purple-600/5 blur-[120px] rounded-full mix-blend-screen" />
        </div>

        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <AnimatePresence>
            {!isAtTop && (
              <motion.button key="scroll-up" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} onClick={scrollToTop} className="p-3 bg-black/80 dark:bg-white/10 backdrop-blur-md text-white rounded-full shadow-lg hover:scale-110 transition-transform border border-white/10"><ArrowUp className="w-5 h-5" /></motion.button>
            )}
            {!isAtBottom && (
              <motion.button key="scroll-down" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} onClick={scrollToBottom} className="p-3 bg-black/80 dark:bg-white/10 backdrop-blur-md text-white rounded-full shadow-lg hover:scale-110 transition-transform border border-white/10"><ArrowDown className="w-5 h-5" /></motion.button>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isProfileIncomplete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white"><VaporText text="Almost there!" isVisible={isProfileIncomplete} /></h2>
                <p className="text-gray-500 mb-6 text-sm">We just need your University details to configure your Vault.</p>
                <form onSubmit={handleCompleteProfile} className="space-y-4">
                  <input type="text" placeholder="Roll Number (12 Digits)" required value={step2Data.rollNo} onChange={e => setStep2Data({ ...step2Data, rollNo: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                  <div className="grid grid-cols-2 gap-4">
                    <select value={step2Data.semester} onChange={e => {
                      const sem = e.target.value;
                      setStep2Data({
                        ...step2Data,
                        semester: sem,
                        branch: (sem === "1" || sem === "2") ? "Common First Year" : (step2Data.branch === "Common First Year" ? "CSE-AI" : step2Data.branch)
                      });
                    }} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                      <option disabled value="">Semester</option>{[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Sem {num}</option>)}
                    </select>

                    <select disabled={step2Data.semester === "1" || step2Data.semester === "2"} value={step2Data.branch} onChange={e => setStep2Data({ ...step2Data, branch: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300 disabled:opacity-50">
                      {(step2Data.semester === "1" || step2Data.semester === "2") ? (
                        <option value="Common First Year">Common 1st Year</option>
                      ) : (
                        <>
                          <option value="CSE-AI">CSE-AI</option><option value="CSE CORE-A">CSE CORE-A</option><option value="CSE CORE-B">CSE CORE-B</option><option value="CSE-CS">CSE-CS</option><option value="CSE-IoT">CSE-IoT</option><option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors mt-4">Complete Profile</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <nav className="border-b border-black/10 dark:border-white/5 bg-white/70 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300 relative">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Logo className="w-24 md:w-28 text-black dark:text-white" />
            </Link>

            <div className="flex items-center space-x-4 md:space-x-6">
              {mounted && <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>}
              <button onClick={handleLogout} className="text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">

          <div className="flex flex-col mb-12 gap-2">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0]}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{profile?.branch || "Student"}</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 font-mono text-xs font-bold shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                {displayXp} XP
              </span>
            </div>
          </div>

          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Trophy className="w-6 h-6 text-yellow-500" /> Hall of Fame</h2>
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold hidden sm:block">Top Contributors</span>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:items-end w-full max-w-4xl mx-auto">
              {leaderboard.length > 0 ? podiumUsers.map((user) => <PodiumCard key={`podium-${user.rank}`} user={user} rank={Number(user.rank)} />) : <div className="col-span-1 md:col-span-3 text-center py-10"><p className="text-gray-500">No contributions yet.</p></div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-20">

            <div onClick={scrollToVault} className="lg:col-span-2 group cursor-pointer relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-gray-50 dark:from-white/5 dark:to-white/[0.02] border border-gray-200 dark:border-white/10 p-8 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all duration-500">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out transform translate-x-4 -translate-y-4">
                <BookOpen className="w-32 h-32 text-gray-300 dark:text-white/10" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-gray-800 dark:text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">The Vault</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">Access peer-curated notes, assignments, and historical PYQs.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mt-8 group-hover:translate-x-2 transition-transform duration-300">
                  Access Matrix <ArrowDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <Link href="/garuda" className="group cursor-pointer relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#0a1128] dark:to-[#040814] border border-blue-200/50 dark:border-blue-500/20 p-8 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] transition-all duration-500">
              <div className="absolute top-0 right-0 w-full h-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10 h-full flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-4">
                    <Terminal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tighter mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">GARUDA<span className="font-normal text-blue-500">&lt;sh&gt;</span></h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">The OPPE execution arena. Compile, execute, and conquer.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-8 group-hover:translate-x-2 transition-transform duration-300">
                  Initialize Engine <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href="/cjd" className="group cursor-pointer relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#111] dark:to-[#050505] border border-gray-200 dark:border-white/10 p-8 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all duration-500">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-0 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-700 mix-blend-overlay" />
              <div className="relative z-10 h-full flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-white/10 flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-500">
                    <MessageSquareDashed className="w-6 h-6 text-gray-700 dark:text-white" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-widest mb-2">CHHODO JAANE DO <span className="text-blue-500">;</span></h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Anonymous campus intel. Release thoughts to the void.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white mt-8 group-hover:translate-x-2 transition-transform duration-300">
                  Enter Network <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href="/profile" className="group cursor-pointer relative overflow-hidden rounded-[2rem] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors duration-300">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-black/50 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Profile</h3>
                <p className="text-xs text-gray-500">Manage identity</p>
              </div>
            </Link>

            {profile?.is_admin && (
              <Link href="/admin" className="group cursor-pointer relative overflow-hidden rounded-[2rem] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-black/50 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Admin HQ</h3>
                  <p className="text-xs text-gray-500">System controls</p>
                </div>
              </Link>
            )}

            <div onClick={() => setIsUploadModalOpen(true)} className={`${profile?.is_admin ? 'md:col-span-2' : 'md:col-span-3'} lg:col-span-2 group cursor-pointer relative overflow-hidden rounded-[2rem] bg-gray-900 dark:bg-white text-white dark:text-black p-6 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300 shadow-xl`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/5 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide">Contribute Material</h3>
                  <p className="text-xs opacity-80">Upload notes, PYQs, and assignments to the Vault.</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border border-white/20 dark:border-black/20 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-black group-hover:text-black dark:group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* --- THE VAULT SECTION --- */}
          <div id="vault-section" className="pt-8 border-t border-gray-200 dark:border-white/10">
            {pinnedResources.length > 0 && (
              <div className="mb-16">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Saved for Later</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedResources.map(item => (
                    <div key={`pinned-${item.id}`} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-sm transition-colors group">
                      <div>
                        <p className="text-xs text-blue-500 dark:text-gray-500 font-bold mb-1">{item.subject_code} • {item.resource_type}</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{item.title}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => trackClickAndOpen(item.id, item.drive_link)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 transition-colors"><ExternalLink className="w-4 h-4 text-gray-600 dark:text-white" /></button>
                        <button onClick={() => toggleBookmark(item.id)} className="p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg transition-colors"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-10">
              <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-300">Vault Resources</h2>
              <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-4">

                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by subject name or code (e.g., Physics, MAT-203)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <div className="relative w-full sm:w-52 flex-shrink-0">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={filterSemester}
                      onChange={(e) => {
                        const sem = e.target.value;
                        setFilterSemester(sem);
                        if (sem === "1-2") setFilterBranch("Common First Year");
                        else if (filterBranch === "Common First Year") setFilterBranch("All");
                      }}
                      className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-3 appearance-none focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white text-sm font-medium"
                    >
                      <option value="All">All Semesters</option>
                      <option value="1-2">Sem 1 & 2 (1st Year)</option>
                      {[3, 4, 5, 6, 7, 8].map(n => <option key={`sem-filter-${n}`} value={n.toString()}>Sem {n}</option>)}
                    </select>
                  </div>

                  <div className="relative w-full sm:w-48 flex-shrink-0">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      disabled={filterSemester === "1-2"}
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-3 appearance-none focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white text-sm font-medium disabled:opacity-50"
                    >
                      {filterSemester === "1-2" ? (
                        <option value="Common First Year">Common 1st Year</option>
                      ) : (
                        <>
                          <option value="All">All Branches</option>
                          {filterSemester === "All" && <option value="Common First Year">Common 1st Year</option>}
                          <option value="CSE-AI">CSE-AI</option>
                          <option value="CSE CORE-A">CSE CORE</option>
                          <option value="CSE-CS">CSE-CS</option>
                          <option value="CSE-IoT">CSE-IoT</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

              </div>
            </div>

            <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredSubjects.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gray-400"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><path d="M8 7h8" /><path d="M8 11h8" /></svg>
                    <p className="text-gray-500 text-lg font-medium">No subjects match your filters.</p>
                  </motion.div>
                ) : (
                  filteredSubjects.map((subjectData, index) => (
                    <SubjectCard key={subjectData.subject_code} data={subjectData} index={index} bookmarks={bookmarks} toggleBookmark={toggleBookmark} trackClickAndOpen={trackClickAndOpen} userLikes={userLikes} handleLike={handleLike} handleFlag={handleFlag} rawResources={rawResources} />
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </main>

        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 overflow-hidden">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white"><VaporText text="Contribute" isVisible={isUploadModalOpen} /></h3>
                  <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors bg-gray-100 dark:bg-white/10 p-2 rounded-full"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 mb-6">
                  <button onClick={() => setUploadMode("existing")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "existing" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Existing</button>
                  <button onClick={() => setUploadMode("new")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "new" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>New Subject</button>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  {uploadMode === "existing" ? (
                    uniqueSubjects.length > 0 ? (
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                        {uniqueSubjects.map(sub => <option key={sub.code} value={JSON.stringify(sub)}>{sub.code} - {sub.name}</option>)}
                      </select>
                    ) : <p className="text-sm text-yellow-600 dark:text-yellow-500 p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">No subjects exist yet.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Name" required value={uploadData.name} onChange={e => setUploadData({ ...uploadData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                        <input type="text" placeholder="Code (MAT-203)" required value={uploadData.code} onChange={e => setUploadData({ ...uploadData, code: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <select value={uploadData.target_semester} onChange={e => {
                          const sem = e.target.value;
                          setUploadData({
                            ...uploadData,
                            target_semester: sem,
                            target_branch: (sem === "1" || sem === "2") ? "Common First Year" : (uploadData.target_branch === "Common First Year" ? "CSE-AI" : uploadData.target_branch)
                          });
                        }} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                          <option disabled value="">Semester</option>{[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Sem {num}</option>)}
                        </select>
                        <select disabled={uploadData.target_semester === "1" || uploadData.target_semester === "2"} value={uploadData.target_branch} onChange={e => setUploadData({ ...uploadData, target_branch: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300 disabled:opacity-50">
                          {(uploadData.target_semester === "1" || uploadData.target_semester === "2") ? (
                            <option value="Common First Year">Common 1st Year</option>
                          ) : (
                            <>
                              <option value="CSE-AI">CSE-AI</option><option value="CSE CORE-A">CSE CORE</option><option value="CSE-CS">CSE-CS</option><option value="CSE-IoT">CSE-IoT</option><option value="Other">Other</option>
                            </>
                          )}
                        </select>
                      </div>
                    </>
                  )}

                  <select value={uploadData.type} onChange={e => setUploadData({ ...uploadData, type: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                    <option value="Notes">Notes</option><option value="PYQs">PYQs</option><option value="Assignments">Assignments</option>
                  </select>
                  <input type="text" placeholder="Title (e.g., Unit 1 Notes)" required value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                  <input type="url" placeholder="Drive Link" required value={uploadData.link} onChange={e => setUploadData({ ...uploadData, link: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                  <button type="submit" disabled={uploadMode === 'existing' && uniqueSubjects.length === 0} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl flex justify-center gap-2 disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"><Plus className="w-5 h-5" /> Submit</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

// ---------------- PODIUM CARD COMPONENT ----------------
function PodiumCard({ user, rank }: { user: any, rank: number }) {
  if (!user) return <div className="hidden" />;

  let heightClass = "", orderClass = "";
  let gradientClass = "", glowClass = "", iconColor = "", innerGlow = "";
  const syncedSpeed = "[animation-duration:4s]";

  if (rank === 1) {
    heightClass = "h-72 md:h-80 md:scale-105 z-20 md:mx-2";
    orderClass = "order-1 md:order-2";
    gradientClass = "bg-[conic-gradient(from_0deg,transparent_70%,#F59E0B_95%,#FFFFFF_100%)]";
    glowClass = "bg-[conic-gradient(from_0deg,transparent_70%,#F59E0B_95%,#FFFFFF_100%)] blur-[12px] opacity-80";
    iconColor = "text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]";
    innerGlow = "bg-gradient-to-b from-yellow-500/10 to-transparent dark:from-yellow-900/20";
  } else if (rank === 2) {
    heightClass = "h-64 md:h-72 z-10";
    orderClass = "order-2 md:order-1";
    gradientClass = "bg-[conic-gradient(from_0deg,transparent_70%,#94A3B8_95%,#FFFFFF_100%)]";
    glowClass = "bg-[conic-gradient(from_0deg,transparent_70%,#94A3B8_95%,#FFFFFF_100%)] blur-[12px] opacity-80";
    iconColor = "text-slate-400 drop-shadow-[0_0_15px_rgba(148,163,184,0.8)]";
    innerGlow = "bg-gradient-to-b from-slate-400/10 to-transparent dark:from-slate-800/20";
  } else {
    heightClass = "h-56 md:h-64 z-10";
    orderClass = "order-3 md:order-3";
    gradientClass = "bg-[conic-gradient(from_0deg,transparent_70%,#EA580C_95%,#FFFFFF_100%)]";
    glowClass = "bg-[conic-gradient(from_0deg,transparent_70%,#EA580C_95%,#FFFFFF_100%)] blur-[12px] opacity-80";
    iconColor = "text-orange-500 drop-shadow-[0_0_15px_rgba(234,88,12,0.8)]";
    innerGlow = "bg-gradient-to-b from-orange-500/10 to-transparent dark:from-orange-900/20";
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: rank * 0.1, ease: "easeOut" }} className={`relative overflow-hidden rounded-[2rem] p-[1.5px] flex flex-col w-full shadow-xl group transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl ${heightClass} ${orderClass}`}>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-spin ${glowClass} ${syncedSpeed}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-spin ${gradientClass} ${syncedSpeed}`} />
      <div className={`absolute inset-[1.5px] bg-white dark:bg-[#0c0c0c] rounded-[calc(2rem-1.5px)] z-10 transition-colors ${innerGlow} shadow-inner flex flex-col items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-700 ease-out z-0">
          <span className="text-[12rem] md:text-[14rem] font-black leading-none text-black dark:text-white scale-95 group-hover:scale-105 transition-transform duration-700 ease-out">{rank}</span>
        </div>
        <div className="relative z-20 flex flex-col items-center justify-center h-full p-6 text-center w-full">
          <Trophy className={`w-12 h-12 md:w-16 md:h-16 mb-4 ${iconColor} transform group-hover:scale-110 transition-transform duration-500`} />
          <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white truncate w-full tracking-tight mb-1">{user.full_name?.split(" ")[0]}</h3>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-widest">{user.branch || "Student"}</p>
          <div className="mt-auto flex flex-col w-full">
            <div className="w-full px-5 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md flex items-center justify-center">
              <span className="text-lg md:text-xl font-extrabold text-gray-800 dark:text-gray-200">{user.xp_score} XP</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------- SUBJECT CARD COMPONENT ----------------
function SubjectCard({ data, bookmarks, toggleBookmark, trackClickAndOpen, userLikes, handleLike, handleFlag, rawResources }: any) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-blue-900/5 dark:shadow-none backdrop-blur-md flex flex-col h-fit transition-all duration-300 group hover:-translate-y-2 dark:hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)]">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold tracking-wider text-blue-500 dark:text-gray-500">{data.subject_code}</span>
          <span className="text-[9px] font-bold tracking-widest uppercase text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">{data.target_branch}</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">{data.subject_name}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <TabButton icon={<BookOpen size={16} />} label="Notes" count={data.Notes.length} isActive={activeTab === 'Notes'} onClick={() => setActiveTab(activeTab === 'Notes' ? null : 'Notes')} />
        <TabButton icon={<FileText size={16} />} label="PYQs" count={data.PYQs.length} isActive={activeTab === 'PYQs'} onClick={() => setActiveTab(activeTab === 'PYQs' ? null : 'PYQs')} />
        <TabButton icon={<Download size={16} />} label="Assign" count={data.Assignments.length} isActive={activeTab === 'Assignments'} onClick={() => setActiveTab(activeTab === 'Assignments' ? null : 'Assignments')} />
      </div>
      <AnimatePresence>
        {activeTab && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 bg-[#FAFAFA] dark:bg-black/40 rounded-2xl p-4 border border-gray-100 dark:border-white/5 overflow-hidden">
            {data[activeTab].length === 0 ? <p className="text-sm text-center text-gray-500 py-2">No items here yet.</p> : (
              <div className="space-y-3">
                {data[activeTab].map((item: any) => {
                  const isSaved = bookmarks.includes(item.id);
                  const isLiked = userLikes.includes(item.id);
                  const currentItem = rawResources.find((r: any) => r.id === item.id) || item;
                  return (
                    <div key={item.id} className="flex flex-col gap-2 bg-white dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/5 group/item relative shadow-sm dark:shadow-none">
                      {!item.is_approved && <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">Pending</span>}
                      <button onClick={() => trackClickAndOpen(item.id, item.drive_link)} className="text-left flex items-center justify-between text-gray-700 dark:text-gray-200 group-hover/item:text-black dark:group-hover/item:text-white">
                        <span className="text-sm font-medium truncate pr-4">{item.title}</span><ExternalLink className="w-4 h-4 opacity-0 group-hover/item:opacity-100 text-gray-400" />
                      </button>
                      <div className="flex items-center justify-between mt-1">
                        <button onClick={() => handleLike(item.id)} className={`flex items-center gap-1.5 text-xs font-semibold ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}><Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500' : ''}`} /> {currentItem.likes_count || 0}</button>
                        <div className="flex gap-1">
                          <button onClick={() => handleFlag(item.id)} title="Report Broken Link" className="p-1 hover:scale-110 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity"><Flag className="w-4 h-4 text-red-300 hover:text-red-500 hover:fill-red-500" /></button>
                          <button onClick={() => toggleBookmark(item.id)} className="p-1 hover:scale-110"><Star className={`w-4 h-4 ${isSaved ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TabButton({ icon, label, count, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-colors duration-300 ${isActive ? 'bg-blue-500 dark:bg-white text-white dark:text-black border-blue-500 dark:border-white shadow-md dark:shadow-none' : 'bg-[#FAFAFA] dark:bg-black/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
      <div className="flex items-center gap-1">{icon}<span className="text-xs font-bold">{count}</span></div><span className="text-[10px] uppercase tracking-wide">{label}</span>
    </button>
  );
}