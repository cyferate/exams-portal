"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Trophy, Medal, Star } from "lucide-react";

export default function Badge3D({ rank, name, score, branch }: { rank: number, name: string, score: number, branch: string }) {
    const ref = useRef<HTMLDivElement>(null);

    // Track mouse position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Apply spring physics for smooth, heavy 3D movement
    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

    // Transform mouse position into 3D rotation angles
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Determine badge styling based on rank (Responsive for Light/Dark Mode)
    const isGold = rank === 1;
    const isSilver = rank === 2;
    const isBronze = rank === 3;

    let gradient = "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-black border-gray-200 dark:border-gray-700";
    let icon = <Star className="w-8 h-8 text-gray-400 dark:text-gray-500" />;

    if (isGold) {
        gradient = "from-yellow-100 via-yellow-50 to-amber-100 dark:from-yellow-400/20 dark:via-yellow-600/10 dark:to-black border-yellow-300 dark:border-yellow-500/30 shadow-yellow-500/20";
        icon = <Trophy className="w-10 h-10 text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />;
    } else if (isSilver) {
        gradient = "from-gray-100 via-white to-gray-200 dark:from-gray-300/20 dark:via-gray-500/10 dark:to-black border-gray-300 dark:border-gray-400/30 shadow-gray-500/20";
        icon = <Medal className="w-9 h-9 text-gray-400 dark:text-gray-300 drop-shadow-[0_0_15px_rgba(156,163,175,0.4)]" />;
    } else if (isBronze) {
        gradient = "from-orange-100 via-orange-50 to-amber-200 dark:from-amber-700/20 dark:via-orange-900/10 dark:to-black border-orange-200 dark:border-amber-700/30 shadow-orange-500/20";
        icon = <Medal className="w-8 h-8 text-orange-500 dark:text-amber-600 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]" />;
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className={`relative w-full h-48 rounded-3xl bg-gradient-to-br ${gradient} border flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-xl transition-shadow duration-300 hover:shadow-2xl`}
        >
            {/* 3D Inner Content */}
            <motion.div style={{ transform: "translateZ(50px)" }} className="flex flex-col items-center pointer-events-none">
                <div className="mb-2">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-wide">{name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">{branch}</p>

                {/* XP Pill */}
                <div className="mt-4 bg-white/80 dark:bg-black/50 px-4 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
                    <span className="text-sm font-mono text-gray-900 dark:text-white font-bold">{score} XP</span>
                </div>
            </motion.div>

            {/* Holographic Glare Effect */}
            <motion.div
                style={{
                    transform: "translateZ(60px)",
                    opacity: useTransform(y, [-0.5, 0.5], [0, 0.25])
                }}
                className="absolute inset-0 bg-gradient-to-b from-white/70 dark:from-white/40 to-transparent pointer-events-none rounded-3xl mix-blend-overlay"
            />
        </motion.div>
    );
}