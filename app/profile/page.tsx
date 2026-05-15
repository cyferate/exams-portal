"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { User, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    id: "",
    full_name: "",
    roll_no: "",
    semester: "1",
    branch: "CSE CORE-A",
    passing_year: "",
  });
  
  // NEW: State for custom branch
  const [customBranch, setCustomBranch] = useState("");
  const predefinedBranches = ["CSE CORE-A", "CSE CORE-B", "CSE-AI", "CSE-CS", "CSE-IoT"];

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      
      if (data) {
        const fetchedBranch = data.branch || "CSE CORE-A";
        const isPredefined = predefinedBranches.includes(fetchedBranch);

        setProfileData({
          id: data.id,
          full_name: data.full_name || "",
          roll_no: data.roll_no || "",
          semester: data.semester || "1",
          branch: isPredefined ? fetchedBranch : "Other",
          passing_year: data.passing_year || "",
        });

        // If their saved branch isn't in the standard list, populate the custom textbox
        if (!isPredefined) {
          setCustomBranch(fetchedBranch);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // NEW: Branch Validation before saving
    const finalBranch = profileData.branch === "Other" ? customBranch : profileData.branch;
    if (profileData.branch === "Other" && !customBranch.trim()) {
      toast.error("Please specify your custom branch.");
      return;
    }

    setSaving(true);
    const savingToast = toast.loading("Updating profile...");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileData.full_name,
        semester: profileData.semester,
        branch: finalBranch,
        passing_year: profileData.passing_year,
      })
      .eq("id", profileData.id);

    if (error) {
      toast.error(error.message, { id: savingToast });
    } else {
      toast.success("Profile updated securely.", { id: savingToast });
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500">DECRYPTING PROFILE...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-gray-300" />
              <h1 className="text-3xl font-bold">Your Identity</h1>
            </div>
            <Link href="/dashboard" className="flex items-center gap-2 text-sm border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Vault
            </Link>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
            <form onSubmit={handleSave} className="space-y-6">
              
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Full Name</label>
                <input type="text" value={profileData.full_name} onChange={(e) => setProfileData({...profileData, full_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" required />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Roll Number (Immutable)</label>
                <input type="text" value={profileData.roll_no} disabled className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Semester</label>
                  <select value={profileData.semester} onChange={(e) => setProfileData({...profileData, semester: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Semester {num}</option>)}
                  </select>
                </div>
                
                {/* NEW: Dynamic Branch Dropdown */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Branch</label>
                  <select 
                    value={profileData.branch} 
                    onChange={(e) => setProfileData({...profileData, branch: e.target.value})} 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300"
                  >
                    <option value="CSE CORE-A">CSE CORE-A</option>
                    <option value="CSE CORE-B">CSE CORE-B</option>
                    <option value="CSE-AI">CSE-AI</option>
                    <option value="CSE-CS">CSE-CS</option>
                    <option value="CSE-IoT">CSE-IoT</option>
                    <option value="Other">Other...</option>
                  </select>

                  {/* Smoothly reveal custom text box if "Other" is selected */}
                  {profileData.branch === "Other" && (
                    <motion.input 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      type="text" 
                      placeholder="Enter your branch manually" 
                      required 
                      value={customBranch} 
                      onChange={(e) => setCustomBranch(e.target.value)} 
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-white" 
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Passing Year</label>
                <input type="text" value={profileData.passing_year} onChange={(e) => setProfileData({...profileData, passing_year: e.target.value})} placeholder="e.g., 2027" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" />
              </div>

              <button type="submit" disabled={saving} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-4">
                <Save className="w-5 h-5" /> Save Changes
              </button>

            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}