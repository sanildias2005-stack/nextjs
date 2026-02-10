"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ReactMarkdown from "react-markdown";
import { Youtube, Sparkles, BookOpen, Loader2 } from "lucide-react";

export default function AiNotesPage() {
    const { data: session } = useSession();
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResult("");

        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl: url }),
            });

            const data = await res.json();
            if (res.ok) {
                setResult(data.content);
            } else {
                setError(data.error || "Failed to generate notes");
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
                            <Link href="/dashboard/ai-notes" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>AI Study Notes</Link>
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
                        <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>AI YouTube Summarizer</h1>
                        <p style={{ color: '#9ca3af' }}>Convert video lectures into clean study notes instantly</p>
                    </div>
                    <LogoutButton />
                </header>

                <section style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="card" style={{ maxWidth: 'none', marginBottom: '2rem' }}>
                        <form onSubmit={handleGenerate}>
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
                                {loading ? "Analyzing Video..." : "Generate Study Notes"}
                            </button>
                        </form>
                    </div>

                    {error && (
                        <div className="card" style={{ maxWidth: 'none', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444' }}>
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="card" style={{ maxWidth: 'none', animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <BookOpen style={{ color: 'var(--primary)' }} />
                                <h3 style={{ margin: 0 }}>Generated Study Notes</h3>
                            </div>
                            <div className="markdown-content" style={{ color: '#d1d5db', lineHeight: '1.6' }}>
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </div>
                            <button
                                onClick={() => window.print()}
                                className="action-btn"
                                style={{ marginTop: '2rem', background: 'var(--primary)', color: 'white', border: 'none', padding: '0.8rem 1.5rem' }}
                            >
                                Download as PDF / Print
                            </button>
                        </div>
                    )}
                </section>
            </main>

            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: white;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content li {
          margin-bottom: 0.5rem;
        }
        .markdown-content p {
          margin-bottom: 1rem;
        }
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
