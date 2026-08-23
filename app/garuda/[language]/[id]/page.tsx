"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Play, Terminal, CheckCircle2, XCircle, Loader2, ShieldAlert, Award } from "lucide-react";
import toast from "react-hot-toast";

export default function ExecutionArena() {
    const params = useParams();
    const router = useRouter();
    const languageSlug = params.language as string;
    const questionId = params.id as string;

    const [question, setQuestion] = useState<any>(null);
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("System standby. Ready for execution.");
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<any[]>([]);

    useEffect(() => {
        fetchQuestion();
    }, [questionId]);

    async function fetchQuestion() {
        const { data, error } = await supabase
            .from("garuda_questions")
            .select("*")
            .eq("id", questionId)
            .single();

        if (error) {
            toast.error("Failed to load module.");
            return;
        }
        setQuestion(data);

        // THE CLEAN UI: Students only see the pure logic function
        if (languageSlug === "python") {
            setCode("def solve(n):\n    # Write your logic here\n    # Note: 'n' is provided as a string by default.\n    return n\n");
        } else if (languageSlug === "cpp" || languageSlug === "c") {
            setCode("int solve(int n) {\n    // Write your logic here\n    return n;\n}\n");
        } else if (languageSlug === "javascript") {
            setCode("function solve(n) {\n    // Write your logic here\n    return n;\n}\n");
        } else {
            setCode("// Write your code here...\n");
        }
    }

    const executeCode = async () => {
        if (!code.trim()) return toast.error("Editor is empty.");
        setIsRunning(true);
        setOutput("Initiating stable Wandbox execution tunnel...\n");
        setTestResults([]);

        // STEALTH INJECTION: Appending the I/O boilerplate behind the scenes
        let finalCode = code;
        if (languageSlug === "python") {
            finalCode += "\n\n# --- EXAMS COMMUNITY HIDDEN RUNNER ---\nimport sys\nif __name__ == '__main__':\n    input_data = sys.stdin.read().strip()\n    print(solve(input_data))";
        } else if (languageSlug === "cpp" || languageSlug === "c") {
            finalCode += "\n\n// --- EXAMS COMMUNITY HIDDEN RUNNER ---\n#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << solve(n);\n    }\n    return 0;\n}";
        } else if (languageSlug === "javascript") {
            finalCode += "\n\n// --- EXAMS COMMUNITY HIDDEN RUNNER ---\nconst fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim();\nconsole.log(solve(input));";
        }

        const allTests = [
            ...question.public_test_cases.map((t: any) => ({ ...t, isHidden: false })),
            ...question.private_test_cases.map((t: any) => ({ ...t, isHidden: true }))
        ];

        let passedAll = true;
        let finalLog = "";
        let resultsArr = [];

        for (let i = 0; i < allTests.length; i++) {
            const test = allTests[i];
            finalLog += `\nRunning Test Case ${i + 1}...\n`;
            setOutput(finalLog);

            try {
                // Hits our internal Serverless API Route
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

                // 🛡️ THE BULLETPROOF ERROR CATCHER 🛡️
                if (!res.ok || data.error) {
                    throw new Error(data.details || data.error || "Internal Server Failure");
                }
                if (!data.run) {
                    throw new Error("Compiler engine failed to process the request.");
                }
                if (data.compile && data.compile.code !== 0 && data.compile.stderr) {
                    throw new Error(`COMPILATION ERROR:\n${data.compile.stderr}`);
                }

                // Parse the output (checking stdout first, falling back to stderr for runtime exceptions)
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

                if (!isPass) {
                    finalLog += `[FAILED] Expected: ${expectedOutput} | Got: ${runOutput}\n`;
                    if (data.run.stderr) finalLog += `Runtime Error Log:\n${data.run.stderr}\n`;
                    break;
                } else {
                    finalLog += `[PASSED] Execution successful.\n`;
                }

            } catch (err: any) {
                passedAll = false;
                finalLog += `[SYSTEM HALT] Execution aborted.\n`;
                finalLog += `DIAGNOSTIC DATA: ${err.message}\n`;
                break;
            }
        }

        setOutput(finalLog);
        setTestResults(resultsArr);
        setIsRunning(false);

        if (passedAll && allTests.length > 0) {
            toast.success(`Execution Perfect! You earned ${question.xp_reward} XP!`, { icon: '🏆' });
            saveSubmission(true);
        } else if (allTests.length > 0) {
            toast.error("Execution failed on test cases.");
            saveSubmission(false);
        }
    };

    const saveSubmission = async (passed: boolean) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Use maybeSingle() instead of single() so it doesn't throw an error if no rows exist
        const { data: existing } = await supabase
            .from("garuda_submissions")
            .select("status")
            .eq("user_id", session.user.id)
            .eq("question_id", questionId)
            .eq("status", "passed")
            .maybeSingle();

        if (existing) return; // If they already passed this question, halt. No infinite XP farming.

        const { error } = await supabase.from("garuda_submissions").insert([{
            user_id: session.user.id,
            question_id: questionId,
            code: code,
            status: passed ? "passed" : "failed"
        }]);

        // 🏆 IF PASSED, FIRE THE RPC TO SECURELY AWARD XP!
        if (passed && !error) {
            await supabase.rpc('award_garuda_xp', {
                user_id_param: session.user.id,
                xp_to_add: question.xp_reward
            });
        }
    };

    if (!question) return <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#07090e] text-white font-sans flex flex-col h-screen overflow-hidden">

            {/* TOP COMMAND BAR */}
            <nav className="border-b border-white/10 bg-[#0e131f] shrink-0">
                <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold">
                            <ArrowLeft className="w-4 h-4" /> ABORT
                        </button>
                        <div className="h-4 w-px bg-white/10" />
                        <h1 className="font-bold text-sm tracking-wide">{question.title}</h1>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${question.difficulty === 'Fundamentals' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            question.difficulty === 'DSA & Logic' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {question.difficulty}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                            <Award className="w-3.5 h-3.5" /> +{question.xp_reward} XP
                        </div>
                        <button
                            onClick={executeCode}
                            disabled={isRunning}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            COMPILE & RUN
                        </button>
                    </div>
                </div>
            </nav>

            {/* SPLIT WORKSPACE */}
            <main className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">

                {/* LEFT PANE: DESCRIPTION */}
                <div className="w-[35%] bg-[#0e131f] border-r border-white/10 overflow-y-auto p-6 flex flex-col custom-scrollbar">
                    <h2 className="text-xl font-black mb-4">{question.title}</h2>
                    <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-8">
                        {question.description}
                    </div>

                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Public Test Cases</h3>
                    <div className="space-y-4">
                        {question.public_test_cases.map((tc: any, i: number) => (
                            <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-xs">
                                <div className="mb-2"><span className="text-gray-500">Input:</span> <span className="text-blue-300">{tc.input}</span></div>
                                <div><span className="text-gray-500">Expected Output:</span> <span className="text-green-300">{tc.expected}</span></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANE: EDITOR & TERMINAL */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* MONACO EDITOR */}
                    <div className="flex-1 relative border-b border-white/10">
                        <Editor
                            height="100%"
                            language={languageSlug === 'cpp' ? 'cpp' : languageSlug}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "JetBrains Mono, monospace",
                                padding: { top: 20 },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                            }}
                        />
                    </div>

                    {/* TERMINAL CONSOLE */}
                    <div className="h-[30%] bg-[#07090e] flex flex-col relative shrink-0">
                        <div className="bg-[#0e131f] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-bold text-gray-400">
                            <span className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> SYSTEM CONSOLE</span>
                            <span className="font-mono">{languageSlug} engine</span>
                        </div>

                        <div className="p-4 overflow-y-auto font-mono text-xs text-gray-300 whitespace-pre-wrap flex-1 custom-scrollbar">
                            {output}

                            {/* Test Results Visualizer */}
                            {testResults.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                    {testResults.map((res, i) => (
                                        <div key={i} className={`p-3 rounded-lg border ${res.passed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                            <div className="flex items-center gap-2 font-bold mb-1">
                                                {res.passed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                                <span className={res.passed ? "text-green-400" : "text-red-400"}>Test Case {res.testNumber} {res.isHidden && "(Hidden)"}</span>
                                            </div>
                                            {!res.passed && !res.isHidden && (
                                                <div className="mt-2 text-gray-400">
                                                    <div>Input: <span className="text-white">{res.input}</span></div>
                                                    <div>Expected: <span className="text-green-300">{res.expected}</span></div>
                                                    <div>Output: <span className="text-red-300">{res.actual}</span></div>
                                                    {res.error && <div className="text-red-500 mt-1">Syntax Log: {res.error}</div>}
                                                </div>
                                            )}
                                            {!res.passed && res.isHidden && (
                                                <div className="mt-2 flex items-center gap-1.5 text-yellow-500 opacity-80">
                                                    <ShieldAlert className="w-3.5 h-3.5" /> <span>Hidden logic test failed. Review your edge cases.</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}