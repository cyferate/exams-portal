"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ShieldCheck, Plus, UploadCloud, Trash2, FileText, Eye } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminPortal() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]); // New state for holding vault items

  // Form States
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [resourceType, setResourceType] = useState("Notes");
  const [resourceTitle, setResourceTitle] = useState("");
  const [driveLink, setDriveLink] = useState("");

  useEffect(() => {
    async function initAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.location.href = "/auth";

      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (data?.is_admin) {
        setIsAdmin(true);
        fetchResources(); // Fetch items if admin
      }
      setLoading(false);
    }
    initAdmin();
  }, []);

  async function fetchResources() {
    const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (data) setResources(data);
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Uploading to vault...");
    
    const { error } = await supabase.from("resources").insert([
      { subject_name: subjectName, subject_code: subjectCode, resource_type: resourceType, title: resourceTitle, drive_link: driveLink }
    ]);

    if (error) {
      toast.error("Upload failed: " + error.message, { id: loadingToast });
    } else {
      toast.success("Resource added successfully!", { id: loadingToast });
      setResourceTitle(""); setDriveLink(""); // Clear specific fields
      fetchResources(); // Refresh the list instantly
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete.");
    } else {
      toast.success("Resource permanently deleted.");
      setResources(resources.filter(r => r.id !== id)); // Remove from UI instantly
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex justify-center items-center text-white">Checking credentials...</div>;
  if (!isAdmin) return <div className="min-h-screen bg-[#0a0a0a] text-red-500 flex justify-center items-center font-bold text-2xl">ACCESS DENIED.</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-gray-300" />
            <h1 className="text-3xl font-bold">Admin Control Center</h1>
          </div>
          <Link href="/dashboard" className="text-sm border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* UPLOAD PANEL */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md h-fit">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-gray-400" /> Upload Resource</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <input type="text" placeholder="Subject Name" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
              <input type="text" placeholder="Subject Code" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
              <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                <option value="Notes">Notes</option>
                <option value="PYQs">PYQs</option>
                <option value="Assignments">Assignments</option>
              </select>
              <input type="text" placeholder="Title (e.g., Unit 1)" required value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
              <input type="url" placeholder="Google Drive Link" required value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
              <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-4"><Plus className="w-5 h-5" /> Publish</button>
            </form>
          </motion.div>

          {/* MANAGE VAULT PANEL */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-400"/> Manage Vault</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {resources.length === 0 ? <p className="text-gray-500 text-sm">No resources uploaded yet.</p> : 
                resources.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
                    
                    <div className="overflow-hidden pr-4">
                      <p className="text-sm font-bold text-gray-200 truncate">{item.subject_code} - {item.title}</p>
                      <p className="text-xs text-gray-500">{item.resource_type}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      
                      <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md font-bold" title="Total Views">
                        <Eye className="w-3 h-3"/>
                        {item.views || 0}
                      </div>
                      
                      
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>

                  </div>
                ))
              }
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}