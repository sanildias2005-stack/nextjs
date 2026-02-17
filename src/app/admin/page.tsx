"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated" || (session?.user as any)?.role !== "admin") {
            router.push("/dashboard");
        } else if (status === "authenticated") {
            fetchUsers();
        }
    }, [status, session]);

    const fetchUsers = async () => {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        setUsers(data);
        setLoading(false);
    };

    const handleUpdateStatus = async (userId: string, newStatus: string) => {
        const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, status: newStatus }),
        });

        if (res.ok) {
            setUsers((prev: any) =>
                prev.map((u: any) => (u.id === userId ? { ...u, status: newStatus } : u))
            );
        }
    };

    if (status === "loading" || loading) return <div style={{ background: '#0a0a0a', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Panel...</div>;

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
                            <Link href="/dashboard/doc-qa" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: '500' }}>Doc QA Tool</Link>
                        </li>
                        <li style={{ marginBottom: '1rem' }}>
                            <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>Admin Panel</Link>
                        </li>
                    </ul>
                </nav>
            </aside>

            <main className="main-content">
                <header className="header">
                    <div>
                        <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Admin Control Panel</h1>
                        <p style={{ color: '#9ca3af' }}>Manage user approvals and roles</p>
                    </div>
                    <LogoutButton />
                </header>

                <section>
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{user.role}</td>
                                    <td>
                                        <span className={`status-badge status-${user.status.toLowerCase()}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td>
                                        {user.status === "PENDING" && (
                                            <>
                                                <button className="action-btn" onClick={() => handleUpdateStatus(user.id, "APPROVED")} style={{ color: '#10b981' }}>Approve</button>
                                                <button className="action-btn" onClick={() => handleUpdateStatus(user.id, "REJECTED")} style={{ color: '#ef4444' }}>Reject</button>
                                            </>
                                        )}
                                        {user.status === "APPROVED" && user.role !== "admin" && (
                                            <button className="action-btn" onClick={() => handleUpdateStatus(user.id, "REJECTED")} style={{ color: '#ef4444' }}>Suspend</button>
                                        )}
                                        {user.status === "REJECTED" && (
                                            <button className="action-btn" onClick={() => handleUpdateStatus(user.id, "APPROVED")} style={{ color: '#10b981' }}>Re-approve</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
}
