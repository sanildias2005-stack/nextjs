import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";
import { db } from "@/lib/db";
import { documents, documentMessages } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";

export const dynamic = 'force-dynamic';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "dummy_key_for_build",
});

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const question = formData.get("question") as string;
        const docTextParam = formData.get("docText") as string;
        let documentId = formData.get("documentId") as string;

        let contentToAnalyze = docTextParam || "";

        // 1. Handle File Upload
        if (file) {
            try {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                if (file.type === "application/pdf") {
                    // @ts-ignore
                    const pdf = require("pdf-parse");
                    const data = await pdf(buffer).catch((err: any) => {
                        console.error("PDF Parse Error Internal:", err);
                        throw new Error("Failed to parse PDF content. It might be encrypted or corrupted.");
                    });
                    contentToAnalyze = data.text;
                } else {
                    contentToAnalyze = buffer.toString("utf-8");
                }

                if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
                    return NextResponse.json({ error: "Could not extract text from document." }, { status: 400 });
                }

                // Save to DB
                // Only save if it's a new file (we assume file presence means new upload)
                const newDocId = uuidv4();
                await db.insert(documents).values({
                    id: newDocId,
                    userId: session.user.id,
                    name: file.name,
                    content: contentToAnalyze,
                    fileType: file.type === "application/pdf" ? "pdf" : "text",
                });
                documentId = newDocId;

            } catch (fileErr: any) {
                return NextResponse.json({ error: "File processing error: " + fileErr.message }, { status: 400 });
            }
        }

        // Return early if just uploading (no question)
        if (!question) {
            return NextResponse.json({
                text: contentToAnalyze,
                documentId
            });
        }

        // 2. Handle Question (AI QA)
        if (!contentToAnalyze) {
            return NextResponse.json({ error: "No document content provided." }, { status: 400 });
        }

        // Save User Message
        if (documentId) {
            await db.insert(documentMessages).values({
                id: uuidv4(),
                documentId,
                userId: session.user.id,
                role: "user",
                content: question,
            });
        }

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

        const answer = completion.choices[0]?.message?.content || "No answer generated.";

        // Save Assistant Message
        if (documentId) {
            await db.insert(documentMessages).values({
                id: uuidv4(),
                documentId,
                userId: session.user.id,
                role: "assistant",
                content: answer,
            });
        }

        return NextResponse.json({
            answer,
            docText: contentToAnalyze,
            documentId
        });

    } catch (error: any) {
        console.error("Doc QA Error:", error);
        return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
    }
}
