"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Play, Terminal, Loader2, Save, Download, CodeSquare, Trash2, Copy } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// Ultra-clean, standard minimalist boilerplates
const BOILERPLATES: Record<string, string> = {
    python: "print('Hello from DEV Sandbox!')\n",
    javascript: "console.log('Hello from DEV Sandbox!');\n",
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello from DEV Sandbox!\" << endl;\n    return 0;\n}",
    c: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello from DEV Sandbox!\\n\");\n    return 0;\n}",
    java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from DEV Sandbox!\");\n    }\n}",
    sqlite3: "-- Write your SQL query here...\nSELECT 'Hello from DEV Sandbox!' AS Output;\n",
    default: "// Write your code here...\n"
};

export default function SandboxPlayground() {
    const [languages, setLanguages] = useState<any[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState("python");
    const [code, setCode] = useState(BOILERPLATES.python);
    const [customInput, setCustomInput] = useState("");
    const [output, setOutput] = useState("System standby. Ready for execution...\n");
    const [isRunning, setIsRunning] = useState(false);
    const [filename, setFilename] = useState("script");

    const editorRef = useRef<any>(null);

    // --- RESIZABLE PANES STATE ---
    const [leftWidth, setLeftWidth] = useState(60); // Percentage
    const [topHeight, setTopHeight] = useState(35); // Percentage
    const [isDraggingCol, setIsDraggingCol] = useState(false);
    const [isDraggingRow, setIsDraggingRow] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const rightPaneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadLanguages();
    }, []);

    // --- DRAG TO RESIZE LOGIC ---
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingCol && containerRef.current) {
            const containerWidth = containerRef.current.getBoundingClientRect().width;
            const newLeftWidth = (e.clientX / containerWidth) * 100;
            if (newLeftWidth > 20 && newLeftWidth < 80) setLeftWidth(newLeftWidth);
        }
        if (isDraggingRow && rightPaneRef.current) {
            const topOffset = rightPaneRef.current.getBoundingClientRect().top;
            const containerHeight = rightPaneRef.current.getBoundingClientRect().height;
            const newTopHeight = ((e.clientY - topOffset) / containerHeight) * 100;
            if (newTopHeight > 10 && newTopHeight < 90) setTopHeight(newTopHeight);
        }
    }, [isDraggingCol, isDraggingRow]);

    const handleMouseUp = useCallback(() => {
        setIsDraggingCol(false);
        setIsDraggingRow(false);
        document.body.style.cursor = 'default';
    }, []);

    useEffect(() => {
        if (isDraggingCol || isDraggingRow) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingCol, isDraggingRow, handleMouseMove, handleMouseUp]);

    async function loadLanguages() {
        const { data } = await supabase.from("garuda_languages").select("*").order("name");
        if (data) setLanguages(data);
    }

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        setSelectedLanguage(newLang);
        // Only swap to the new boilerplate if the user hasn't written their own custom script yet
        if (code.includes("DEV Sandbox") || code.length < 50) {
            setCode(BOILERPLATES[newLang] || BOILERPLATES.default);
        }
    };

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            executeCode();
        });
    };

    const executeCode = async () => {
        if (!code.trim()) return toast.error("Editor is empty.");
        setIsRunning(true);
        setOutput("Initiating freeform compilation tunnel...\nCompiling...\n");

        const currentCode = editorRef.current ? editorRef.current.getValue() : code;
        let finalCode = currentCode;

        // Stealth Terminal Injector for Python
        if (selectedLanguage === "python") {
            finalCode = `
import builtins
_orig_input = builtins.input
def _smart_input(prompt=""):
    try:
        val = _orig_input(prompt)
        print(f"__DEV_IN__{val}__DEV_OUT__", flush=True)
        return val
    except EOFError:
        return ""
builtins.input = _smart_input

` + currentCode;
        }

        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: selectedLanguage,
                    code: finalCode,
                    stdin: customInput
                })
            });

            const data = await res.json();

            if (!res.ok || data.error) throw new Error(data.details || data.error || "Internal Server Failure");
            if (!data.run) throw new Error("Compiler engine failed to process the request.");

            let finalLog = "";
            if (data.compile && data.compile.code !== 0 && data.compile.stderr) {
                finalLog = `[COMPILATION ERROR]\n${data.compile.stderr}`;
            } else {
                finalLog = data.run.stdout ? data.run.stdout : (data.run.stderr ? `[RUNTIME WARNING/ERROR]\n${data.run.stderr}` : "\n[Process exited successfully with no output]");
            }
            setOutput(finalLog);

        } catch (err: any) {
            setOutput(`[SYSTEM HALT] Execution aborted.\nDIAGNOSTIC DATA: ${err.message}`);
        }
        setIsRunning(false);
    };

    // --- LIVE EXECUTION ON ENTER KEY ---
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            setTimeout(() => {
                executeCode();
            }, 50);
        }
    };

    const handleDownload = () => {
        const extension = selectedLanguage === 'python' ? 'py' : selectedLanguage === 'javascript' ? 'js' : selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'c' ? 'c' : 'txt';
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename || 'sandbox'}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Script downloaded locally.");
    };

    const saveToProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return toast.error("Authentication required.");
        const toastId = toast.loading("Saving to Vault...");

        const { error } = await supabase.from("dev_sandbox").insert([{
            user_id: session.user.id,
            language_slug: selectedLanguage,
            code: code,
            filename: filename || "Untitled Script"
        }]);

        if (error) toast.error("Failed to save: " + error.message, { id: toastId });
        else toast.success("Script secured in Profile.", { id: toastId });
    };

    const copyOutput = () => {
        navigator.clipboard.writeText(output);
        toast.success("Console output copied.");
    };

    const renderConsoleOutput = (text: string) => {
        if (!text) return null;
        const parts = text.split(/__DEV_IN__(.*?)__DEV_OUT__/g);
        return parts.map((part, i) => {
            if (i % 2 === 1) {
                return <span key={i} className="text-blue-400 font-bold">{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="h-screen bg-[#050505] text-white font-sans flex flex-col overflow-hidden selection:bg-blue-500/30" ref={containerRef}>

            {/* TOP NAVBAR */}
            <nav className="border-b border-white/5 bg-[#0c0c0c] shrink-0 z-10 shadow-md">
                <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/garuda" className="text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">
                            <ArrowLeft className="w-4 h-4" /> EXIT
                        </Link>
                        <div className="h-5 w-px bg-white/10" />
                        <h1 className="font-black flex items-center gap-2 text-sm tracking-wide text-gray-200">
                            <CodeSquare className="w-4 h-4 text-blue-500" /> GLOBAL SANDBOX
                        </h1>
                        <select
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                            className="bg-[#121212] border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500 hover:border-white/20 transition-colors cursor-pointer"
                        >
                            {languages.map(l => <option key={l.slug} value={l.slug}>{l.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Filename"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                            className="bg-[#121212] border border-white/10 text-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-24 sm:w-32 transition-colors placeholder:text-gray-600"
                        />
                        <button onClick={handleDownload} className="p-1.5 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all text-gray-400 hover:text-white" title="Download Local">
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={saveToProfile} className="p-1.5 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all text-gray-400 hover:text-white" title="Save to Database">
                            <Save className="w-4 h-4" />
                        </button>
                        <button
                            onClick={executeCode}
                            disabled={isRunning}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] ml-2"
                        >
                            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            RUN
                        </button>
                    </div>
                </div>
            </nav>

            {/* SPLIT WORKSPACE */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden w-full relative">

                {/* LEFT PANE: EDITOR */}
                <div style={{ width: `${leftWidth}%` }} className="relative flex flex-col bg-[#0a0a0a] min-w-[20%]">
                    <div className="absolute top-0 right-4 z-10 px-3 py-1 bg-black/50 border border-white/5 rounded-b-lg text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-2 shadow-sm pointer-events-none">
                        {selectedLanguage} Runtime
                        <span className="text-gray-700 hidden sm:inline-block">|</span>
                        <span className="hidden sm:inline-block text-gray-600">Ctrl + Enter to Run</span>
                    </div>
                    <div className="flex-1 h-full relative">
                        <Editor
                            height="100%"
                            language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'c' ? 'c' : selectedLanguage}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                padding: { top: 30 },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                                renderLineHighlight: "all",
                                automaticLayout: true,
                                scrollbar: { vertical: "hidden", horizontal: "hidden" }
                            }}
                        />
                    </div>
                </div>

                {/* VERTICAL DRAG DIVIDER */}
                <div
                    onMouseDown={() => { setIsDraggingCol(true); document.body.style.cursor = 'col-resize'; }}
                    className="w-1 bg-white/5 hover:bg-blue-500/50 cursor-col-resize z-20 transition-colors flex items-center justify-center group"
                >
                    <div className="h-8 w-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors" />
                </div>

                {/* RIGHT PANE: PERFECTLY SYNCED STDIN & CONSOLE */}
                <div ref={rightPaneRef} style={{ width: `${100 - leftWidth}%` }} className="bg-[#050505] flex flex-col h-full min-w-[20%]">

                    {/* TOP HALF: STDIN */}
                    <div style={{ height: `${topHeight}%` }} className="flex flex-col min-h-[10%]">
                        <div className="bg-[#0c0c0c] px-4 py-2.5 flex items-center justify-between border-b border-white/5 shrink-0">
                            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase flex items-center gap-2">
                                Custom Input (STDIN)
                                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded lowercase font-mono">auto-runs on enter</span>
                            </span>
                            <button
                                onClick={() => setCustomInput("")}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-md transition-colors text-gray-500 hover:text-red-400 text-xs font-bold"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Clear Input
                            </button>
                        </div>
                        <textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Type input and press Enter to execute live..."
                            className="flex-1 bg-transparent text-gray-300 p-4 font-mono text-sm focus:outline-none resize-none custom-scrollbar placeholder:text-gray-700"
                        />
                    </div>

                    {/* HORIZONTAL DRAG DIVIDER */}
                    <div
                        onMouseDown={() => { setIsDraggingRow(true); document.body.style.cursor = 'row-resize'; }}
                        className="h-1 bg-white/5 hover:bg-blue-500/50 cursor-row-resize z-20 transition-colors flex items-center justify-center group"
                    >
                        <div className="w-8 h-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors" />
                    </div>

                    {/* BOTTOM HALF: CONSOLE */}
                    <div style={{ height: `${100 - topHeight}%` }} className="flex flex-col overflow-hidden bg-[#080808] min-h-[10%]">
                        <div className="bg-[#0c0c0c] px-4 py-2.5 flex items-center justify-between border-b border-white/5 shrink-0">
                            <span className="flex items-center gap-2 text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                                <Terminal className="w-3.5 h-3.5 text-blue-500" /> System Console
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={copyOutput}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-transparent rounded-md transition-colors text-gray-500 hover:text-white text-xs font-bold"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy Log
                                </button>
                                <button
                                    onClick={() => setOutput("")}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-md transition-colors text-gray-500 hover:text-red-400 text-xs font-bold"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Clear Console
                                </button>
                            </div>
                        </div>

                        <div className={`p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap flex-1 custom-scrollbar leading-relaxed ${output.includes('ERROR') || output.includes('HALT') ? 'text-red-400' : 'text-gray-300'}`}>
                            {renderConsoleOutput(output)}
                            {isRunning && <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}