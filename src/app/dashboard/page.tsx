import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const user = session.user as any;

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <h2 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: '700' }}>AppLogo</h2>
                <nav>
                    <ul style={{ listStyle: 'none' }}>
                        <li style={{ marginBottom: '1rem' }}>
                            <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
                        </li>
                        {user.role === "admin" && (
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
                        <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Welcome, {user.name}</h1>
                        <p style={{ color: '#9ca3af' }}>{user.role === 'admin' ? 'Administrator' : 'User'}</p>
                    </div>
                    <LogoutButton />
                </header>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div className="card" style={{ maxWidth: 'none', padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Profile Information</h3>
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Email: {user.email}</p>
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Status: <span className="status-badge status-approved">{user.status}</span></p>
                    </div>

                    <div className="card" style={{ maxWidth: 'none', padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Platform Stats</h3>
                        <p style={{ fontSize: '1.25rem', fontWeight: '700' }}>Active</p>
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Your account is in good standing.</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
