"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Plus, UploadCloud, Trash2, FileText, Check, X, Eye, ChevronDown, Edit2, Save, ArrowLeft, Flag, Zap, Box, Terminal, Layers3, Code2, BookOpen, Key, Copy, CheckCircle2, XCircle, Loader2, MessageSquareDashed, Share2, Ghost, Clock } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ShimmerText from "@/app/components/ShimmerText";

type MainTab = "vault" | "garuda" | "keys" | "cjd";

const PISTON_RUNTIMES = [
  { name: "Python 3", slug: "python", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
  { name: "C (GCC)", slug: "c", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg" },
  { name: "C++ (GCC)", slug: "cpp", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
  { name: "Java", slug: "java", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
  { name: "JavaScript (Node)", slug: "javascript", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
  { name: "TypeScript (Deno)", slug: "typescript", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
  { name: "R Programming", slug: "r", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/r/r-original.svg" },
  { name: "SQL (SQLite)", slug: "sqlite3", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg" },
  { name: "Go", slug: "go", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" },
  { name: "Rust", slug: "rust", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg" },
  { name: "Ruby", slug: "ruby", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg" },
  { name: "PHP", slug: "php", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg" },
  { name: "Swift", slug: "swift", icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg" }
];

export default function AdminPortal() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("vault");

  const [pendingResources, setPendingResources] = useState<any[]>([]);
  const [groupedVault, setGroupedVault] = useState<any[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<any[]>([]);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  const [uploadMode, setUploadMode] = useState<"existing" | "new">("existing");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadData, setUploadData] = useState({ name: "", code: "", type: "Notes", title: "", link: "", target_semester: "1", target_branch: "Common First Year" });

  const [garudaLanguages, setGarudaLanguages] = useState<any[]>([]);
  const [selectedRuntimeSlug, setSelectedRuntimeSlug] = useState<string>("");

  const [accessKeys, setAccessKeys] = useState<any[]>([]);
  const [isKeysLoading, setIsKeysLoading] = useState(true);
  const [isForging, setIsForging] = useState(false);
  const [customKey, setCustomKey] = useState(""); // <-- NEW: Custom Key State

  const [pendingCjdPosts, setPendingCjdPosts] = useState<any[]>([]);
  const [liveCjdPosts, setLiveCjdPosts] = useState<any[]>([]);
  const [cjdTab, setCjdTab] = useState<"pending" | "live">("pending");
  const [adminReplies, setAdminReplies] = useState<Record<string, string>>({});

  const [isArenaModalOpen, setIsArenaModalOpen] = useState(false);
  const [activeArenaLang, setActiveArenaLang] = useState<any>(null);
  const [arenaForm, setArenaForm] = useState({
    type: "challenge",
    title: "", difficulty: "Fundamentals", description: "", xp_reward: 10, material_url: "",
    public_test_cases: '[\n  {\n    "input": "2",\n    "expected": "4"\n  }\n]',
    private_test_cases: '[\n  {\n    "input": "5",\n    "expected": "25"\n  }\n]'
  });

  useEffect(() => {
    setMounted(true);
    fetchVaultData();
    fetchGarudaData();
    fetchKeys();
    fetchCjdData();
  }, []);

  async function fetchCjdData() {
    const { data, error } = await supabase
      .from("cjd_posts")
      .select("*, profiles(full_name, branch)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (data) {
      setPendingCjdPosts(data.filter(p => !p.is_approved));
      setLiveCjdPosts(data.filter(p => p.is_approved));
    }
  }

  async function fetchKeys() {
    setIsKeysLoading(true);
    const { data, error } = await supabase.from("garuda_invites").select("*").order("created_at", { ascending: false });
    if (!error && data) setAccessKeys(data);
    setIsKeysLoading(false);
  }

  async function fetchVaultData() {
    const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (error) return toast.error("Database error: " + error.message);
    if (!data) return;

    const pending = data.filter(r => !r.is_approved);
    const approved = data.filter(r => r.is_approved);
    setPendingResources(pending);

    const subjectsMap = new Map();
    approved.forEach(r => {
      if (!subjectsMap.has(r.subject_code)) subjectsMap.set(r.subject_code, { code: r.subject_code, name: r.subject_name });
    });

    const subjectsArray = Array.from(subjectsMap.values());
    setUniqueSubjects(subjectsArray);
    if (subjectsArray.length > 0 && !selectedSubject) setSelectedSubject(JSON.stringify(subjectsArray[0]));

    const grouped = approved.reduce((acc: any, curr: any) => {
      const code = curr.subject_code;
      if (!acc[code]) acc[code] = { subject_name: curr.subject_name, subject_code: curr.subject_code, Notes: [], PYQs: [], Assignments: [] };
      if (acc[code][curr.resource_type]) acc[code][curr.resource_type].push(curr);
      return acc;
    }, {});

    setGroupedVault(Object.values(grouped));
  }

  async function fetchGarudaData() {
    const { data: langData, error: langError } = await supabase.from("garuda_languages").select("*").order("name");
    if (langError) console.error("Garuda Lang Error:", langError);
    if (langData) setGarudaLanguages(langData);
  }

  const approveCjdPost = async (id: string, isCodeRed: boolean) => {
    const loadingToast = toast.loading("Approving transmission...");
    const reply = adminReplies[id] || null;
    const { error } = await supabase.from("cjd_posts").update({ is_approved: true, admin_reply: reply }).eq("id", id);

    if (error) {
      toast.error("Failed to approve.", { id: loadingToast });
    } else {
      toast.success("Post is now live.", { id: loadingToast });
      fetchCjdData();

      if (isCodeRed) triggerWhatsAppBlast(id, reply);
    }
  };

  const triggerWhatsAppBlast = (id: string, reply: string | null = null) => {
    const post = pendingCjdPosts.find(p => p.id === id) || liveCjdPosts.find(p => p.id === id);
    if (!post) return;

    let text = `🚨 *EXAMS COMMUNITY UPDATE* 🚨\n\n"${post.content}"\n`;
    if (reply || post.admin_reply) text += `\n🛡️ *Admin Verified:* ${reply || post.admin_reply}\n`;
    text += `\n_Join the network at exams-community.vercel.app/cjd_`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const rejectCjdPost = async (id: string) => {
    const loadingToast = toast.loading("Scrubbing from database...");
    const { error } = await supabase.from("cjd_posts").delete().eq("id", id);
    if (error) toast.error("Failed to delete.", { id: loadingToast });
    else { toast.success("Scrubbed.", { id: loadingToast }); fetchCjdData(); }
  };

  // --- NEW: Universal Custom Key Forge Logic ---
  const forgeNewKey = async () => {
    setIsForging(true);
    // Use custom key if typed, otherwise generate a secure NEXUS random key
    const finalKey = customKey.trim() || `NEXUS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { error } = await supabase.from("garuda_invites").insert([{ code: finalKey }]);
    if (error) {
      if (error.code === '23505') toast.error("This exact key already exists!");
      else toast.error(`Database Error: ${error.message}`);
    } else {
      toast.success(`Key ${finalKey} forged securely!`, { icon: '🔐' });
      setCustomKey("");
      fetchKeys();
    }
    setIsForging(false);
  };

  const copyToClipboard = (code: string) => { navigator.clipboard.writeText(code); toast.success("Key copied to clipboard!"); };
  const deleteKey = async (code: string) => {
    const { error } = await supabase.from("garuda_invites").delete().eq("code", code);
    if (error) toast.error("Failed to delete key.");
    else { toast.success("Key destroyed."); fetchKeys(); }
  };

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuntimeSlug) return toast.error("Select a compiler runtime.");
    const runtime = PISTON_RUNTIMES.find(r => r.slug === selectedRuntimeSlug);
    if (!runtime) return;
    if (garudaLanguages.some(l => l.slug === runtime.slug)) return toast.error(`${runtime.name} is already active in GARUDA.`);
    const loadingToast = toast.loading(`Provisioning ${runtime.name} Arena...`);
    const { error } = await supabase.from("garuda_languages").insert([{ name: runtime.name, slug: runtime.slug, icon_url: runtime.icon_url }]);
    if (error) toast.error("Error: " + error.message, { id: loadingToast });
    else { toast.success(`${runtime.name} added to GARUDA!`, { id: loadingToast }); setSelectedRuntimeSlug(""); fetchGarudaData(); }
  };

  const openArenaManager = (lang: any) => { setActiveArenaLang(lang); setIsArenaModalOpen(true); };

  const handleAddArenaNode = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Deploying to Arena...");
    let pubTests = "[]", privTests = "[]", finalXP = 0;
    if (arenaForm.type === "challenge") {
      try {
        pubTests = JSON.stringify(JSON.parse(arenaForm.public_test_cases));
        privTests = JSON.stringify(JSON.parse(arenaForm.private_test_cases));
        finalXP = Number(arenaForm.xp_reward);
      } catch (err) { return toast.error("Invalid JSON format in test cases.", { id: loadingToast }); }
    }
    const materialsJson = arenaForm.type === "material" || arenaForm.material_url ? JSON.stringify([{ title: arenaForm.title + " Reference", url: arenaForm.material_url }]) : "[]";
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("garuda_questions").insert([{
      language_id: activeArenaLang.id, title: arenaForm.title, difficulty: arenaForm.difficulty, description: arenaForm.description, xp_reward: finalXP, learning_materials: JSON.parse(materialsJson), public_test_cases: JSON.parse(pubTests), private_test_cases: JSON.parse(privTests), created_by: session?.user?.id
    }]);
    if (error) toast.error("Failed to deploy: " + error.message, { id: loadingToast });
    else { toast.success("Successfully deployed to Arena!", { id: loadingToast }); setIsArenaModalOpen(false); setArenaForm({ ...arenaForm, title: "", description: "", material_url: "" }); }
  };

  const handleApprove = async (item: any) => {
    const loadingToast = toast.loading("Approving to Vault...");
    const { error } = await supabase.from("resources").update({ is_approved: true }).eq("id", item.id);
    if (error) toast.error(error.message, { id: loadingToast });
    else { toast.success("Resource Live!", { id: loadingToast }); fetchVaultData(); }
  };

  const startEditing = (resource: any) => { setEditingId(resource.id); setEditData({ ...resource }); };

  const saveEdits = async () => {
    const loadingToast = toast.loading("Saving...");
    const finalBranch = (editData.target_semester === "1" || editData.target_semester === "2") ? "Common First Year" : editData.target_branch;

    const { error } = await supabase.from("resources").update({
      subject_name: editData.subject_name,
      subject_code: editData.subject_code,
      target_semester: editData.target_semester,
      target_branch: finalBranch,
      title: editData.title,
      drive_link: editData.drive_link,
      resource_type: editData.resource_type
    }).eq("id", editingId);

    if (error) toast.error(error.message, { id: loadingToast });
    else { toast.success("Saved.", { id: loadingToast }); setEditingId(null); fetchVaultData(); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Publishing...");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    let finalCode = uploadData.code; let finalName = uploadData.name;
    if (uploadMode === "existing") { const parsed = JSON.parse(selectedSubject); finalCode = parsed.code; finalName = parsed.name; }

    const finalBranch = (uploadData.target_semester === "1" || uploadData.target_semester === "2") ? "Common First Year" : uploadData.target_branch;

    const { error } = await supabase.from("resources").insert([{ subject_name: finalName, subject_code: finalCode, resource_type: uploadData.type, title: uploadData.title, drive_link: uploadData.link, is_approved: true, submitted_by: session.user.id, target_semester: uploadData.target_semester, target_branch: finalBranch }]);
    if (error) toast.error("Upload failed: " + error.message, { id: loadingToast });
    else { toast.success("Published!", { id: loadingToast }); setUploadData({ ...uploadData, title: "", link: "" }); fetchVaultData(); }
  };

  const handleDelete = async (id: string, isRejection = false) => {
    if (!window.confirm(`Are you sure?`)) return;
    const loadingToast = toast.loading("Deleting...");
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) toast.error("Failed to delete.", { id: loadingToast });
    else { toast.success(isRejection ? "Rejected." : "Deleted.", { id: loadingToast }); fetchVaultData(); }
  };

  const availableRuntimes = PISTON_RUNTIMES.filter(r => !garudaLanguages.some(gl => gl.slug === r.slug));

  const renderEditForm = () => (
    <div className="space-y-4 w-full bg-white dark:bg-black/60 border border-gray-200 dark:border-white/10 p-4 rounded-xl mt-2 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject Name (Locked)</span>
          <input type="text" disabled value={editData.subject_name} className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject Code (Locked)</span>
          <input type="text" disabled value={editData.subject_code} className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Semester</span>
          <select value={editData.target_semester} onChange={e => {
            const sem = e.target.value;
            setEditData({ ...editData, target_semester: sem, target_branch: (sem === "1" || sem === "2") ? "Common First Year" : (editData.target_branch === "Common First Year" ? "CSE-AI" : editData.target_branch) });
          }} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n.toString()}>{n}</option>)}
          </select>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Branch</span>
          <select disabled={editData.target_semester === "1" || editData.target_semester === "2"} value={editData.target_branch} onChange={e => setEditData({ ...editData, target_branch: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white disabled:opacity-50">
            {(editData.target_semester === "1" || editData.target_semester === "2") ? (
              <option value="Common First Year">Common First Year</option>
            ) : (
              <>
                <option value="CSE-AI">CSE-AI</option><option value="CSE CORE">CSE CORE</option><option value="CSE-CS">CSE-CS</option><option value="CSE-IoT">CSE-IoT</option><option value="Other">Other</option>
              </>
            )}
          </select>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Type</span>
          <select value={editData.resource_type} onChange={e => setEditData({ ...editData, resource_type: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white">
            <option value="Notes">Notes</option><option value="PYQs">PYQs</option><option value="Assignments">Assignments</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Material Title</span><input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white" /></div>
        <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Drive Link</span><input type="url" value={editData.drive_link} onChange={e => setEditData({ ...editData, drive_link: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none dark:text-white" /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">CANCEL</button>
        <button onClick={saveEdits} className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"><Save className="w-3.5 h-3.5" /> SAVE EDITS</button>
      </div>
    </div>
  );

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300 pb-20">

        <nav className="border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">BACK TO DASHBOARD</span>
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
            <p className="text-gray-500 text-sm">Manage the EXAMS community vault and the GARUDA coding arena.</p>
          </div>

          <div className="flex bg-gray-100 dark:bg-black/50 rounded-2xl p-1.5 mb-12 max-w-2xl mx-auto md:mx-0 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveMainTab("vault")} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2.5 py-3 rounded-xl transition-all ${activeMainTab === "vault" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none text-blue-500 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}><Box className="w-4 h-4" /> Vault HQ</button>
            <button onClick={() => setActiveMainTab("garuda")} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2.5 py-3 rounded-xl transition-all ${activeMainTab === "garuda" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none text-blue-500 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}><Terminal className="w-4 h-4" /> GARUDA HQ</button>
            <button onClick={() => setActiveMainTab("keys")} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2.5 py-3 rounded-xl transition-all ${activeMainTab === "keys" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none text-blue-500 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}><Key className="w-4 h-4" /> Key Forge</button>
            <button onClick={() => setActiveMainTab("cjd")} className={`flex-1 min-w-[120px] flex items-center justify-center gap-2.5 py-3 rounded-xl transition-all ${activeMainTab === "cjd" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none text-blue-500 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}><MessageSquareDashed className="w-4 h-4" /> CJD Queue</button>
          </div>

          <AnimatePresence mode="wait">
            {/* VAULT HQ */}
            {activeMainTab === "vault" && (
              <motion.div key="vault-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {pendingResources.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-12">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-600 dark:text-yellow-500"><Check className="w-5 h-5" /> Pending Approvals ({pendingResources.length})</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {pendingResources.map(item => (
                        <div key={item.id} className="bg-yellow-50 dark:bg-[#121212] border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-6 shadow-sm">
                          {editingId === item.id ? renderEditForm() : (
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-3"><span className="text-xs font-black text-blue-500 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-2 py-1 rounded-md">{item.subject_code}</span><span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">{item.resource_type}</span><span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-500/20">Sem {item.target_semester}</span><span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-500/20">{item.target_branch}</span></div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.subject_name}</p>
                                <a href={item.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:underline">Verify Drive Link ↗</a>
                              </div>
                              <div className="flex sm:flex-col gap-2 justify-end sm:min-w-[120px]"><button onClick={() => handleApprove(item)} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"><Check className="w-4 h-4" /> APPROVE</button><button onClick={() => startEditing(item)} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"><Edit2 className="w-4 h-4" /> EDIT</button><button onClick={() => handleDelete(item.id, true)} className="flex-1 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"><Trash2 className="w-4 h-4" /> REJECT</button></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-sm">
                      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><UploadCloud className="w-5 h-5 text-gray-400" /> Direct Upload</h2>
                      <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 mb-6"><button onClick={() => setUploadMode("existing")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "existing" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>Existing Subject</button><button onClick={() => setUploadMode("new")} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${uploadMode === "new" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>New Subject</button></div>
                      <form onSubmit={handleUpload} className="space-y-4">
                        {uploadMode === "existing" ? (uniqueSubjects.length > 0 ? (<select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">{uniqueSubjects.map(sub => <option key={sub.code} value={JSON.stringify(sub)}>{sub.code} - {sub.name}</option>)}</select>) : <p className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded-lg">No subjects exist yet.</p>) : (<><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Name" required value={uploadData.name} onChange={e => setUploadData({ ...uploadData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" /><input type="text" placeholder="Code" required value={uploadData.code} onChange={e => setUploadData({ ...uploadData, code: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" /></div><div className="grid grid-cols-2 gap-4"><select value={uploadData.target_semester} onChange={e => {
                          const sem = e.target.value;
                          setUploadData({ ...uploadData, target_semester: sem, target_branch: (sem === "1" || sem === "2") ? "Common First Year" : (uploadData.target_branch === "Common First Year" ? "CSE-AI" : uploadData.target_branch) });
                        }} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300">{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n.toString()}>Sem {n}</option>)}</select><select disabled={uploadData.target_semester === "1" || uploadData.target_semester === "2"} value={uploadData.target_branch} onChange={e => setUploadData({ ...uploadData, target_branch: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300 disabled:opacity-50">{(uploadData.target_semester === "1" || uploadData.target_semester === "2") ? (<option value="Common First Year">Common 1st Year</option>) : (<><option value="CSE-AI">CSE-AI</option><option value="CSE CORE">CSE CORE</option><option value="CSE-CS">CSE-CS</option><option value="CSE-IoT">CSE-IoT</option><option value="Other">Other</option></>)}</select></div></>)}
                        <select value={uploadData.type} onChange={e => setUploadData({ ...uploadData, type: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-gray-300"><option value="Notes">Notes</option><option value="PYQs">PYQs</option><option value="Assignments">Assignments</option></select><input type="text" placeholder="Title (e.g., Unit 1 Notes)" required value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" /><input type="url" placeholder="Drive Link" required value={uploadData.link} onChange={e => setUploadData({ ...uploadData, link: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white" /><button type="submit" disabled={uploadMode === 'existing' && uniqueSubjects.length === 0} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl flex justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"><Plus className="w-5 h-5" /> Publish Instantly</button>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 md:p-8 rounded-3xl shadow-sm min-h-[600px]">
                      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><FileText className="w-5 h-5 text-gray-400" /> Live Vault Organization</h2>
                      <div className="space-y-4">{groupedVault.length === 0 ? <p className="text-gray-500 text-center py-12">The vault is currently empty.</p> : groupedVault.map((subject) => (
                        <div key={subject.subject_code} className="border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/40 rounded-2xl overflow-hidden">
                          <button onClick={() => setActiveSubjectTab(activeSubjectTab === subject.subject_code ? null : subject.subject_code)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <div className="text-left"><p className="text-xs font-bold text-gray-500 mb-1">{subject.subject_code}</p><p className="font-semibold text-gray-900 dark:text-gray-200">{subject.subject_name}</p></div>
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
                                            <div key={item.id}>
                                              {editingId === item.id ? renderEditForm() : (
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-black/60 p-3 rounded-xl border border-gray-200 dark:border-white/5 gap-2">
                                                  <a href={item.drive_link} target="_blank" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white truncate flex-1">{item.title}</a>
                                                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                                    {(item.flags_count || 0) > 0 && (<span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10 px-2 py-1 rounded-md font-bold animate-pulse" title="Reported as broken"><Flag className="w-3 h-3" /> {item.flags_count} Reports</span>)}
                                                    <span className="flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-400/10 px-2 py-1 rounded-md font-bold" title="Total Views"><Eye className="w-3 h-3" /> {item.views || 0}</span>
                                                    <button onClick={() => startEditing(item)} className="text-gray-400 hover:text-blue-500 transition-colors p-1"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                                  </div>
                                                </div>
                                              )}
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
                      ))}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* GARUDA HQ */}
            {activeMainTab === "garuda" && (
              <motion.div key="garuda-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-sm">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><Zap className="w-5 h-5 text-gray-400" /> Provision Arena</h2>
                    <form onSubmit={handleAddLanguage} className="space-y-4">
                      <div className="relative">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Compiler Runtime</label>
                        <select value={selectedRuntimeSlug} onChange={e => setSelectedRuntimeSlug(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none text-gray-900 dark:text-white appearance-none">
                          <option value="" disabled>Select Verified Engine...</option>
                          {availableRuntimes.map(r => <option key={r.slug} value={r.slug}>{r.name} (/{r.slug})</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-10 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      <button type="submit" disabled={!selectedRuntimeSlug} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex justify-center gap-2 transition-colors"><Plus className="w-5 h-5" /> Deploy Arena Server</button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 md:p-8 rounded-3xl shadow-sm min-h-[400px]">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white"><Layers3 className="w-5 h-5 text-gray-400" /> Active Coding Arenas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {garudaLanguages.length === 0 ? (
                        <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                          <Terminal className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">No engines deployed for GARUDA.</p>
                        </div>
                      ) : garudaLanguages.map(lang => (
                        <div key={lang.id} className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 group transition-colors hover:border-blue-500/30">
                          {lang.icon_url ? <img src={lang.icon_url} alt={lang.name} className="w-12 h-12 rounded-lg" /> : <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center"><Terminal className="w-6 h-6 text-gray-400" /></div>}
                          <div><p className="font-bold text-gray-900 dark:text-white">{lang.name}</p><p className="text-xs text-blue-500 dark:text-gray-500 font-mono">/{lang.slug}</p></div>
                          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5"><button onClick={() => openArenaManager(lang)} title="Add Challenges & Materials" className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"><Plus className="w-3.5 h-3.5" /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isArenaModalOpen && activeArenaLang && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative mt-20 md:mt-0">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                          <div><h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Code2 className="text-blue-500" /> Configure {activeArenaLang.name} Module</h3></div>
                          <button onClick={() => setIsArenaModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 mb-6 border border-gray-200 dark:border-white/5">
                          <button onClick={() => setArenaForm({ ...arenaForm, type: "challenge" })} className={`flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg transition-colors ${arenaForm.type === "challenge" ? "bg-white dark:bg-white/10 font-bold text-blue-600 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}><Terminal className="w-4 h-4" /> Coding Challenge</button>
                          <button onClick={() => setArenaForm({ ...arenaForm, type: "material" })} className={`flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg transition-colors ${arenaForm.type === "material" ? "bg-white dark:bg-white/10 font-bold text-blue-600 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}><BookOpen className="w-4 h-4" /> Study Material</button>
                        </div>
                        <form onSubmit={handleAddArenaNode} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Module Title</label><input type="text" required value={arenaForm.title} onChange={e => setArenaForm({ ...arenaForm, title: e.target.value })} placeholder="e.g., Two Sum" className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Track / Difficulty</label><select value={arenaForm.difficulty} onChange={e => setArenaForm({ ...arenaForm, difficulty: e.target.value })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"><option value="Fundamentals">Fundamentals</option><option value="DSA & Logic">DSA & Logic</option><option value="Advanced & System">Advanced & System</option></select></div>
                          </div>
                          <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Detailed Description</label><textarea required rows={3} value={arenaForm.description} onChange={e => setArenaForm({ ...arenaForm, description: e.target.value })} placeholder="Explain the concept or problem..." className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none" /></div>
                          {arenaForm.type === "challenge" ? (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">XP Reward</label><input type="number" required min="0" value={arenaForm.xp_reward} onChange={e => setArenaForm({ ...arenaForm, xp_reward: parseInt(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-blue-600 dark:text-blue-400 font-bold text-sm focus:border-blue-500 focus:outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Reference Material URL (Optional)</label><input type="url" value={arenaForm.material_url} onChange={e => setArenaForm({ ...arenaForm, material_url: e.target.value })} placeholder="Link to documentation/PDF" className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1 flex justify-between">Public Test Cases <span>(JSON Array)</span></label><textarea required rows={4} value={arenaForm.public_test_cases} onChange={e => setArenaForm({ ...arenaForm, public_test_cases: e.target.value })} className="w-full font-mono bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-700 dark:text-gray-300 text-xs focus:border-blue-500 focus:outline-none" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1 flex justify-between text-yellow-600 dark:text-yellow-500">Hidden Test Cases <span>(JSON Array)</span></label><textarea required rows={4} value={arenaForm.private_test_cases} onChange={e => setArenaForm({ ...arenaForm, private_test_cases: e.target.value })} className="w-full font-mono bg-yellow-50/50 dark:bg-black/50 border border-yellow-200 dark:border-yellow-500/20 rounded-xl px-4 py-3 text-gray-700 dark:text-gray-300 text-xs focus:border-yellow-500 focus:outline-none" /></div>
                              </div>
                            </>
                          ) : (
                            <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">PDF / Reference URL</label><input type="url" required value={arenaForm.material_url} onChange={e => setArenaForm({ ...arenaForm, material_url: e.target.value })} placeholder="Link to documentation, YouTube video, or PDF" className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none" /></div>
                          )}
                          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-4 shadow-lg shadow-blue-500/20">Deploy Node to {activeArenaLang.name}</button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* KEY FORGE HQ */}
            {activeMainTab === "keys" && (
              <motion.div key="keys-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-500" /> Universal Key Forge
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">Generate single-use access codes for GARUDA&lt;sh&gt; and CHHODO JAANE DO ;)</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Custom Key (Optional)"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                        className="w-full sm:w-56 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white uppercase font-mono"
                      />
                      <button onClick={forgeNewKey} disabled={isForging} className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap">
                        {isForging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        FORGE KEY
                      </button>
                    </div>
                  </div>
                  {isKeysLoading ? (
                    <div className="flex items-center justify-center py-12 text-blue-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
                  ) : accessKeys.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl"><Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" /><p className="text-gray-500 font-medium">No keys exist in the database.</p><p className="text-xs text-gray-400 mt-1">Forge a new key to grant access.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accessKeys.map((k) => (
                        <div key={k.code} className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
                          <div className={`absolute top-0 left-0 w-1 h-full ${k.is_used ? "bg-red-500" : "bg-green-500"}`} />
                          <div className="flex justify-between items-start mb-4 pl-2">
                            <div><div className="text-[10px] font-bold tracking-widest text-gray-400 mb-1">ACCESS CODE</div><div className="font-mono text-lg font-bold text-gray-900 dark:text-white tracking-wider truncate w-40" title={k.code}>{k.code}</div></div>
                            {!k.is_used && <button onClick={() => copyToClipboard(k.code)} className="text-gray-400 hover:text-blue-500 transition-colors bg-white dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10 shrink-0"><Copy className="w-4 h-4" /></button>}
                          </div>
                          <div className="flex items-center justify-between pl-2 mt-2 pt-4 border-t border-gray-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 text-xs font-bold">{k.is_used ? <span className="flex items-center gap-1 text-red-500 dark:text-red-400"><XCircle className="w-3.5 h-3.5" /> CLAIMED</span> : <span className="flex items-center gap-1 text-green-500 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> AVAILABLE</span>}</div>
                            <button onClick={() => deleteKey(k.code)} className="text-[10px] text-gray-500 hover:text-red-500 font-bold transition-colors uppercase tracking-wider">Destroy</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- CJD QUEUE --- */}
            {activeMainTab === "cjd" && (
              <motion.div key="cjd-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <MessageSquareDashed className="w-5 h-5" /> Broadcast Network
                    </h2>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 mb-6 border border-gray-200 dark:border-white/5 w-fit">
                    <button onClick={() => setCjdTab("pending")} className={`px-6 py-2 rounded-lg text-sm transition-colors ${cjdTab === "pending" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none text-blue-600 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>
                      Pending ({pendingCjdPosts.length})
                    </button>
                    <button onClick={() => setCjdTab("live")} className={`px-6 py-2 rounded-lg text-sm transition-colors ${cjdTab === "live" ? "bg-white dark:bg-white/10 font-bold shadow-sm dark:shadow-none text-green-600 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}>
                      Live Active ({liveCjdPosts.length})
                    </button>
                  </div>

                  {cjdTab === "pending" ? (
                    pendingCjdPosts.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl bg-white dark:bg-white/5">
                        <Ghost className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No pending transmissions.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {pendingCjdPosts.map(post => {
                          const timeRemaining = Math.max(0, new Date(post.expires_at).getTime() - new Date().getTime());
                          const hoursLeft = Math.ceil(timeRemaining / (1000 * 60 * 60));

                          return (
                            <div key={post.id} className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                  {post.is_ghost ? (
                                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md flex items-center gap-1.5"><Ghost className="w-3.5 h-3.5" /> [GHOST_{post.id.substring(0, 4)}]</span>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">{post.profiles?.full_name} <span className="opacity-50 px-1">•</span> {post.profiles?.branch}</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3" /> {hoursLeft}h requested</span>
                              </div>

                              {post.image_url && (
                                <div className="mb-4 p-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl w-max">
                                  <img src={post.image_url} alt="CJD Attached Snap" className="max-h-[300px] rounded-lg object-cover" />
                                </div>
                              )}

                              <p className="text-gray-900 dark:text-gray-200 text-lg leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>

                              <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 mb-6">
                                <label className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Attach Admin Context Tag (Optional)</label>
                                <textarea
                                  value={adminReplies[post.id] || ""}
                                  onChange={e => setAdminReplies({ ...adminReplies, [post.id]: e.target.value })}
                                  placeholder="Provide official confirmation or context here..."
                                  className="w-full bg-white dark:bg-black/50 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 dark:text-white resize-none"
                                  rows={2}
                                />
                              </div>

                              <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-gray-100 dark:border-white/5 pt-6">
                                <button onClick={() => rejectCjdPost(post.id)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors">
                                  <Trash2 className="w-4 h-4" /> Reject & Scrub
                                </button>
                                <button onClick={() => approveCjdPost(post.id, false)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-white dark:bg-white/10 dark:hover:bg-white/20 transition-colors">
                                  <Check className="w-4 h-4" /> Approve to Feed
                                </button>
                                <button onClick={() => approveCjdPost(post.id, true)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-green-500 hover:bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all">
                                  <Share2 className="w-4 h-4" /> Approve & WhatsApp Blast
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    liveCjdPosts.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl bg-white dark:bg-white/5">
                        <CheckCircle2 className="w-10 h-10 text-green-300 dark:text-green-600 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No active broadcasts running.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {liveCjdPosts.map(post => {
                          const timeRemaining = Math.max(0, new Date(post.expires_at).getTime() - new Date().getTime());
                          const hoursLeft = Math.ceil(timeRemaining / (1000 * 60 * 60));

                          return (
                            <div key={post.id} className="bg-white dark:bg-black/40 border border-green-200 dark:border-green-500/20 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                              <div className="flex justify-between items-start mb-3 pl-2">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                  {post.is_ghost ? `[GHOST_${post.id.substring(0, 4)}]` : post.profiles?.full_name?.split(" ")[0]}
                                </span>
                                <span className="text-[10px] font-mono text-green-600 dark:text-green-400 font-bold">{hoursLeft}h left</span>
                              </div>

                              {post.image_url && (
                                <div className="mb-3 pl-2">
                                  <img src={post.image_url} alt="CJD Attached Snap" className="max-h-[200px] rounded-lg object-cover border border-gray-100 dark:border-white/10" />
                                </div>
                              )}

                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 pl-2 line-clamp-3">{post.content}</p>
                              <div className="flex items-center justify-between pl-2 pt-4 border-t border-gray-100 dark:border-white/5">
                                <button onClick={() => triggerWhatsAppBlast(post.id)} className="text-[10px] flex items-center gap-1.5 font-bold text-green-600 hover:text-green-700 transition-colors uppercase tracking-wider">
                                  <Share2 className="w-3.5 h-3.5" /> Re-Broadcast
                                </button>
                                <button onClick={() => rejectCjdPost(post.id)} className="text-[10px] flex items-center gap-1.5 font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider">
                                  <Trash2 className="w-3.5 h-3.5" /> Revoke
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </ProtectedRoute>
  );
}