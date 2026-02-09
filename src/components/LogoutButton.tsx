"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
                padding: '0.6rem 1.2rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)';
            }}
        >
            Sign Out
        </button>
    );
}
