import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allUsers = await db.query.users.findMany({
        columns: {
            password: false,
        },
    });

    return NextResponse.json(allUsers);
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, status } = await req.json();

    if (!userId || !status) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await db.update(users).set({ status }).where(eq(users.id, userId));

    return NextResponse.json({ message: "User status updated" });
}
