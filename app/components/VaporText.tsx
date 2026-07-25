"use client";
import { motion, AnimatePresence } from "framer-motion";

interface VaporTextProps {
    text: string;
    isVisible: boolean;
    className?: string;
}

export default function VaporText({ text, isVisible, className = "" }: VaporTextProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <div className={`flex flex-wrap ${className}`}>
                    {text.split("").map((char, i) => (
                        <motion.span
                            key={i}
                            // ENTRANCE: Assembles from vapor drops
                            initial={{ opacity: 0, filter: "blur(12px)", y: Math.random() * -50 - 20, x: Math.random() * 40 - 20, scale: 0.1 }}
                            animate={{ opacity: 1, filter: "blur(0px)", y: 0, x: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut", delay: i * 0.03 } }}
                            // EXIT: Explodes back into vapor dots
                            exit={{ opacity: 0, filter: "blur(12px)", y: Math.random() * -50 - 20, x: Math.random() * 40 - 20, scale: 0.1, transition: { duration: 0.5, ease: "easeIn", delay: Math.random() * 0.1 } }}
                            className="inline-block"
                        >
                            {char === " " ? "\u00A0" : char}
                        </motion.span>
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
}