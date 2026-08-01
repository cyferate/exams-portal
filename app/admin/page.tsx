"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Plus, UploadCloud, Trash2, FileText, Check, X, Eye, ChevronDown, Edit2, Save, ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ShimmerText from "@/app/components/ShimmerText";

export default function AdminPortal() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Vault States
  const [pendingResources, setPendingResources] = useState<any[]>([]);
  const [groupedVault, setGroupedVault] = useState<any[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<any[]>([]);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);

  // Editing States for Pending Queue
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  // Form States for Admin Direct Upload
  const [uploadMode, setUploadMode] = useState<"existing" | "new">("existing");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadData, setUploadData] = useState({ name: "", code: "", type: "Notes", title: "", link: "", target_semester: "1", target_branch: "Common First Year" });

  useEffect(() => {
    setMounted(true);
    fetchVaultData();
  }, []);

  async function fetchVaultData() {
    // FIXED: Using the stable query that matches the Dashboard. 
    // Removed the silent-failing 'profiles' join and added error capturing.
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Database error: " + error.message);
      console.error("Admin Fetch Error:", error);
      return;
    }

    if (!data) return;

    const pending = data.filter(r => !r.is_approved);
    const approved = data.filter(r => r.is_approved);
    setPendingResources(pending);

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

    const grouped = approved.reduce((acc: any, curr: any) => {
      const code = curr.subject_code;
      if (!acc[code]) acc[code] = { subject_name: curr.subject_name, subject_code: curr.subject_code, Notes: [], PYQs: [], Assignments: [] };
      if (acc[code][curr.resource_type]) acc[code][curr.resource_type].push(curr);
      return acc;
    }, {});

    setGroupedVault(Object.values(grouped));
  }

  // --- PENDING QUEUE ACTIONS ---

  const handleApprove = async (item: any) => {
    const loadingToast = toast.loading("Approving to Vault...");

    const { error } = await supabase.from("resources").update({ is_approved: true }).eq("id", item.id);

    if (error) {
      toast.error(error.message, { id: loadingToast });
      return;
    }

    toast.success("Resource Live in the Vault!", { id: loadingToast });
    fetchVaultData();
  };

  const startEditing = (resource: any) => {
    setEditingId(resource.id);
    setEditData({ ...resource });
  };

  const saveEdits = async () => {
    const loadingToast = toast.loading("Saving modifications...");
    const { error } = await supabase.from("resources").update({
      subject_name: editData.subject_name,
      subject_code: editData.subject_code,
      target_semester: editData.target_semester,
      target_branch: editData.target_branch,
      title: editData.title
    }).eq("id", editingId);

    if (error) toast.error(error.message, { id: loadingToast });
    else {
      toast.success("Modifications saved.", { id: loadingToast });
      setEditingId(null);
      fetchVaultData();
    }
  };

  // --- LIVE VAULT ACTIONS ---
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Publishing to vault...");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let finalCode = uploadData.code;
    let finalName = uploadData.name;
    if (uploadMode === "existing") {
      const parsed = JSON.parse(selectedSubject);
      finalCode = parsed.code;
      finalName = parsed.name;
    }

    const finalBranch = (uploadData.target_semester === "1" || uploadData.target_semester === "2")
      ? "Common First Year" : uploadData.target_branch;

    const { error } = await supabase.from("resources").insert([{
      subject_name: finalName, subject_code: finalCode, resource_type: uploadData.type,
      title: uploadData.title, drive_link: uploadData.link, is_approved: true,
      submitted_by: session.user.id, target_semester: uploadData.target_semester, target_branch: finalBranch
    }]);

    if (error) toast.error("Upload failed: " + error.message, { id: loadingToast });
    else {
      toast.success("Resource instantly published!", { id: loadingToast });
      setUploadData({ ...uploadData, title: "", link: "" });
      fetchVaultData();
    }
  };

  const handleDelete = async (id: string, isRejection = false) => {
    if (!window.confirm(`Are you sure you want to ${isRejection ? 'reject and delete' : 'delete'} this resource?`)) return;
    const loadingToast = toast.loading("Deleting...");
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) toast.error("Failed to delete.", { id: loadingToast });
    else {
      toast.success(isRejection ? "Submission rejected." : "Resource deleted.", { id: loadingToast });
      fetchVaultData();
    }
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300 pb-20">

        <nav className="border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">BACK TO VAULT</span>
            </Link>
            <div className="text-xl font-bold tracking-tighter flex items-center absolute left-1/2 -translate-x-1/2 w-max">
              <ShieldCheck className="w-5 h-5 text-blue-500 mr-2" />
              <ShimmerText className="text-black dark:text-white">ADMIN</ShimmerText><span className="text-blue-500">.</span>
            </div>
            <div>
              {mounted && <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-12">

          <div className="mb-12 text-center md:text-left">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Admin Headquarters</h1>
            <p className="text-gray-500 text-sm">Manage the EXAMS community vault. All actions here are final.</p>
          </div>

          <AnimatePresence>
            {pendingResources.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-12">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-600 dark:text-yellow-500"><Check className="w-5 h-5" /> Pending Approvals ({pendingResources.length})</h2>
                <div className="grid grid-cols-1 gap-4">
                  {pendingResources.map(item => (
                    <div key={item.id} className="bg-yellow-50 dark:bg-[#121212] border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-6 shadow-sm">
                      {editingId === item.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject Name</span>
                              <input type="text" value={editData.subject_name} onChange={e => setEditData({ ...editData, subject_name: e.target.value })} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject Code</span>
                              <input type="text" value={editData.subject_code} onChange={e => setEditData({ ...editData, subject_code: e.target.value })} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Semester</span>
                              <select value={editData.target_semester} onChange={e => setEditData({ ...editData, target_semester: e.target.value })} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Branch</span>
                              <select value={editData.target_branch} onChange={e => setEditData({ ...editData, target_branch: e.target.value })} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white">
                                <option value="Common First Year">Common First Year</option><option value="CSE-AI">CSE-AI</option><option value="CSE CORE">CSE CORE</option><option value="CSE-CS">CSE-CS</option><option value="CSE-IoT">CSE-IoT</option><option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Material Title</span>
                            <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white" />
                          </div>
                          <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">CANCEL</button>
                            <button onClick={saveEdits} className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"><Save className="w-3.5 h-3.5" /> SAVE EDITS</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="text-xs font-black text-blue-500 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-2 py-1 rounded-md">{item.subject_code}</span>
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">{item.resource_type}</span>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-500/20">Sem {item.target_semester}</span>
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-500/20">{item.target_branch}</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.subject_name} <span className="text-gray-300 dark:text-gray-600 px-2">•</span> Submitted by: <span className="font-semibold text-gray-700 dark:text-gray-300">{"Unknown"}</span></p>
                            <a href={item.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:underline">Verify Drive Link ↗</a>
                          </div>
                          <div className="flex sm:flex-col gap-2 justify-end sm:min-w-[120px]">
                            <button onClick={() => handleApprove(item)} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"><Check className="w-4 h-4" /> APPROVE</button>
                            <button onClick={() => startEditing(item)} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"><Edit2 className="w-4 h-4" /> EDIT</button>
                            <button onClick={() => handleDelete(item.id, true)} className="flex-1 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"><Trash2 className="w-4 h-4" /> REJECT</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-sm">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><UploadCloud className="w-5 h-5 text-gray-400" /> Direct Upload</h2>

                <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 mb-6">
                  <button onClick={() => setUploadMode("existing")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "existing" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Existing Subject</button>
                  <button onClick={() => setUploadMode("new")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "new" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>New Subject</button>
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                  {uploadMode === "existing" ? (
                    uniqueSubjects.length > 0 ? (
                      <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                        {uniqueSubjects.map(sub => <option key={sub.code} value={JSON.stringify(sub)}>{sub.code} - {sub.name}</option>)}
                      </select>
                    ) : <p className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded-lg">No subjects exist yet.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Name" required value={uploadData.name} onChange={e => setUploadData({ ...uploadData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                        <input type="text" placeholder="Code" required value={uploadData.code} onChange={e => setUploadData({ ...uploadData, code: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <select value={uploadData.target_semester} onChange={e => setUploadData({ ...uploadData, target_semester: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Sem {n}</option>)}
                        </select>
                        <select disabled={uploadData.target_semester === "1" || uploadData.target_semester === "2"} value={uploadData.target_branch} onChange={e => setUploadData({ ...uploadData, target_branch: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300 disabled:opacity-50">
                          {(uploadData.target_semester === "1" || uploadData.target_semester === "2") ? <option value="Common First Year">Common 1st Year</option> : <><option value="CSE-AI">CSE-AI</option><option value="CSE CORE">CSE CORE</option><option value="CSE-CS">CSE-CS</option><option value="CSE-IoT">CSE-IoT</option><option value="Other">Other</option></>}
                        </select>
                      </div>
                    </>
                  )}

                  <select value={uploadData.type} onChange={e => setUploadData({ ...uploadData, type: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">
                    <option value="Notes">Notes</option><option value="PYQs">PYQs</option><option value="Assignments">Assignments</option>
                  </select>
                  <input type="text" placeholder="Title (e.g., Unit 1 Notes)" required value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                  <input type="url" placeholder="Drive Link" required value={uploadData.link} onChange={e => setUploadData({ ...uploadData, link: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" />
                  <button type="submit" disabled={uploadMode === 'existing' && uniqueSubjects.length === 0} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl flex justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"><Plus className="w-5 h-5" /> Publish Instantly</button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 md:p-8 rounded-3xl shadow-sm min-h-[600px]">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><FileText className="w-5 h-5 text-gray-400" /> Live Vault Organization</h2>

                <div className="space-y-4">
                  {groupedVault.length === 0 ? <p className="text-gray-500 text-center py-12">The vault is currently empty.</p> :
                    groupedVault.map((subject) => (
                      <div key={subject.subject_code} className="border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/40 rounded-2xl overflow-hidden">
                        <button onClick={() => setActiveSubjectTab(activeSubjectTab === subject.subject_code ? null : subject.subject_code)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                          <div className="text-left">
                            <p className="text-xs font-bold text-gray-500 mb-1">{subject.subject_code}</p>
                            <p className="font-semibold text-gray-900 dark:text-gray-200">{subject.subject_name}</p>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${activeSubjectTab === subject.subject_code ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {activeSubjectTab === subject.subject_code && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-200 dark:border-white/5">
                              <div className="p-4 space-y-6">
                                {['Notes', 'PYQs', 'Assignments'].map(type => (
                                  <div key={type}>
                                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2 ml-2">{type}</h4>
                                    {subject[type].length === 0 ? <p className="text-xs text-gray-400 ml-2 italic">No {type} uploaded.</p> : (
                                      <div className="space-y-2">
                                        {subject[type].map((item: any) => (
                                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-black/60 p-3 rounded-xl border border-gray-200 dark:border-white/5 gap-2">
                                            <a href={item.drive_link} target="_blank" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white truncate flex-1">{item.title}</a>
                                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">

                                              {/* Admin Flag Warning Badge */}
                                              {(item.flags_count || 0) > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10 px-2 py-1 rounded-md font-bold animate-pulse" title="Reported as broken">
                                                  <Flag className="w-3 h-3" /> {item.flags_count} Reports
                                                </span>
                                              )}

                                              <span className="flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-400/10 px-2 py-1 rounded-md font-bold" title="Total Views"><Eye className="w-3 h-3" /> {item.views || 0}</span>
                                              <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
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
        </main>
      </div>
    </ProtectedRoute>
  );
}