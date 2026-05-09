"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Search, BookOpen, FileText, LogOut, Download, ExternalLink, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [groupedResources, setGroupedResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.location.href = "/auth";

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);

      const { data: resourceData } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      
      // THE MAGIC: Grouping the flat database rows into organized Subject objects
      if (resourceData) {
        const grouped = resourceData.reduce((acc: any, curr: any) => {
          const code = curr.subject_code;
          if (!acc[code]) {
            acc[code] = {
              subject_name: curr.subject_name,
              subject_code: curr.subject_code,
              Notes: [], PYQs: [], Assignments: []
            };
          }
          if (acc[code][curr.resource_type]) {
            acc[code][curr.resource_type].push(curr);
          }
          return acc;
        }, {});
        
        // Convert the object back into an array so we can map over it
        setGroupedResources(Object.values(grouped));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500 tracking-widest text-sm">ACCESSING VAULT...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tighter">EXAMS<span className="text-gray-500">.</span></div>
          <div className="flex items-center space-x-6">
            <span className="text-sm text-gray-400 hidden md:block">{profile?.full_name}</span>
            {profile?.is_admin && (
              <Link href="/admin" className="px-3 py-1 bg-white/10 text-xs rounded-full border border-white/20 hover:bg-white/20 transition-colors">
                Admin Panel
              </Link>
            )}
            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {profile?.full_name?.split(" ")[0]}</h1>
            <p className="text-gray-400">Your curated Gurugram University materials.</p>
          </motion.div>
        </div>

        {/* Live Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedResources.length === 0 ? (
            <p className="text-gray-500 col-span-full py-12">The vault is currently empty.</p>
          ) : (
            groupedResources.map((subjectData, index) => (
              <SubjectCard key={subjectData.subject_code} data={subjectData} index={index} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// Interactive Subject Card
function SubjectCard({ data, index }: { data: any, index: number }) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const toggleTab = (tab: string) => {
    if (activeTab === tab) setActiveTab(null); // Close if already open
    else setActiveTab(tab); // Open new tab
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
      className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col h-fit"
    >
      <div className="mb-6">
        <span className="text-xs font-bold tracking-wider text-gray-500 mb-2 block">{data.subject_code}</span>
        <h3 className="text-xl font-semibold text-gray-100">{data.subject_name}</h3>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <TabButton icon={<BookOpen size={16}/>} label="Notes" count={data.Notes.length} isActive={activeTab === 'Notes'} onClick={() => toggleTab('Notes')} />
        <TabButton icon={<FileText size={16}/>} label="PYQs" count={data.PYQs.length} isActive={activeTab === 'PYQs'} onClick={() => toggleTab('PYQs')} />
        <TabButton icon={<Download size={16}/>} label="Assign" count={data.Assignments.length} isActive={activeTab === 'Assignments'} onClick={() => toggleTab('Assignments')} />
      </div>

      {/* Expanded List of Links */}
      {activeTab && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 bg-black/40 rounded-2xl p-4 border border-white/5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{activeTab} ({data[activeTab].length})</h4>
          
          {data[activeTab].length === 0 ? (
            <p className="text-sm text-gray-600">No materials uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {data[activeTab].map((item: any) => (
                <a 
                  key={item.id} href={item.drive_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm text-gray-300 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors group"
                >
                  <span className="truncate pr-4">{item.title}</span>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Small helper component for the 3 buttons
function TabButton({ icon, label, count, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-colors ${
        isActive ? 'bg-white text-black border-white' : 'bg-black/50 text-gray-400 border-white/5 hover:bg-white/10 hover:text-gray-200'
      }`}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-xs font-bold">{count}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </button>
  );
}