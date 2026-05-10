import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes"; // <-- NEW
import "./globals.css";

export const metadata: Metadata = {
  title: "EXAMS Vault",
  description: "The Exclusive Hub for Gurugram University",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required by next-themes
    <html lang="en" suppressHydrationWarning> 
      <body className="antialiased bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--toast-bg, #18181b)',
                color: 'var(--toast-color, #fff)',
                border: '1px solid rgba(150,150,150,0.2)',
                backdropFilter: 'blur(10px)',
              },
            }} 
          />
        </ThemeProvider>
      </body>
    </html>
  );
}