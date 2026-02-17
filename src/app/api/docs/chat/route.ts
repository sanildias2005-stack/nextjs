import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";
const pdf = require("pdf-parse");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const question = formData.get("question") as string;
        const docText = formData.get("docText") as string;

        let contentToAnalyze = docText || "";

        // If a new file is uploaded, parse it
        if (file) {
            try {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                if (file.type === "application/pdf") {
                    const data = await pdf(buffer).catch((err: any) => {
                        console.error("PDF Parse Error Internal:", err);
                        throw new Error("Failed to parse PDF content. It might be encrypted or corrupted.");
                    });
                    contentToAnalyze = data.text;
                } else {
                    contentToAnalyze = buffer.toString("utf-8");
                }
            } catch (fileErr: any) {
                return NextResponse.json({ error: "File processing error: " + fileErr.message }, { status: 400 });
            }
        }

        if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
            return NextResponse.json({ error: "Could not extract any text from the document. Please try a different file." }, { status: 400 });
        }

        if (!question) {
            // If no question, just return the parsed text so the client can store it
            return NextResponse.json({ text: contentToAnalyze });
        }

        // 2. AI QA
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Use the following document content to answer the user's question. If the answer is not in the document, say so. Keep the answer concise.\n\nDOCUMENT CONTENT:\n" + contentToAnalyze.substring(0, 30000),
                },
                {
                    role: "user",
                    content: question,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });

        return NextResponse.json({
            answer: completion.choices[0]?.message?.content || "No answer generated.",
            docText: contentToAnalyze // Send back to client to avoid re-parsing
        });

    } catch (error: any) {
        console.error("Doc QA Error:", error);
        return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
    }
}
