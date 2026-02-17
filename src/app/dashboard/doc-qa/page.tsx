"use client";

// ... imports
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ReactMarkdown from "react-markdown";
import { FileText, Upload, Send, Loader2, MessageSquare, Paperclip, X, User, Bot, Search, Trash2 } from "lucide-react";

type Doc = { id: string; name: string };

export default function DocQaPage() {
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);
    const [workspaceDocs, setWorkspaceDocs] = useState<Doc[]>([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [chat, setChat] = useState<{ role: string; content: string; sources?: string[] }[]>([]);
    const [error, setError] = useState("");
    const [deepSearch, setDeepSearch] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Fetch documents on load
    useEffect(() => {
        fetchDocs();
    }, [session]);

    const fetchDocs = async () => {
        try {
            const res = await fetch("/api/docs/chat");
            if (res.ok) {
                const data = await res.json();
                setWorkspaceDocs(data);
            }
        } catch (e) {
            console.error("Failed to fetch docs", e);
        }
    };

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chat]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
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
                setFile(null);
                fetchDocs(); // Refresh list
                setChat(prev => [...prev, { role: "system", content: `File "${file.name}" added to workspace.` }]);
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
        if (!question) return;

        const userMsg = { role: "user", content: question };
        setChat((prev) => [...prev, userMsg]);
        setLoading(true);
        setQuestion("");
        setError("");

        const formData = new FormData();
        formData.append("question", question);
        formData.append("deepSearch", String(deepSearch));

        try {
            const res = await fetch("/api/docs/chat", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setChat((prev) => [...prev, { role: "assistant", content: data.answer, sources: data.sources }]);
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
                        <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI Workspace</h1>
                        <p style={{ color: '#9ca3af' }}>Chat with all your documents + Deep Search</p>
                    </div>
                    <LogoutButton />
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', height: 'calc(100vh - 200px)' }}>

                    {/* Left Column: Documents */}
                    <div className="card" style={{ maxWidth: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={20} /> My Documents
                        </h3>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {workspaceDocs.length === 0 ? (
                                <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>No documents yet.</p>
                            ) : (
                                workspaceDocs.map(doc => (
                                    <div key={doc.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '0.5rem', fontSize: '0.875rem'
                                    }}>
                                        <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Upload Area */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            {!file ? (
                                <button
                                    className="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ background: 'var(--glass)', border: '1px dashed var(--border)', color: '#9ca3af', marginTop: 0 }}
                                >
                                    <Upload size={16} style={{ marginRight: '8px' }} /> Upload New PDF/TXT
                                </button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'white' }}>{file.name}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="button" onClick={handleUpload} disabled={loading} style={{ marginTop: 0, flex: 1 }}>
                                            {loading ? <Loader2 className="animate-spin" /> : "Add to Workspace"}
                                        </button>
                                        <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt" />
                            {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>}
                        </div>
                    </div>

                    {/* Right Column: Chat */}
                    <div className="card" style={{ maxWidth: 'none', display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>

                        {/* Chat Messages */}
                        <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {chat.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '3rem' }}>
                                    <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Ask a question across your entire workspace.</p>
                                    <p style={{ fontSize: '0.875rem' }}>Try enabling Deep Search for web results.</p>
                                </div>
                            )}
                            {chat.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div style={{ maxWidth: '80%' }}>
                                        <div style={{
                                            background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            padding: '1rem', borderRadius: '1rem',
                                            color: msg.role === 'user' ? 'white' : '#d1d5db'
                                        }}>
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '600' }}>Sources:</span>
                                                {msg.sources.map((s, idx) => (
                                                    <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{s}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bot size={16} />
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem' }}>
                                        <Loader2 className="animate-spin" size={18} />
                                        <span style={{ marginLeft: '10px', fontSize: '0.875rem', color: '#9ca3af' }}>Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                            <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="deepSearch"
                                        checked={deepSearch}
                                        onChange={(e) => setDeepSearch(e.target.checked)}
                                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="deepSearch" style={{ fontSize: '0.875rem', color: deepSearch ? 'var(--primary)' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Search size={14} /> Enable Deep Search (Web)
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Ask about your documents or search the web..."
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        disabled={loading}
                                        style={{ flex: 1 }}
                                    />
                                    <button type="submit" className="button" style={{ width: 'auto', padding: '0 1.5rem', marginTop: 0 }} disabled={loading || !question}>
                                        <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
