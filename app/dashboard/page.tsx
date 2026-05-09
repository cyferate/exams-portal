"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Search, BookOpen, FileText, LogOut, Download, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [groupedResources, setGroupedResources] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]); // Array of bookmarked resource IDs
  const [rawResources, setRawResources] = useState<any[]>([]); // Keep raw data for the pinned section

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch Profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);

      // Fetch Resources
      const { data: resourceData } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      if (resourceData) {
        setRawResources(resourceData);
        // Group resources by subject
        const grouped = resourceData.reduce((acc: any, curr: any) => {
          const code = curr.subject_code;
          if (!acc[code]) acc[code] = { subject_name: curr.subject_name, subject_code: curr.subject_code, Notes: [], PYQs: [], Assignments: [] };
          if (acc[code][curr.resource_type]) acc[code][curr.resource_type].push(curr);
          return acc;
        }, {});
        setGroupedResources(Object.values(grouped));
      }

      // Fetch User's Bookmarks
      const { data: bookmarkData } = await supabase.from("bookmarks").select("resource_id").eq("user_id", session.user.id);
      if (bookmarkData) {
        setBookmarks(bookmarkData.map(b => b.resource_id));
      }
    }
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Toggle Bookmark Logic
  const toggleBookmark = async (resourceId: string) => {
    const isBookmarked = bookmarks.includes(resourceId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (isBookmarked) {
      setBookmarks(bookmarks.filter(id => id !== resourceId)); // Optimistic UI update
      await supabase.from("bookmarks").delete().eq("resource_id", resourceId).eq("user_id", session.user.id);
      toast.success("Removed from Saved Items", { icon: '🗑️' });
    } else {
      setBookmarks([...bookmarks, resourceId]); // Optimistic UI update
      await supabase.from("bookmarks").insert([{ user_id: session.user.id, resource_id: resourceId }]);
      toast.success("Saved for Exam Week!", { icon: '⭐' });
    }
  };

  // Analytics Click Tracking
  const trackClickAndOpen = async (resourceId: string, url: string) => {
    window.open(url, "_blank"); // Open link immediately for good UX
    await supabase.rpc('increment_view_count', { res_id: resourceId }); // Secretly +1 to views in DB
  };

  // Filter raw resources to find the pinned ones
  const pinnedResources = rawResources.filter(res => bookmarks.includes(res.id));

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
        <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-xl font-bold tracking-tighter">EXAMS<span className="text-gray-500">.</span></div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-gray-400 hidden md:block">{profile?.full_name}</span>
              {profile?.is_admin && <Link href="/admin" className="px-3 py-1 bg-white/10 text-xs rounded-full border border-white/20 hover:bg-white/20 transition-colors">Admin Panel</Link>}
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {profile?.full_name?.split(" ")[0]}</h1>
            <p className="text-gray-400">Your curated Gurugram University materials.</p>
          </div>

          {/* NEW: Saved / Pinned Section */}
          {pinnedResources.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Saved for Later</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedResources.map(item => (
                  <div key={`pinned-${item.id}`} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group">
                    <div>
                      <p className="text-xs text-gray-500 font-bold mb-1">{item.subject_code} • {item.resource_type}</p>
                      <p className="text-sm font-medium">{item.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => trackClickAndOpen(item.id, item.drive_link)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><ExternalLink className="w-4 h-4" /></button>
                      <button onClick={() => toggleBookmark(item.id)} className="p-2 bg-yellow-500/10 rounded-lg hover:bg-yellow-500/20 transition-colors"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Subjects Grid */}
          <h2 className="text-xl font-bold mb-4 text-gray-300">All Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedResources.length === 0 ? <p className="text-gray-500">The vault is empty.</p> : 
              groupedResources.map((subjectData, index) => (
                <SubjectCard key={subjectData.subject_code} data={subjectData} index={index} bookmarks={bookmarks} toggleBookmark={toggleBookmark} trackClickAndOpen={trackClickAndOpen} />
              ))
            }
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// Interactive Subject Card
function SubjectCard({ data, index, bookmarks, toggleBookmark, trackClickAndOpen }: any) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col h-fit">
      <div className="mb-6">
        <span className="text-xs font-bold tracking-wider text-gray-500 mb-2 block">{data.subject_code}</span>
        <h3 className="text-xl font-semibold text-gray-100">{data.subject_name}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <TabButton icon={<BookOpen size={16}/>} label="Notes" count={data.Notes.length} isActive={activeTab === 'Notes'} onClick={() => setActiveTab(activeTab === 'Notes' ? null : 'Notes')} />
        <TabButton icon={<FileText size={16}/>} label="PYQs" count={data.PYQs.length} isActive={activeTab === 'PYQs'} onClick={() => setActiveTab(activeTab === 'PYQs' ? null : 'PYQs')} />
        <TabButton icon={<Download size={16}/>} label="Assign" count={data.Assignments.length} isActive={activeTab === 'Assignments'} onClick={() => setActiveTab(activeTab === 'Assignments' ? null : 'Assignments')} />
      </div>

      {activeTab && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 bg-black/40 rounded-2xl p-4 border border-white/5">
          {data[activeTab].length === 0 ? (
            <p className="text-sm text-center text-gray-500 py-2">No items here yet.</p>
          ) : (
            <div className="space-y-3">
              {data[activeTab].map((item: any) => {
                const isSaved = bookmarks.includes(item.id);
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm text-gray-300 hover:bg-white/5 p-2 rounded-lg transition-colors group">
                    <button onClick={() => trackClickAndOpen(item.id, item.drive_link)} className="flex-1 text-left flex items-center justify-between pr-4 group-hover:text-white">
                      <span className="truncate">{item.title}</span>
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button onClick={() => toggleBookmark(item.id)} className="p-1 hover:scale-110 transition-transform flex-shrink-0">
                      <Star className={`w-4 h-4 ${isSaved ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600 hover:text-yellow-500'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function TabButton({ icon, label, count, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-colors ${isActive ? 'bg-white text-black border-white' : 'bg-black/50 text-gray-400 border-white/5 hover:bg-white/10 hover:text-gray-200'}`}>
      <div className="flex items-center gap-1">{icon}<span className="text-xs font-bold">{count}</span></div>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </button>
  );
}