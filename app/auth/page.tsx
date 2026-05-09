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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      // 1. THE BOUNCER: Check Roll Number Format
      const rollNoRegex = /^\d{12}$/; 
      if (!rollNoRegex.test(rollNo)) {
        toast.error("Invalid Roll Number. Use GUG Roll Number.");
        return; // Stop the signup process immediately
      }

      const loadingToast = toast.loading("Forging your access key...");

      // 2. Proceed with Supabase Signup
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: { full_name: fullName, roll_no: rollNo }
        }
      });
      
      if (error) {
        toast.error(error.message, { id: loadingToast });
      } else {
        toast.success("Welcome to the Vault.", { id: loadingToast });
        window.location.href = "/dashboard"; 
      }

    } else {
      // SIGN IN LOGIC
      const loadingToast = toast.loading("Accessing Vault...");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message, { id: loadingToast });
      } else {
        toast.success("Welcome Back.", { id: loadingToast });
        window.location.href = "/dashboard"; 
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
      >
        <h2 className="text-3xl font-bold mb-2">{isSignUp ? "Join EXAMS" : "Welcome Back"}</h2>
        <p className="text-gray-400 mb-8 text-sm">Strictly for Gurugram University Students.</p>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <input 
                type="text" placeholder="Full Name" required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                onChange={(e) => setFullName(e.target.value)}
              />
              <input 
                type="text" placeholder="Roll Number" required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                onChange={(e) => setRollNo(e.target.value)}
              />
            </>
          )}
          <input 
            type="email" placeholder="University Email" required
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors mt-4">
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center text-sm text-gray-500 mt-6 hover:text-gray-300 transition-colors"
        >
          {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
        </button>
      </motion.div>
    </div>
  );
}