import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedNotes } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { videoUrl, docText } = await req.json();

        let transcriptText = "";

        if (docText) {
            transcriptText = docText;
        } else if (videoUrl) {
            // 1. Fetch Transcript for YouTube
            try {
                const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
                transcriptText = transcript.map((t: any) => t.text).join(" ");
            } catch (e) {
                console.error("Transcript error:", e);
                return NextResponse.json({ error: "Could not fetch transcript. Make sure the video has captions enabled." }, { status: 400 });
            }
        }

        if (!transcriptText || transcriptText.length < 50) {
            return NextResponse.json({ error: "Content too short to summarize." }, { status: 400 });
        }

        // 2. AI Summarization
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
      You are an expert academic assistant. I will provide a transcript of a YouTube video. 
      Please provide:
      1. A concise summary of the video.
      2. Detailed, high-quality study notes organized with bullet points and headers.
      3. Key takeaways.
      
      Format the output in clean Markdown.
      
      Transcript: ${transcriptText.substring(0, 15000)} // Limiting size for safety
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiContent = response.text();

        // 3. Optional: Auto-save to DB (can be triggered by user later, but let's return it for now)

        return NextResponse.json({
            content: aiContent,
            videoUrl: videoUrl
        });

    } catch (error: any) {
        console.error("AI Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
