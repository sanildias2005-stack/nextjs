import { NextRequest, NextResponse } from "next/server";
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

        let contentToAnalyze = docText;

        // If a new file is uploaded, parse it
        if (file) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            if (file.type === "application/pdf") {
                const data = await pdf(buffer);
                contentToAnalyze = data.text;
            } else {
                contentToAnalyze = buffer.toString("utf-8");
            }
        }

        if (!contentToAnalyze) {
            return NextResponse.json({ error: "No document content found." }, { status: 400 });
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
