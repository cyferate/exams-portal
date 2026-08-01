import React from 'react';

export default function Logo({ className = "w-32" }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 300"
            className={`transition-colors duration-300 ${className}`}
        >
            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap');
          .logo-txt { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 160px; }
        `}
            </style>

            {/* text-current forces the SVG to adopt the text-black or text-white classes from Tailwind */}
            <text x="175" y="215" className="logo-txt" fill="currentColor">E</text>

            {/* The Cyber 'X' with Twin Parallel Syntax Slants */}
            <g transform="translate(305, 100)">
                <polygon points="0,0 45,0 110,120 65,120" fill="currentColor" />
                <polygon points="95,0 85,0 0,120 10,120" fill="#3b82f6" />
                <polygon points="110,0 100,0 15,120 25,120" fill="#3b82f6" />
            </g>

            <text x="435" y="215" className="logo-txt" fill="currentColor">
                AMS<tspan fill="#3b82f6">.</tspan>
            </text>
        </svg>
    );
}