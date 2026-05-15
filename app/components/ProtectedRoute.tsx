"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/auth";
      } else {
        setIsAuthorized(true);
      }
    }
    checkAuth();
  }, []);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500 tracking-widest text-sm">
        VERIFYING CREDENTIALS...
      </div>
    );
  }
  
  return <>{children}</>;
}