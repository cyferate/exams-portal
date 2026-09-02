"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import { Play, Terminal, CheckCircle2, XCircle, Loader2, ShieldAlert, Award, ChevronDown, ChevronUp, Cpu, Check, X, BookOpen, RotateCcw, AlignLeft, Trash2, ArrowLeft, ArrowRight, Save } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const LANG_NAMES: Record<string, string> = {
    python: "Python 3",
    javascript: "JavaScript",
    cpp: "C++",
    c: "C",
    sqlite3: "SQL"
};

export default function ExecutionArena() {
    const params = useParams();
    const languageSlug = params.language as string;
    const questionId = params.id as string;

    const [question, setQuestion] = useState<any>(null);
    const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
    const [code, setCode] = useState("");

    // IDE UI States
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);
    const [activeTestCaseTab, setActiveTestCaseTab] = useState<number>(0);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const editorRef = useRef<any>(null);

    // --- RESIZABLE PANES STATE ---
    const [leftWidth, setLeftWidth] = useState(35);
    const [topHeight, setTopHeight] = useState(60);
    const [isDraggingCol, setIsDraggingCol] = useState(false);
    const [isDraggingRow, setIsDraggingRow] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const rightPaneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchQuestionData();
    }, [questionId]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingCol && containerRef.current) {
            const containerWidth = containerRef.current.getBoundingClientRect().width;
            const newLeftWidth = (e.clientX / containerWidth) * 100;
            if (newLeftWidth > 20 && newLeftWidth < 60) setLeftWidth(newLeftWidth);
        }
        if (isDraggingRow && rightPaneRef.current) {
            const topOffset = rightPaneRef.current.getBoundingClientRect().top;
            const containerHeight = rightPaneRef.current.getBoundingClientRect().height;
            const newTopHeight = ((e.clientY - topOffset) / containerHeight) * 100;
            if (newTopHeight > 20 && newTopHeight < 90) setTopHeight(newTopHeight);
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


    const getBoilerplate = (lang: string, description: string) => {
        const signatureMatch = description?.match(/solve\([^)]*\)/);
        const signature = signatureMatch ? signatureMatch[0] : "solve(n)";

        if (lang === "python") return `def ${signature}:\n    # Write your logic here\n    pass\n`;
        if (lang === "javascript") return `function ${signature} {\n    // Write your logic here\n    return;\n}\n`;
        if (lang === "cpp" || lang === "c") return `// Define your solve function below.\nint solve(int n) {\n    // Write your logic here\n    return n;\n}\n`;
        if (lang === "sqlite3") return `-- Write your SQL query here...\nSELECT * FROM table_name;\n`;
        return "// Write your code here...\n";
    };

    async function fetchQuestionData() {
        const { data: { session } } = await supabase.auth.getSession();

        const { data: qData, error } = await supabase.from("garuda_questions").select("*").eq("id", questionId).single();
        if (error || !qData) return toast.error("Failed to load module.");
        setQuestion(qData);

        const { data: allQ } = await supabase.from("garuda_questions").select("id").eq("language_id", qData.language_id).order("created_at", { ascending: true });
        if (allQ) {
            const currentIndex = allQ.findIndex(q => q.id === questionId);
            if (currentIndex >= 0 && currentIndex < allQ.length - 1) {
                setNextQuestionId(allQ[currentIndex + 1].id);
            }
        }

        const boilerplate = getBoilerplate(languageSlug, qData.description);
        let loadedCode = boilerplate;

        if (session) {
            const { data: savedSub } = await supabase.from("garuda_submissions").select("code, status").eq("user_id", session.user.id).eq("question_id", questionId).maybeSingle();

            if (savedSub && savedSub.code) {
                loadedCode = savedSub.code;
                if (loadedCode.trim() !== boilerplate.trim()) {
                    toast("Restoring your last saved session...", { icon: '🔄', style: { fontSize: '12px' } });
                }
            }
        }

        setCode(loadedCode);
        if (editorRef.current) {
            setTimeout(() => editorRef.current.setValue(loadedCode), 50);
        }
    }

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            executeCode();
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            forceManualSave();
        });
    };

    const formatCode = () => {
        editorRef.current?.getAction('editor.action.formatDocument').run();
        toast.success("Code formatted.", { id: 'fmt' });
    };

    const resetCode = () => {
        if (window.confirm("Restore to default boilerplate? Your custom code will be erased.")) {
            const freshCode = getBoilerplate(languageSlug, question.description);
            setCode(freshCode);
            if (editorRef.current) editorRef.current.setValue(freshCode);
        }
    };

    const forceManualSave = async () => {
        const currentCode = editorRef.current ? editorRef.current.getValue() : code;
        await saveSubmission(false, currentCode, true);
    };

    const executeCode = async () => {
        const currentCode = editorRef.current ? editorRef.current.getValue() : code;
        if (!currentCode.trim()) return toast.error("Editor is empty.");

        setIsRunning(true);
        setIsConsoleOpen(true);

        if (topHeight > 85) setTopHeight(60);

        setTestResults([]);
        setGlobalError(null);
        setActiveTestCaseTab(0);

        let finalCode = currentCode;

        if (languageSlug === "python") {
            finalCode += `\n\n# --- DEV'S HIDDEN RUNNER ---
import sys, ast, json
def _run():
    raw_in = sys.stdin.read().strip()
    if not raw_in: return
    try:
        args = ast.literal_eval(raw_in)
        res = solve(*args) if isinstance(args, tuple) else solve(args)
    except:
        res = solve(raw_in)
    
    if isinstance(res, (list, dict, tuple, bool)):
        print(json.dumps(res).replace('true', 'True').replace('false', 'False'))
    else:
        print(res)
if __name__ == '__main__': _run()`;
        }
        else if (languageSlug === "javascript") {
            finalCode += `\n\n// --- DEV'S HIDDEN RUNNER ---
const fs = require('fs');
const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();
try {
    const args = JSON.parse(input);
    const res = Array.isArray(args) ? solve(...args) : solve(args);
    console.log(typeof res === 'object' ? JSON.stringify(res) : res);
} catch(e) {
    console.log(solve(input));
}`;
        }
        else if (languageSlug === "cpp" || languageSlug === "c") {
            finalCode += "\n\n// --- DEV'S HIDDEN RUNNER ---\n#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << solve(n);\n    }\n    return 0;\n}";
        }

        const allTests = [
            ...(question.public_test_cases || []).map((t: any) => ({ ...t, isHidden: false })),
            ...(question.private_test_cases || []).map((t: any) => ({ ...t, isHidden: true }))
        ];

        let passedAll = true;
        let resultsArr = [];

        for (let i = 0; i < allTests.length; i++) {
            const test = allTests[i];

            try {
                const res = await fetch("/api/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language: languageSlug,
                        code: finalCode,
                        stdin: String(test.input)
                    })
                });

                const data = await res.json();

                if (!res.ok || data.error) throw new Error(data.details || data.error || "Internal Server Failure");
                if (!data.run) throw new Error("Compiler engine failed to process the request.");

                // --- SMART ERROR INTERCEPTOR ---
                if (data.compile && data.compile.code !== 0 && data.compile.stderr) {
                    const errText = data.compile.stderr;
                    if (errText.includes("OCI runtime error") || errText.includes("Resource temporarily unavailable")) {
                        setGlobalError(`[SERVER CONGESTION] The free compiler engine is currently processing too many requests.\n\nDon't worry, your code might be perfectly fine! Please wait 2 seconds and click RUN again.`);
                    } else {
                        setGlobalError(`[COMPILATION ERROR]\n${errText}`);
                    }
                    setIsRunning(false);
                    return;
                }

                const runOutput = data.run.stdout ? data.run.stdout.trim() : (data.run.stderr ? data.run.stderr.trim() : "");
                const expectedOutput = String(test.expected).trim();

                const isPass = runOutput === expectedOutput;
                if (!isPass) passedAll = false;

                resultsArr.push({
                    testNumber: i + 1,
                    passed: isPass,
                    isHidden: test.isHidden,
                    input: test.input,
                    expected: expectedOutput,
                    actual: runOutput,
                    error: data.run.stderr
                });

                if (!isPass) break;

            } catch (err: any) {
                passedAll = false;
                setGlobalError(`[SYSTEM HALT] Execution aborted.\nDIAGNOSTIC DATA: ${err.message}`);
                break;
            }
        }

        setTestResults(resultsArr);
        setIsRunning(false);

        if (passedAll && allTests.length > 0) {
            toast.success(`All Test Cases Passed! +${question.xp_reward} XP!`, { icon: '🏆', duration: 4000 });
            saveSubmission(true, currentCode);
        } else if (allTests.length > 0 && !globalError) {
            toast.error("Execution failed on test cases. Check console.");
            saveSubmission(false, currentCode);
        }
    };

    const saveSubmission = async (passed: boolean, submittedCode: string, isManual = false) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: existing } = await supabase
            .from("garuda_submissions")
            .select("id, status")
            .eq("user_id", session.user.id)
            .eq("question_id", questionId)
            .maybeSingle();

        if (existing) {
            // Update the code, maintaining a 'passed' status if they had previously passed it
            await supabase.from("garuda_submissions").update({
                code: submittedCode,
                status: (existing.status === 'passed' ? 'passed' : (passed ? 'passed' : 'failed'))
            }).eq("id", existing.id);

            if (existing.status !== 'passed' && passed) {
                await supabase.rpc('award_garuda_xp', { user_id_param: session.user.id, xp_to_add: question.xp_reward });
            }
            if (isManual) toast.success("Code saved to Vault.");
            return;
        }

        const { error } = await supabase.from("garuda_submissions").insert([{
            user_id: session.user.id,
            question_id: questionId,
            code: submittedCode,
            status: passed ? "passed" : "failed"
        }]);

        if (passed && !error) {
            await supabase.rpc('award_garuda_xp', { user_id_param: session.user.id, xp_to_add: question.xp_reward });
        }
        if (isManual && !error) toast.success("Code saved to Vault.");
    };

    if (!question) return <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    const activeTest = testResults[activeTestCaseTab];
    const allPassed = testResults.length > 0 && testResults.every(r => r.passed);

    return (
        <div className="min-h-screen bg-[#050505] text-gray-300 font-sans flex flex-col h-screen overflow-hidden selection:bg-blue-500/30" ref={containerRef}>

            {/* --- TOP COMMAND BAR --- */}
            <nav className="bg-[#0c0c0c] border-b border-white/5 shrink-0 z-20 shadow-md">
                <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* THE ABORT FIX: Uses Link to retain state via sessionStorage in the portal */}
                        <Link href="/garuda" className="text-gray-500 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer">
                            <ArrowLeft className="w-4 h-4" /> ABORT
                        </Link>
                        <div className="h-5 w-px bg-white/10" />
                        <h1 className="font-bold text-sm tracking-wide text-gray-200 truncate max-w-[150px] sm:max-w-md">DEV's practice: {question.title}</h1>
                        <span className="hidden md:inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase">
                            {LANG_NAMES[languageSlug] || languageSlug}
                        </span>
                        <span className={`hidden sm:inline-block text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${question.difficulty === 'Fundamentals' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            question.difficulty === 'DSA & Logic' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {question.difficulty}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                            <Award className="w-3.5 h-3.5" /> +{question.xp_reward} XP
                        </div>

                        <button
                            onClick={executeCode}
                            disabled={isRunning}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                        >
                            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            {allPassed ? "RE-RUN" : "RUN TESTS"}
                        </button>

                        {/* NEXT BUTTON FOR STREAKS */}
                        {allPassed && nextQuestionId && (
                            <Link href={`/garuda/${languageSlug}/${nextQuestionId}`} className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                NEXT MODULE <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- SPLIT WORKSPACE --- */}
            <main className="flex-1 flex overflow-hidden w-full mx-auto relative">

                {/* LEFT PANE: DESCRIPTION */}
                <div style={{ width: `${leftWidth}%` }} className="bg-[#080808] flex flex-col min-w-[20%]">

                    <div className="flex items-center gap-6 px-6 py-3 border-b border-white/5 bg-[#0a0a0a] shrink-0">
                        <button className="flex items-center gap-2 text-sm font-bold text-white border-b-2 border-blue-500 pb-2 -mb-3">
                            <BookOpen className="w-4 h-4 text-blue-400" /> Description
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <h2 className="text-2xl font-black text-white mb-6">{question.title}</h2>

                        <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed mb-10 whitespace-pre-wrap">
                            {question.description}
                        </div>

                        {question.public_test_cases?.length > 0 && (
                            <>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Examples</h3>
                                <div className="space-y-4">
                                    {question.public_test_cases.map((tc: any, i: number) => (
                                        <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 font-mono text-sm shadow-sm">
                                            <div className="mb-2"><span className="text-gray-600 font-bold">Input:</span> <span className="text-blue-300 ml-2">{tc.input}</span></div>
                                            <div><span className="text-gray-600 font-bold">Output:</span> <span className="text-green-300 ml-2">{tc.expected}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* VERTICAL DRAG DIVIDER */}
                <div
                    onMouseDown={() => { setIsDraggingCol(true); document.body.style.cursor = 'col-resize'; }}
                    className="w-1 bg-white/5 hover:bg-blue-500/50 cursor-col-resize z-20 transition-colors flex items-center justify-center group shrink-0"
                >
                    <div className="h-8 w-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors" />
                </div>

                {/* RIGHT PANE: EDITOR & TERMINAL */}
                <div ref={rightPaneRef} style={{ width: `${100 - leftWidth}%` }} className="flex flex-col bg-[#0c0c0c] min-w-[30%]">

                    {/* TOP HALF: MONACO EDITOR */}
                    <div style={{ height: `${topHeight}%` }} className="relative flex flex-col min-h-[20%]">

                        <div className="absolute top-0 right-4 z-10 flex items-center gap-2 mt-3">
                            <button onClick={forceManualSave} className="px-2 py-1 bg-black/50 border border-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-gray-400 hover:text-white uppercase transition-colors flex items-center gap-1.5 backdrop-blur-md">
                                <Save className="w-3 h-3" /> Save
                            </button>
                            <button onClick={formatCode} className="px-2 py-1 bg-black/50 border border-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-gray-400 hover:text-white uppercase transition-colors flex items-center gap-1.5 backdrop-blur-md">
                                <AlignLeft className="w-3 h-3" /> Format
                            </button>
                            <button onClick={resetCode} className="px-2 py-1 bg-black/50 border border-white/5 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 rounded text-[10px] font-bold text-gray-400 uppercase transition-colors flex items-center gap-1.5 backdrop-blur-md">
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                            <div className="px-3 py-1 bg-black/50 border border-white/5 rounded text-[10px] font-mono font-bold text-gray-500 uppercase flex items-center gap-2 backdrop-blur-md">
                                {languageSlug}
                                <span className="text-gray-700">|</span>
                                <span className="text-blue-400">Ctrl+Enter</span>
                            </div>
                        </div>

                        <div className="flex-1 w-full h-full relative">
                            <Editor
                                height="100%"
                                language={languageSlug === 'cpp' ? 'cpp' : languageSlug}
                                theme="vs-dark"
                                value={code}
                                onChange={(value) => setCode(value || "")}
                                onMount={handleEditorDidMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    padding: { top: 40 },
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

                    {/* HORIZONTAL DRAG DIVIDER */}
                    <div
                        onMouseDown={() => { setIsDraggingRow(true); document.body.style.cursor = 'row-resize'; }}
                        className="h-1 bg-white/5 hover:bg-blue-500/50 cursor-row-resize z-20 transition-colors flex items-center justify-center group shrink-0"
                    >
                        <div className="w-8 h-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors" />
                    </div>

                    {/* BOTTOM HALF: TEST CONSOLE */}
                    <div style={{ height: `${100 - topHeight}%` }} className="flex flex-col bg-[#050505] min-h-[10%]">

                        {/* Drawer Header (Click to toggle) */}
                        <div
                            onClick={() => {
                                setIsConsoleOpen(!isConsoleOpen);
                                setTopHeight(isConsoleOpen ? 95 : 60);
                            }}
                            className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 shrink-0"
                        >
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                                <Terminal className="w-4 h-4" /> TEST CONSOLE
                                {testResults.length > 0 && !isRunning && !globalError && (
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono tracking-widest ${allPassed ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                                        {allPassed ? 'ACCEPTED' : 'WRONG ANSWER'}
                                        {allPassed && <span className="ml-2 text-green-600">~24ms</span>}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {testResults.length > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); setTestResults([]); setGlobalError(null); }} className="text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold">
                                        <Trash2 className="w-3 h-3" /> Clear
                                    </button>
                                )}
                                <button className="text-gray-500 hover:text-white transition-colors">
                                    {isConsoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <AnimatePresence>
                            {isConsoleOpen && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-hidden flex flex-col bg-[#080808]">

                                    {/* Global Error State (Compilation Fails) */}
                                    {globalError ? (
                                        <div className="p-6 font-mono text-sm text-red-400 whitespace-pre-wrap overflow-y-auto custom-scrollbar leading-relaxed">
                                            {globalError}
                                        </div>
                                    ) : testResults.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-xs">
                                            <Cpu className="w-4 h-4 mr-2" /> Execute code to generate compilation logs.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full">

                                            {/* Test Case Tabs */}
                                            <div className="flex items-center gap-2 px-4 pt-3 pb-2 overflow-x-auto custom-scrollbar border-b border-white/5 shrink-0 bg-[#0a0a0a]">
                                                {testResults.map((res, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveTestCaseTab(i)}
                                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors border ${activeTestCaseTab === i ? 'bg-white/10 border-white/20 text-white shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5'}`}
                                                    >
                                                        {res.passed ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-red-500" />}
                                                        Case {i + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Active Test Case Detail Viewer */}
                                            {activeTest && (
                                                <div className="p-6 overflow-y-auto flex-1 font-mono text-sm space-y-6 custom-scrollbar">
                                                    {activeTest.isHidden && !activeTest.passed ? (
                                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                                                            <ShieldAlert className="w-5 h-5" />
                                                            <div>
                                                                <p className="font-bold">Hidden Logic Failed</p>
                                                                <p className="text-xs opacity-80 mt-1">This test case is locked to prevent hardcoding. Review your algorithmic edge cases.</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div>
                                                                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 block flex items-center gap-2">
                                                                    Input Data <span className="h-px bg-white/5 flex-1" />
                                                                </span>
                                                                <div className="bg-[#050505] border border-white/5 p-3 rounded-xl text-gray-300 break-words">
                                                                    {activeTest.input}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 block flex items-center gap-2">
                                                                    Expected Output <span className="h-px bg-white/5 flex-1" />
                                                                </span>
                                                                <div className="bg-[#050505] border border-white/5 p-3 rounded-xl text-green-400 break-words">
                                                                    {activeTest.expected}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 block flex items-center gap-2">
                                                                    Your Output <span className="h-px bg-white/5 flex-1" />
                                                                </span>
                                                                <div className={`p-3 rounded-xl border break-words ${activeTest.passed ? 'bg-green-500/5 border-green-500/20 text-green-300' : 'bg-red-500/5 border-red-500/20 text-red-300'}`}>
                                                                    {activeTest.actual || "No output generated"}
                                                                </div>
                                                            </div>

                                                            {activeTest.error && (
                                                                <div>
                                                                    <span className="text-red-500/70 text-[10px] uppercase tracking-widest font-bold mb-1.5 block flex items-center gap-2">
                                                                        Runtime Exceptions <span className="h-px bg-red-500/10 flex-1" />
                                                                    </span>
                                                                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 whitespace-pre-wrap">
                                                                        {activeTest.error}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </main>
        </div>
    );
}