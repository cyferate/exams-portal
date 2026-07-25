"use client";
import { motion } from "framer-motion";

export default function ShimmerText({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.span
            className={`inline-block relative overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-gray-500 via-black to-gray-500 dark:from-gray-500 dark:via-white dark:to-gray-500 bg-[length:200%_auto] ${className}`}
            animate={{ backgroundPosition: ["200% center", "-200% center"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        >
            {children}
        </motion.span>
    );
}