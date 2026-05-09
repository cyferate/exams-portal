"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ShieldCheck, Plus, UploadCloud } from "lucide-react";
import Link from "next/link";

export default function AdminPortal() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form States
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [resourceType, setResourceType] = useState("Notes");
  const [resourceTitle, setResourceTitle] = useState(""); // <-- NEW STATE
  const [driveLink, setDriveLink] = useState("");

  useEffect(() => {
    async function checkAdminStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.location.href = "/auth";

      const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (data?.is_admin) setIsAdmin(true);
      setLoading(false);
    }
    checkAdminStatus();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("resources").insert([
      { 
        subject_name: subjectName, 
        subject_code: subjectCode, 
        resource_type: resourceType, 
        title: resourceTitle, // <-- SAVING THE TITLE
        drive_link: driveLink 
      }
    ]);

    if (error) alert("Error uploading: " + error.message);
    else {
      alert("Resource successfully added to the vault!");
      setResourceTitle(""); setDriveLink(""); // Clear specific fields for faster multi-uploads
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex justify-center items-center text-white">Checking credentials...</div>;
  if (!isAdmin) return <div className="min-h-screen bg-[#0a0a0a] text-red-500 flex justify-center items-center font-bold text-2xl">ACCESS DENIED.</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-gray-300" />
            <h1 className="text-3xl font-bold">Admin Control Center</h1>
          </div>
          <Link href="/dashboard" className="text-sm border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
            Back to Dashboard
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-gray-400" /> Upload New Resource
          </h2>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" placeholder="Subject Name (e.g., Mathematics III)" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
              <input type="text" placeholder="Subject Code (e.g., MAT-203)" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                <option value="Notes">Notes</option>
                <option value="PYQs">PYQs</option>
                <option value="Assignments">Assignments</option>
              </select>
              <input type="text" placeholder="Title (e.g., Unit 1, 2023 End-Sem)" required value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
            </div>

            <input type="url" placeholder="Google Drive Link (Anyone with link can view)" required value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />

            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-4">
              <Plus className="w-5 h-5" /> Publish to EXAMS Vault
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}