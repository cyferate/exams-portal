import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "EXAMS Vault",
  description: "The Exclusive Hub for Gurugram University",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0a0a0a]">
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#18181b', // Dark zinc color
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            },
          }} 
        />
      </body>
    </html>
  );
}