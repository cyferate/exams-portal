import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { language, code, stdin } = await req.json();

        // 1. Fetch the live list of compilers so we never hardcode a dead version
        const listRes = await fetch("https://wandbox.org/api/list.json");
        if (!listRes.ok) throw new Error("Failed to reach Wandbox network.");

        const compilers = await listRes.json();
        let compilerName = "";
        const langLower = language.toLowerCase();

        // 2. Dynamically match the requested language to the latest stable compiler
        if (langLower === "python") {
            const pyCompilers = compilers.filter((c: any) => c.language.toLowerCase() === "python" && c.name.includes("cpython-3."));
            compilerName = pyCompilers[0]?.name || "cpython-head";
        } else if (langLower === "cpp" || langLower === "c++") {
            const cppCompilers = compilers.filter((c: any) => c.language.toLowerCase() === "c++" && c.name.includes("gcc-"));
            compilerName = cppCompilers[0]?.name || "gcc-head";
        } else if (langLower === "c") {
            const cCompilers = compilers.filter((c: any) => c.language.toLowerCase() === "c" && c.name.includes("gcc-"));
            compilerName = cCompilers[0]?.name || "gcc-head-c";
        } else if (langLower === "javascript") {
            const jsCompilers = compilers.filter((c: any) => c.language.toLowerCase() === "javascript" && c.name.includes("nodejs-"));
            compilerName = jsCompilers[0]?.name || "nodejs-head";
        } else {
            throw new Error(`Language ${language} is not configured for Wandbox.`);
        }

        // 3. Execute directly on Wandbox
        const executeRes = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                compiler: compilerName,
                stdin: String(stdin || "")
            })
        });

        if (!executeRes.ok) {
            throw new Error(`Wandbox rejected execution (HTTP ${executeRes.status})`);
        }

        const data = await executeRes.json();

        // 4. Translate Wandbox's response format back to what our frontend expects
        return NextResponse.json({
            run: {
                stdout: data.program_output || data.program_message || "",
                stderr: data.program_error || ""
            },
            compile: {
                stderr: data.compiler_error || "",
                code: data.status === "0" ? 0 : 1
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: "Execution Tunnel Crash", details: error.message },
            { status: 500 }
        );
    }
}