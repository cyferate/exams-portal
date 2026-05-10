"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Plus, UploadCloud, Trash2, FileText, Check, X, Eye, ChevronDown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function AdminPortal() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Vault States
  const [pendingResources, setPendingResources] = useState<any[]>([]);
  const [groupedVault, setGroupedVault] = useState<any[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<any[]>([]);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);

  // Form States
  const [uploadMode, setUploadMode] = useState<"existing" | "new">("existing");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [resourceType, setResourceType] = useState("Notes");
  const [resourceTitle, setResourceTitle] = useState("");
  const [driveLink, setDriveLink] = useState("");

  useEffect(() => {
    async function initAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (data?.is_admin) {
        setIsAdmin(true);
        fetchVaultData();
      }
      setLoading(false);
    }
    initAdmin();
  }, []);

  async function fetchVaultData() {
    const { data } = await supabase.from("resources").select("*, profiles(full_name)").order("created_at", { ascending: false });
    if (!data) return;

    // 1. Separate Pending vs Approved
    const pending = data.filter(r => !r.is_approved);
    const approved = data.filter(r => r.is_approved);
    setPendingResources(pending);

    // 2. Extract Unique Subjects for the Smart Dropdown
    const subjectsMap = new Map();
    approved.forEach(r => {
      if (!subjectsMap.has(r.subject_code)) {
        subjectsMap.set(r.subject_code, { code: r.subject_code, name: r.subject_name });
      }
    });
    const subjectsArray = Array.from(subjectsMap.values());
    setUniqueSubjects(subjectsArray);
    if (subjectsArray.length > 0 && !selectedSubject) {
      setSelectedSubject(JSON.stringify(subjectsArray[0]));
    }

    // 3. Group Approved Resources for the Accordion UI
    const grouped = approved.reduce((acc: any, curr: any) => {
      const code = curr.subject_code;
      if (!acc[code]) acc[code] = { subject_name: curr.subject_name, subject_code: curr.subject_code, Notes: [], PYQs: [], Assignments: [] };
      if (acc[code][curr.resource_type]) acc[code][curr.resource_type].push(curr);
      return acc;
    }, {});
    setGroupedVault(Object.values(grouped));
  }

  // --- ACTIONS ---

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Publishing to vault...");
    
    // Get the Admin's session ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Determine subject details based on mode
    let finalCode = subjectCode;
    let finalName = subjectName;
    if (uploadMode === "existing") {
      const parsed = JSON.parse(selectedSubject);
      finalCode = parsed.code;
      finalName = parsed.name;
    }

    // Insert with the submitted_by tag!
    const { error } = await supabase.from("resources").insert([
      { 
        subject_name: finalName, 
        subject_code: finalCode, 
        resource_type: resourceType, 
        title: resourceTitle, 
        drive_link: driveLink, 
        is_approved: true,
        submitted_by: session.user.id // <-- THIS IS THE NEW LINE
      }
    ]);

    if (error) {
      toast.error("Upload failed: " + error.message, { id: loadingToast });
      console.error(error); // Helpful for debugging
    } else {
      toast.success("Resource instantly published!", { id: loadingToast });
      setResourceTitle(""); setDriveLink(""); 
      fetchVaultData(); 
    }
  };

  const handleApprove = async (id: string) => {
    const loadingToast = toast.loading("Approving...");
    const { error } = await supabase.from("resources").update({ is_approved: true }).eq("id", id);
    if (error) toast.error("Error: " + error.message, { id: loadingToast });
    else {
      toast.success("Submission Approved!", { id: loadingToast });
      fetchVaultData();
    }
  };

  const handleDelete = async (id: string, isRejection = false) => {
    if (!window.confirm(`Are you sure you want to ${isRejection ? 'reject and delete' : 'delete'} this resource?`)) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) toast.error("Failed to delete.");
    else {
      toast.success(isRejection ? "Submission rejected." : "Resource permanently deleted.");
      fetchVaultData();
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">VERIFYING CLEARANCE...</div>;
  if (!isAdmin) return <div className="min-h-screen bg-[#0a0a0a] text-red-500 flex items-center justify-center font-bold text-2xl">ACCESS DENIED.</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-gray-300" />
              <div>
                <h1 className="text-3xl font-bold">Admin Headquarters</h1>
                <p className="text-gray-500 text-sm">Manage the EXAMS community vault.</p>
              </div>
            </div>
            <Link href="/dashboard" className="text-sm border border-white/20 px-6 py-2 rounded-full hover:bg-white/10 transition-colors text-center">
              Back to Dashboard
            </Link>
          </div>

          {/* APPROVAL QUEUE (Only shows if there are pending items) */}
          <AnimatePresence>
            {pendingResources.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-12">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-500"><Check className="w-5 h-5" /> Pending Approvals ({pendingResources.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingResources.map(item => (
                    <div key={item.id} className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-bold text-yellow-600 uppercase mb-1">{item.subject_code} • {item.resource_type}</p>
                        <p className="text-lg font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-1">Submitted by: {item.profiles?.full_name || "Unknown Student"}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <a href={item.drive_link} target="_blank" className="flex-1 bg-black/50 text-center py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">Review Link</a>
                        <button onClick={() => handleApprove(item.id)} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors"><Check className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(item.id, true)} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT: SMART UPLOAD PANEL */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-gray-400" /> Direct Upload</h2>
                
                {/* Upload Mode Toggle */}
                <div className="flex bg-black/50 rounded-xl p-1 mb-6">
                  <button onClick={() => setUploadMode("existing")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "existing" ? "bg-white/10 font-bold" : "text-gray-500 hover:text-gray-300"}`}>Existing Subject</button>
                  <button onClick={() => setUploadMode("new")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "new" ? "bg-white/10 font-bold" : "text-gray-500 hover:text-gray-300"}`}>New Subject</button>
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                  {uploadMode === "existing" ? (
                    uniqueSubjects.length > 0 ? (
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                        {uniqueSubjects.map(sub => (
                          <option key={sub.code} value={JSON.stringify(sub)}>{sub.code} - {sub.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-yellow-500 p-2 bg-yellow-500/10 rounded-lg">No subjects exist yet. Switch to "New Subject".</p>
                    )
                  ) : (
                    <div className="space-y-4">
                      <input type="text" placeholder="Subject Name (e.g., Math III)" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
                      <input type="text" placeholder="Subject Code (e.g., MAT-203)" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
                    </div>
                  )}

                  <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                    <option value="Notes">Notes</option>
                    <option value="PYQs">PYQs</option>
                    <option value="Assignments">Assignments</option>
                  </select>
                  <input type="text" placeholder="Title (e.g., Unit 1)" required value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
                  <input type="url" placeholder="Google Drive Link" required value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
                  
                  <button type="submit" disabled={uploadMode === 'existing' && uniqueSubjects.length === 0} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-5 h-5" /> Publish Instantly
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT: GROUPED VAULT MANAGEMENT */}
            <div className="lg:col-span-8">
              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl backdrop-blur-md min-h-[600px]">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-400" /> Live Vault Organization</h2>
                
                <div className="space-y-4">
                  {groupedVault.length === 0 ? <p className="text-gray-500 text-center py-12">The vault is currently empty.</p> : 
                    groupedVault.map((subject) => (
                      <div key={subject.subject_code} className="border border-white/5 bg-black/40 rounded-2xl overflow-hidden">
                        
                        {/* Subject Header (Click to expand) */}
                        <button 
                          onClick={() => setActiveSubjectTab(activeSubjectTab === subject.subject_code ? null : subject.subject_code)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-xs font-bold text-gray-500 mb-1">{subject.subject_code}</p>
                            <p className="font-semibold text-gray-200">{subject.subject_name}</p>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${activeSubjectTab === subject.subject_code ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Expanded Content (Editable Links) */}
                        <AnimatePresence>
                          {activeSubjectTab === subject.subject_code && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                              <div className="p-4 space-y-6">
                                
                                {['Notes', 'PYQs', 'Assignments'].map(type => (
                                  <div key={type}>
                                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2 ml-2">{type}</h4>
                                    {subject[type].length === 0 ? <p className="text-xs text-gray-600 ml-2 italic">No {type} uploaded.</p> : (
                                      <div className="space-y-2">
                                        {subject[type].map((item: any) => (
                                          <div key={item.id} className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-white/5 group">
                                            <a href={item.drive_link} target="_blank" className="text-sm text-gray-300 hover:text-white truncate flex-1 pr-4">{item.title}</a>
                                            <div className="flex items-center gap-3">
                                              <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md font-bold" title="Total Views"><Eye className="w-3 h-3"/> {item.views || 0}</span>
                                              <button onClick={() => handleDelete(item.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}