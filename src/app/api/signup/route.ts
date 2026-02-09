import { db } from "@/lib/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { seedAdmin } from "@/lib/seed";

export async function POST(req: Request) {
    try {
        // Ensure the test admin account exists
        await seedAdmin();

        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // For the very first user, let's make them an admin automatically if we want, 
        // or just leave it to the user to manually set one in DB.
        // Let's check if any users exist.
        const userCount = await db.query.users.findMany({ limit: 1 });
        const role = userCount.length === 0 ? "admin" : "user";
        const status = role === "admin" ? "APPROVED" : "PENDING";

        await db.insert(users).values({
            id: uuidv4(),
            name,
            email,
            password: hashedPassword,
            role,
            status,
        });

        return NextResponse.json({ message: "User created" }, { status: 201 });
    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "User already exists or other error" }, { status: 500 });
    }
}
