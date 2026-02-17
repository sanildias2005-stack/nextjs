"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ReactMarkdown from "react-markdown";
import { Youtube, Sparkles, BookOpen, Loader2, Upload, FileText, Send, MessageSquare, X, Paperclip } from "lucide-react";

export default function AiStudioPage() {
    const { data: session } = useSession();

    // Tab State
    const [activeTab, setActiveTab] = useState<"youtube" | "document">("youtube");

    // YouTube State
    const [url, setUrl] = useState("");

    // Document State
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Common State
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState("");
    const [fullText, setFullText] = useState(""); // Stores transcript or parsed doc text
    const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
    const [question, setQuestion] = useState("");
    const [error, setError] = useState("");

    const resetAll = () => {
        setSummary("");
        setFullText("");
        setChat([]);
        setError("");
        setQuestion("");
    };

    const handleYoutubeGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSummary("");
        setFullText("");
        setChat([]);

        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl: url }),
            });

            const data = await res.json();
            if (res.ok) {
                setSummary(data.content);
                // We assume the summarize API is tweaked or we just use the summary as context for now
                // Ideally, the summarize API should return the full transcript in the future if we want deeper QA
                setFullText(data.content);
                setChat([{ role: "system", content: "Video summarized! You can now ask follow-up questions about the content." }]);
            } else {
                setError(data.error || "Failed to generate notes");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDocAnalyze = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        setSummary("");
        setFullText("");
        setChat([]);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/docs/chat", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                const extractedText = data.text || data.docText;
                if (!extractedText) {
                    setError("The file was uploaded but no text could be extracted.");
                    setLoading(false);
                    return;
                }
                setFullText(extractedText);
                // Automatically generate a summary for the doc too
                generateDocSummary(extractedText);
            } else {
                setError(data.error || "Failed to upload document. Please check the file format.");
                setLoading(false);
            }
        } catch (err) {
            setError("An unexpected error occurred during upload");
            setLoading(false);
        }
    };

    const generateDocSummary = async (text: string) => {
        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl: "document_content", docText: text }), // Mocking a doc summary request
            });
            // Note: We might need to update the summarize API to handle direct text
            const data = await res.json();
            setSummary(data.content || "Document parsed. Ask questions below.");
            setChat([{ role: "system", content: "Document analyzed! You can now ask questions about it." }]);
        } catch (e) {
            setSummary("Document parsed. Ask questions below.");
        } finally {
            setLoading(false);
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question || !fullText) return;

        const userMsg = { role: "user", content: question };
        setChat((prev) => [...prev, userMsg]);
        setLoading(true);
        setQuestion("");
        setError("");

        const formData = new FormData();
        formData.append("docText", fullText);
        formData.append("question", question);

        try {
            const res = await fetch("/api/docs/chat", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setChat((prev) => [...prev, { role: "assistant", content: data.answer }]);
            } else {
                setError(data.error || "Failed to get answer");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <h2 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: '700' }}>AppLogo</h2>
                <nav>
                    <ul style={{ listStyle: 'none' }}>
                        <li style={{ marginBottom: '1rem' }}>
                            <Link href="/dashboard" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
                        </li>
                        <li style={{ marginBottom: '1rem' }}>
                            <Link href="/dashboard/ai-notes" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>AI Studio</Link>
                        </li>
                        {(session?.user as any)?.role === "admin" && (
                            <li style={{ marginBottom: '1rem' }}>
                                <Link href="/admin" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>Admin Panel</Link>
                            </li>
                        )}
                    </ul>
                </nav>
            </aside>

            <main className="main-content">
                <header className="header">
                    <div>
                        <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI Studio</h1>
                        <p style={{ color: '#9ca3af' }}>Summarize videos or documents and chat with them</p>
                    </div>
                    <LogoutButton />
                </header>

                <section style={{ maxWidth: '1000px', margin: '0 auto' }}>

                    {/* Tool Tabs */}
                    {!fullText && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => { setActiveTab("youtube"); resetAll(); }}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border)',
                                    background: activeTab === 'youtube' ? 'var(--primary)' : 'var(--glass)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Youtube size={18} /> YouTube
                            </button>
                            <button
                                onClick={() => { setActiveTab("document"); resetAll(); }}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border)',
                                    background: activeTab === 'document' ? 'var(--primary)' : 'var(--glass)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <FileText size={18} /> Document
                            </button>
                        </div>
                    )}

                    {/* Input Card */}
                    {!fullText && (
                        <div className="card" style={{ maxWidth: 'none', marginBottom: '2rem' }}>
                            {activeTab === "youtube" ? (
                                <form onSubmit={handleYoutubeGenerate}>
                                    <div className="form-group">
                                        <label className="label">Paste YouTube Video URL</label>
                                        <div style={{ position: 'relative' }}>
                                            <Youtube style={{ position: 'absolute', left: '12px', top: '12px', color: '#ef4444' }} size={20} />
                                            <input
                                                type="url"
                                                className="input"
                                                style={{ paddingLeft: '40px' }}
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="button" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                        {loading ? "Analyzing..." : "Summarize Video"}
                                    </button>
                                </form>
                            ) : (
                                <div
                                    style={{
                                        border: '2px dashed var(--border)',
                                        borderRadius: '1rem',
                                        padding: '2.5rem',
                                        textAlign: 'center',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input type="file" hidden ref={fileInputRef} onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }} accept=".pdf,.txt" />
                                    {file ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <FileText size={40} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
                                            <p style={{ fontSize: '0.875rem' }}>{file.name}</p>
                                            <button
                                                className="button"
                                                onClick={(e) => { e.stopPropagation(); handleDocAnalyze(); }}
                                                disabled={loading}
                                                style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
                                            >
                                                {loading ? "Analyzing..." : "Analyze Document"}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Paperclip size={30} style={{ color: '#9ca3af', marginBottom: '10px' }} />
                                            <p style={{ color: '#9ca3af' }}>Click to select PDF or TXT</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="card" style={{ maxWidth: 'none', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    {/* Results Area */}
                    {fullText && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                            {/* Left Side: Summary */}
                            <div className="card" style={{ maxWidth: 'none', animation: 'fadeIn 0.5s ease', overflowY: 'auto', maxHeight: '700px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <BookOpen style={{ color: 'var(--primary)' }} />
                                        <h3 style={{ margin: 0 }}>Study Notes</h3>
                                    </div>
                                    <button onClick={resetAll} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="markdown-content">
                                    <ReactMarkdown>{summary}</ReactMarkdown>
                                </div>
                            </div>

                            {/* Right Side: Chat */}
                            <div className="card" style={{ maxWidth: 'none', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '700px', background: 'rgba(255,255,255,0.02)' }}>
                                <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                    <MessageSquare size={18} /> Ask AI
                                </h3>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                    {chat.map((msg, i) => (
                                        <div key={i} style={{
                                            padding: '0.75rem',
                                            borderRadius: '0.75rem',
                                            background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            maxWidth: '90%'
                                        }}>
                                            {msg.content}
                                        </div>
                                    ))}
                                    {loading && <Loader2 className="animate-spin" size={16} />}
                                </div>
                                <form onSubmit={handleAsk} style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Ask follow-up..."
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    <button type="submit" className="button" style={{ padding: '0 0.75rem', width: 'auto', marginTop: 0 }}>
                                        <Send size={16} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
