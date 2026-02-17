import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";
import { db } from "@/lib/db";
import { documents, documentMessages } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
// import FirecrawlApp from "@mendable/firecrawl-js"; // Uncomment when ready to use real API
// @ts-ignore
import PDFParser from "pdf2json";
import mammoth from "mammoth";

export const dynamic = 'force-dynamic';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "dummy_key_for_build",
});

// Mock Firecrawl for now or use if key is available
const searchWeb = async (query: string) => {
    console.log(`Searching web for: ${query}`);
    // Real implementation would use FirecrawlApp here
    // const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    // const searchResponse = await app.search(query);
    // return searchResponse.data;

    // Mock response for testing
    return `[Web Search Results for "${query}"]\n- Next.js 15 RC is now available.\n- France is a country in Western Europe.`;
};

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const question = formData.get("question") as string;
        const useDeepSearch = formData.get("deepSearch") === "true";

        // 1. Handle File Upload (Add to Workspace)
        if (file) {
            console.log(`[Upload] Starting processing for file: ${file.name} (${file.type})`);

            try {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                let content = "";
                let fileType = "text";

                if (file.type === "application/pdf") {
                    console.log("[Upload] Parsing PDF...");
                    fileType = "pdf";
                    const parser = new PDFParser(null, true); // true = enable raw text extraction

                    content = await new Promise((resolve, reject) => {
                        parser.on("pdfParser_dataError", (errData: any) => {
                            console.error("[Upload] PDF Error:", errData);
                            reject(new Error(errData.parserError));
                        });
                        parser.on("pdfParser_dataReady", (pdfData: any) => {
                            // @ts-ignore
                            const rawText = parser.getRawTextContent();
                            console.log(`[Upload] PDF parsed. Length: ${rawText.length}`);
                            resolve(rawText);
                        });
                        parser.parseBuffer(buffer);
                    });
                } else if (
                    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                    file.name.endsWith(".docx")
                ) {
                    fileType = "docx";
                    const result = await mammoth.extractRawText({ buffer: buffer });
                    content = result.value;
                } else {
                    content = buffer.toString("utf-8");
                }

                if (!content || !content.trim()) {
                    return NextResponse.json({ error: "Empty or unreadable file content." }, { status: 400 });
                }

                // Save new document to DB (User's Workspace)
                await db.insert(documents).values({
                    id: uuidv4(),
                    userId: session.user.id,
                    name: file.name,
                    content: content,
                    fileType: fileType,
                });
            } catch (fileErr: any) {
                console.error("File Parse Error:", fileErr);
                return NextResponse.json({ error: "File upload failed: " + fileErr.message }, { status: 400 });
            }
        }

        // Return early if just uploading
        if (!question) {
            // Fetch updated list of docs
            const userDocs = await db.select().from(documents).where(eq(documents.userId, session.user.id));
            return NextResponse.json({
                message: "File uploaded successfully.",
                documents: userDocs.map(d => ({ id: d.id, name: d.name }))
            });
        }

        // 2. Handle Question (Multi-Doc + Deep Search)

        // A. Fetch all User Documents
        const userDocs = await db.select().from(documents).where(eq(documents.userId, session.user.id));

        let context = "";
        const sourceNames = userDocs.map(d => d.name);

        // Combine Document Content (Truncate each to avoid massive context flow if needed, or rely on large context window)
        userDocs.forEach(doc => {
            context += `\n--- DOCUMENT: ${doc.name} ---\n${doc.content.substring(0, 10000)}\n`;
        });

        if (!context && !useDeepSearch) {
            return NextResponse.json({ error: "No documents found in workspace. Upload a file first." }, { status: 400 });
        }

        // B. Deep Search (Optional)
        let searchContext = "";
        if (useDeepSearch) {
            const searchResults = await searchWeb(question);
            searchContext = `\n--- WEB SEARCH RESULTS ---\n${searchResults}\n`;
        }

        // C. Generate Answer using Groq
        const systemPrompt = `You are an advanced AI assistant for a document workspace.
Answer the user's question based primarily on the provided DOCUMENT CONTENT.
If "Web Search Results" are provided, use them to supplement your answer, especially for current events or general knowledge not in the docs.
CITE YOUR SOURCES. When using information from a specific document, mention it like (Source: DocumentName). When using web search, mention (Source: Web Search).
If the answer is not found in the documents or web search, say "I couldn't find information about that in your workspace."

CONTEXT:
${context}
${searchContext}
`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question },
            ],
            model: "llama-3.3-70b-versatile",
        });

        const answer = completion.choices[0]?.message?.content || "No answer generated.";

        // Save Chat History (Linked to User directly since it's a workspace chat, or link to a 'general' doc ID if needed)
        // For now, we just return the answer. Ideally, create a 'conversations' table.

        return NextResponse.json({
            answer,
            sources: sourceNames,
            isDeepSearch: useDeepSearch
        });

    } catch (error: any) {
        console.error("Workspace QA Error:", error);
        return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userDocs = await db.select().from(documents).where(eq(documents.userId, session.user.id));
        return NextResponse.json(userDocs.map(d => ({ id: d.id, name: d.name, createdAt: d.createdAt })));
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}
