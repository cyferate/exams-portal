"use client";
import { useEffect, useRef } from "react";

export default function CinematicCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Generate floating fluid nodes
        const nodes: any[] = [];
        for (let i = 0; i < 40; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.6, // Slow drifting physics
                vy: (Math.random() - 0.5) * 0.6,
                size: Math.random() * 250 + 100, // Massive soft blur nodes
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "screen";

            nodes.forEach((node) => {
                node.x += node.vx;
                node.y += node.vy;

                // Bounce off invisible walls smoothly
                if (node.x < -300 || node.x > width + 300) node.vx *= -1;
                if (node.y < -300 || node.y > height + 300) node.vy *= -1;

                // Premium darkened radial gradients
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size);
                gradient.addColorStop(0, `rgba(255, 255, 255, 0.015)`);
                gradient.addColorStop(1, "transparent");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-[#020202]">
            <canvas ref={canvasRef} className="w-full h-full opacity-80 mix-blend-screen" />
            {/* Heavy vignette overlay to push focus to the center typography */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020202_100%)] pointer-events-none" />
        </div>
    );
}