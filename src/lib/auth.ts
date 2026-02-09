import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { seedAdmin } from "./seed";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // Ensure the test admin exists
                await seedAdmin();

                const user = await db.query.users.findFirst({
                    where: eq(users.email, credentials.email),
                });

                if (!user) return null;

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) return null;

                // Check if user is approved
                if (user.role === "user" && user.status !== "APPROVED") {
                    throw new Error("Your account is pending approval by an admin.");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role as "admin" | "user",
                    status: user.status as "PENDING" | "APPROVED" | "REJECTED",
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.status = user.status;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.status = token.status;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
