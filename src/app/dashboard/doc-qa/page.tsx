"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ReactMarkdown from "react-markdown";
import { FileText, Upload, Send, Loader2, MessageSquare, Paperclip, X } from "lucide-react";

export default function DocQaPage() {
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);
    const [docText, setDocText] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setDocText(""); // Reset text when new file is selected
            setDocumentId(""); // Reset ID
            setChat([]); // Clear chat for new doc
            setError("");
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/docs/chat", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setDocText(data.text);
                setDocumentId(data.documentId);
                setChat([{ role: "system", content: `Document "${file.name}" uploaded and parsed successfully. You can now ask questions about it.` }]);
            } else {
                setError(data.error || "Failed to upload document");
            }
        } catch (err) {
            setError("An unexpected error occurred during upload");
        } finally {
            setLoading(false);
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question || (!file && !docText)) return;

        const userMsg = { role: "user", content: question };
        setChat((prev) => [...prev, userMsg]);
        setLoading(true);
        setQuestion("");
        setError("");

        const formData = new FormData();
        if (file && !docText) {
            formData.append("file", file);
        }
        formData.append("docText", docText);
        formData.append("documentId", documentId);
        formData.append("question", question);

        try {
            const res = await fetch("/api/docs/chat", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                if (data.docText) setDocText(data.docText);
                if (data.documentId) setDocumentId(data.documentId);
                setChat((prev) => [...prev, { role: "assistant", content: data.answer }]);
            } else {
                setError(data.error || "Failed to get answer");
                setChat((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error answering that." }]);
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
                            <Link href="/dashboard/ai-notes" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>AI Study Notes</Link>
                        </li>
                        <li style={{ marginBottom: '1rem' }}>
                            <Link href="/dashboard/doc-qa" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>Doc QA Tool</Link>
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
                        <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI Document QA</h1>
                        <p style={{ color: '#9ca3af' }}>Upload a PDF or Text file and ask questions about its content</p>
                    </div>
                    <LogoutButton />
                </header>

                <section style={{ display: 'grid', gridTemplateColumns: docText ? '350px 1fr' : '1fr', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

                    {/* Sidebar / Upload Area */}
                    <div className="card" style={{ maxWidth: 'none', height: 'fit-content' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Upload size={20} />
                            {docText ? "Document Active" : "Upload Document"}
                        </h3>

                        {!docText ? (
                            <div
                                style={{
                                    border: '2px dashed var(--border)',
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                            >
                                <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt" />
                                {file ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <FileText size={40} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
                                        <p style={{ fontSize: '0.875rem', fontWeight: '500' }}>{file.name}</p>
                                        <button
                                            className="button"
                                            onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                            disabled={loading}
                                            style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
                                        >
                                            {loading ? "Parsing..." : "Analyze File"}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Paperclip size={30} style={{ color: '#9ca3af', marginBottom: '10px' }} />
                                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Click to select PDF or TXT</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={20} style={{ color: 'var(--primary)' }} />
                                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{file?.name}</span>
                                    </div>
                                    <button onClick={() => { setDocText(""); setFile(null); setChat([]); setDocumentId(""); }} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '10px' }}>
                                    Ready for questions. Context limit: ~30,000 characters.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div style={{ marginTop: '1rem', color: '#ef4444', fontSize: '0.875rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem' }}>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    {docText && (
                        <div className="card" style={{ maxWidth: 'none', display: 'flex', flexDirection: 'column', height: '600px', backgroundImage: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.03), transparent)' }}>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                {chat.map((msg, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            maxWidth: '80%',
                                            padding: '1rem',
                                            borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                                            background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                                            color: msg.role === 'user' ? 'white' : '#d1d5db',
                                            border: msg.role === 'system' ? '1px dashed var(--border)' : 'none',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ))}
                                {loading && (
                                    <div style={{ alignSelf: 'flex-start', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1rem 1rem 1rem 0' }}>
                                        <Loader2 className="animate-spin" size={18} />
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAsk} style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ask a question about this document..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    disabled={loading}
                                />
                                <button type="submit" className="button" style={{ width: 'auto', padding: '0 1.5rem', marginTop: 0 }} disabled={loading || !question}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    )}

                </section>
            </main>

            <style jsx global>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
