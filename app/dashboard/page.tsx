"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, LogOut, Download, ExternalLink, Star, Heart, UploadCloud, Plus, X, Sun, Moon } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [groupedResources, setGroupedResources] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]); 
  const [userLikes, setUserLikes] = useState<string[]>([]); 
  const [rawResources, setRawResources] = useState<any[]>([]);
  
  // Smart Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"existing" | "new">("existing");
  const [uniqueSubjects, setUniqueSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadData, setUploadData] = useState({ name: "", code: "", type: "Notes", title: "", link: "" });

  // NEW: Profile Completion States
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [step2Data, setStep2Data] = useState({ rollNo: "", semester: "1", branch: "CSE CORE-A", customBranch: "" });

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

    // NEW: Check if profile needs completion (Google Sign-In caught them)
    if (!profileData?.roll_no || !profileData?.branch) {
      setIsProfileIncomplete(true);
    }

    // Fetch Resources
    const { data: resourceData } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (resourceData) {
      setRawResources(resourceData);
      
      const approvedAndMine = resourceData.filter(r => r.is_approved || r.submitted_by === session.user.id);
      
      // Extract Unique Subjects for the Student Dropdown
      const subjectsMap = new Map();
      resourceData.filter(r => r.is_approved).forEach(r => {
        if (!subjectsMap.has(r.subject_code)) {
          subjectsMap.set(r.subject_code, { code: r.subject_code, name: r.subject_name });
        }
      });
      const subjectsArray = Array.from(subjectsMap.values());
      setUniqueSubjects(subjectsArray);
      if (subjectsArray.length > 0 && !selectedSubject) {
        setSelectedSubject(JSON.stringify(subjectsArray[0]));
      }

      // Group for display
      const grouped = approvedAndMine.reduce((acc: any, curr: any) => {
        const code = curr.subject_code;
        if (!acc[code]) acc[code] = { subject_name: curr.subject_name, subject_code: curr.subject_code, Notes: [], PYQs: [], Assignments: [] };
        if (acc[code][curr.resource_type]) acc[code][curr.resource_type].push(curr);
        return acc;
      }, {});
      setGroupedResources(Object.values(grouped));
    }

    // Fetch Bookmarks & Likes
    const { data: bookmarkData } = await supabase.from("bookmarks").select("resource_id").eq("user_id", session.user.id);
    if (bookmarkData) setBookmarks(bookmarkData.map(b => b.resource_id));

    const { data: likesData } = await supabase.from("likes").select("resource_id").eq("user_id", session.user.id);
    if (likesData) setUserLikes(likesData.map(l => l.resource_id));
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

    // Determine subject details based on mode
    let finalCode = uploadData.code;
    let finalName = uploadData.name;
    if (uploadMode === "existing") {
      const parsed = JSON.parse(selectedSubject);
      finalCode = parsed.code;
      finalName = parsed.name;
    }

    const { error } = await supabase.from("resources").insert([{ 
      subject_name: finalName, 
      subject_code: finalCode, 
      resource_type: uploadData.type, 
      title: uploadData.title, 
      drive_link: uploadData.link, 
      is_approved: false, 
      submitted_by: session?.user.id 
    }]);

    if (error) {
      toast.error("Submission failed: " + error.message, { id: loadingToast });
    } else {
      toast.success("Submitted! Waiting for Admin approval.", { id: loadingToast, duration: 4000 });
      setIsUploadModalOpen(false);
      setUploadData({ name: "", code: "", type: "Notes", title: "", link: "" });
      fetchData(); 
    }
  };

  // NEW: Save Step 2 Profile Data
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const rollNoRegex = /^\d{12}$/; 
    if (!rollNoRegex.test(step2Data.rollNo)) return toast.error("Roll Number must be exactly 12 digits.");

    const finalBranch = step2Data.branch === "Other" ? step2Data.customBranch : step2Data.branch;
    if (step2Data.branch === "Other" && !step2Data.customBranch) return toast.error("Specify custom branch.");

    const loadingToast = toast.loading("Updating profile...");
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('profiles')
      .update({ roll_no: step2Data.rollNo, semester: step2Data.semester, branch: finalBranch })
      .eq('id', session?.user.id);

    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success("Profile Complete. Welcome to the Vault.", { id: loadingToast });
      setIsProfileIncomplete(false);
      fetchData(); // Refresh the dashboard
    }
  };

  const pinnedResources = rawResources.filter(res => bookmarks.includes(res.id));

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white font-sans relative transition-colors duration-300">
        
        {/* NEW: FORCED PROFILE COMPLETION MODAL */}
        <AnimatePresence>
          {isProfileIncomplete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Almost there!</h2>
                <p className="text-gray-500 mb-6 text-sm">Since you signed in with Google, we just need your University details to configure your Vault.</p>
                
                <form onSubmit={handleCompleteProfile} className="space-y-4">
                  <input type="text" placeholder="Roll Number (12 Digits)" required value={step2Data.rollNo} onChange={e => setStep2Data({...step2Data, rollNo: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <select value={step2Data.semester} onChange={e => setStep2Data({...step2Data, semester: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-gray-300">
                      <option disabled value="">Semester</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Sem {num}</option>)}
                    </select>
                    <select value={step2Data.branch} onChange={e => setStep2Data({...step2Data, branch: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-gray-300">
                      <option value="CSE CORE-A">CSE CORE-A</option>
                      <option value="CSE CORE-B">CSE CORE-B</option>
                      <option value="CSE-AI">CSE-AI</option>
                      <option value="CSE-CS">CSE-CS</option>
                      <option value="CSE-IoT">CSE-IoT</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {step2Data.branch === "Other" && (
                    <input type="text" placeholder="Enter your branch manually" required value={step2Data.customBranch} onChange={e => setStep2Data({...step2Data, customBranch: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white" />
                  )}
                  
                  <button type="submit" className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors mt-4">
                    Complete Profile
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* UPDATED NAVBAR WITH THEME TOGGLE */}
        <nav className="border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-lg sticky top-0 z-40 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-xl font-bold tracking-tighter text-black dark:text-white">EXAMS<span className="text-blue-500 dark:text-gray-500">.</span></div>
            <div className="flex items-center space-x-4 md:space-x-6">
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">{profile?.full_name}</span>
              
              {/* THEME TOGGLE */}
              {mounted && (
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}

              <Link href="/profile" className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Profile</Link>
              {profile?.is_admin && <Link href="/admin" className="px-3 py-1 bg-black/5 dark:bg-white/10 text-xs rounded-full border border-black/10 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black dark:text-white">Admin</Link>}
              <button onClick={handleLogout} className="text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Welcome back, {profile?.full_name?.split(" ")[0]}</h1>
              <p className="text-gray-600 dark:text-gray-400">Your curated Gurugram University materials.</p>
            </div>
            <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg dark:shadow-none">
              <UploadCloud className="w-5 h-5" /> Contribute Material
            </button>
          </div>

          {/* PINNED RESOURCES */}
          {pinnedResources.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Saved for Later</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedResources.map(item => (
                  <div key={`pinned-${item.id}`} className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none transition-colors">
                    <div>
                      <p className="text-xs text-blue-500 dark:text-gray-500 font-bold mb-1">{item.subject_code} • {item.resource_type}</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{item.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => trackClickAndOpen(item.id, item.drive_link)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"><ExternalLink className="w-4 h-4 text-gray-600 dark:text-white" /></button>
                      <button onClick={() => toggleBookmark(item.id)} className="p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL SUBJECTS WITH STAGGERED ANIMATION */}
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-300">All Subjects</h2>
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {groupedResources.length === 0 ? <p className="text-gray-500">The vault is empty.</p> : 
              groupedResources.map((subjectData, index) => (
                <SubjectCard key={subjectData.subject_code} data={subjectData} index={index} bookmarks={bookmarks} toggleBookmark={toggleBookmark} trackClickAndOpen={trackClickAndOpen} userLikes={userLikes} handleLike={handleLike} rawResources={rawResources} />
              ))
            }
          </motion.div>
        </main>

        {/* UPLOAD MODAL */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Contribute Material</h3>
                  <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 mb-6">
                  <button onClick={() => setUploadMode("existing")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "existing" ? "bg-white dark:bg-white/10 font-bold text-black dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Existing Subject</button>
                  <button onClick={() => setUploadMode("new")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "new" ? "bg-white dark:bg-white/10 font-bold text-black dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>New Subject</button>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  
                  {uploadMode === "existing" ? (
                    uniqueSubjects.length > 0 ? (
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-gray-300">
                        {uniqueSubjects.map(sub => (
                          <option key={sub.code} value={JSON.stringify(sub)}>{sub.code} - {sub.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-yellow-600 dark:text-yellow-500 p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">No subjects exist yet. Switch to "New Subject".</p>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Subject Name" required value={uploadData.name} onChange={e => setUploadData({...uploadData, name: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white" />
                      <input type="text" placeholder="Code (MAT-203)" required value={uploadData.code} onChange={e => setUploadData({...uploadData, code: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white" />
                    </div>
                  )}

                  <select value={uploadData.type} onChange={e => setUploadData({...uploadData, type: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-gray-300">
                    <option value="Notes">Notes</option><option value="PYQs">PYQs</option><option value="Assignments">Assignments</option>
                  </select>
                  <input type="text" placeholder="Title (e.g., Unit 1 Notes)" required value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white" />
                  <input type="url" placeholder="Google Drive Link" required value={uploadData.link} onChange={e => setUploadData({...uploadData, link: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 dark:focus:border-white/30 text-gray-900 dark:text-white" />
                  
                  <button type="submit" disabled={uploadMode === 'existing' && uniqueSubjects.length === 0} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-5 h-5" /> Submit for Approval
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-2">Admins will review your submission before it goes live.</p>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ProtectedRoute>
  );
}

// V3.0 Interactive Subject Card 
function SubjectCard({ data, bookmarks, toggleBookmark, trackClickAndOpen, userLikes, handleLike, rawResources }: any) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Framer Motion variant for the cascading effect
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={itemVariants}
      className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md flex flex-col h-fit transition-colors duration-300"
    >
      <div className="mb-6">
        <span className="text-xs font-bold tracking-wider text-blue-500 dark:text-gray-500 mb-2 block">{data.subject_code}</span>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{data.subject_name}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <TabButton icon={<BookOpen size={16}/>} label="Notes" count={data.Notes.length} isActive={activeTab === 'Notes'} onClick={() => setActiveTab(activeTab === 'Notes' ? null : 'Notes')} />
        <TabButton icon={<FileText size={16}/>} label="PYQs" count={data.PYQs.length} isActive={activeTab === 'PYQs'} onClick={() => setActiveTab(activeTab === 'PYQs' ? null : 'PYQs')} />
        <TabButton icon={<Download size={16}/>} label="Assign" count={data.Assignments.length} isActive={activeTab === 'Assignments'} onClick={() => setActiveTab(activeTab === 'Assignments' ? null : 'Assignments')} />
      </div>

      <AnimatePresence>
        {activeTab && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-gray-50 dark:bg-black/40 rounded-2xl p-4 border border-gray-100 dark:border-white/5 overflow-hidden"
          >
            {data[activeTab].length === 0 ? (
              <p className="text-sm text-center text-gray-500 dark:text-gray-500 py-2">No items here yet.</p>
            ) : (
              <div className="space-y-3">
                {data[activeTab].map((item: any) => {
                  const isSaved = bookmarks.includes(item.id);
                  const isLiked = userLikes.includes(item.id);
                  const currentItem = rawResources.find((r: any) => r.id === item.id) || item;

                  return (
                    <div key={item.id} className="flex flex-col gap-2 bg-white dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none group relative transition-colors">
                      {!item.is_approved && (
                         <span className="absolute -top-2 -right-2 bg-yellow-400 dark:bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">Pending</span>
                      )}
                      
                      <button onClick={() => trackClickAndOpen(item.id, item.drive_link)} className="text-left flex items-center justify-between text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                        <span className="text-sm font-medium truncate pr-4">{item.title}</span>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500" />
                      </button>
                      
                      <div className="flex items-center justify-between mt-1">
                         <button onClick={() => handleLike(item.id)} className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-400 dark:text-gray-500 hover:text-pink-400'}`}>
                           <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500' : ''}`} /> {currentItem.likes_count || 0}
                         </button>
                         <button onClick={() => toggleBookmark(item.id)} className="p-1 hover:scale-110 transition-transform">
                           <Star className={`w-4 h-4 ${isSaved ? 'text-yellow-400 dark:text-yellow-500 fill-yellow-400 dark:fill-yellow-500' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 dark:hover:text-yellow-500'}`} />
                         </button>
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

// V3.0 Tab Button
function TabButton({ icon, label, count, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-colors duration-300 ${
        isActive 
          ? 'bg-blue-500 dark:bg-white text-white dark:text-black border-blue-500 dark:border-white shadow-md dark:shadow-none' 
          : 'bg-gray-50 dark:bg-black/50 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      <div className="flex items-center gap-1">{icon}<span className="text-xs font-bold">{count}</span></div>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </button>
  );
}