"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [semester, setSemester] = useState("1");
  const [branch, setBranch] = useState("CSE CORE-A");
  const [customBranch, setCustomBranch] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      const rollNoRegex = /^\d{12}$/; 
      if (!rollNoRegex.test(rollNo)) {
        toast.error("Invalid Roll Number. Must be exactly 12 digits.");
        return;
      }

      const finalBranch = branch === "Other" ? customBranch : branch;
      if (branch === "Other" && !customBranch) {
        toast.error("Please specify your custom branch.");
        return;
      }

      const loadingToast = toast.loading("Forging your access key...");

      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: { 
              full_name: fullName, 
              roll_no: rollNo,
              semester: semester,
              branch: finalBranch
            }
        }
      });
      
      if (error) toast.error(error.message, { id: loadingToast });
      else {
        toast.success("Welcome to the Vault.", { id: loadingToast });
        window.location.href = "/dashboard"; 
      }

    } else {
      const loadingToast = toast.loading("Accessing Vault...");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) toast.error(error.message, { id: loadingToast });
      else {
        toast.success("Welcome Back.", { id: loadingToast });
        window.location.href = "/dashboard"; 
      }
    }
  };

  // NEW: Google 1-Click Auth Function
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <h2 className="text-3xl font-bold mb-2">{isSignUp ? "Join EXAMS" : "Welcome Back"}</h2>
        <p className="text-gray-400 mb-8 text-sm">Strictly for Gurugram University Students.</p>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <input type="text" placeholder="Full Name" required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" onChange={(e) => setFullName(e.target.value)} />
              <input type="text" placeholder="Roll Number (12 Digits)" required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" onChange={(e) => setRollNo(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-4">
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                  <option disabled value="">Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Sem {num}</option>)}
                </select>

                <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 text-gray-300">
                  <option value="CSE CORE-A">CSE CORE-A</option>
                  <option value="CSE CORE-B">CSE CORE-B</option>
                  <option value="CSE-AI">CSE-AI</option>
                  <option value="CSE-CS">CSE-CS</option>
                  <option value="CSE-IoT">CSE-IoT</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {branch === "Other" && (
                <input type="text" placeholder="Enter your branch manually" required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" onChange={(e) => setCustomBranch(e.target.value)} />
              )}
            </>
          )}
          
          <input type="email" placeholder="University Email" required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30" onChange={(e) => setPassword(e.target.value)} />
          
          <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors mt-4">
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* NEW: Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="px-4 text-xs text-gray-500 font-medium">OR</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* NEW: Google Auth Button */}
        <button 
          onClick={handleGoogleLogin} 
          type="button" 
          className="w-full flex items-center justify-center gap-3 bg-black/50 border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            <path d="M1 1h22v22H1z" fill="none"/>
          </svg>
          Continue with Google
        </button>

        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center text-sm text-gray-500 mt-6 hover:text-gray-300 transition-colors">
          {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
        </button>
      </motion.div>
    </div>
  );
}