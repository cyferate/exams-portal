"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Tell TypeScript that requireAdmin is an optional boolean
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkClearance = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Kick out unauthenticated users
      if (!session) {
        router.push("/auth");
        return;
      }

      // 2. If it's an Admin page, verify their clearance level
      if (requireAdmin) {
        const { data } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
        if (!data?.is_admin) {
          router.push("/dashboard"); // Kick normal students back to the dashboard
          return;
        }
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkClearance();
  }, [requireAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}