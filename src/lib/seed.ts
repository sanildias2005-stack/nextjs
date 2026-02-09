import { db } from "./db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function seedAdmin() {
    const adminEmail = "test@test.com";
    const adminPassword = "Test123@123";

    // Check if admin already exists
    const existingAdmin = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, adminEmail),
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await db.insert(users).values({
            id: uuidv4(),
            name: "Test Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "admin",
            status: "APPROVED",
        });
        console.log("Admin seeded successfully: test@test.com / Test123@123");
    } else {
        console.log("Admin already exists.");
    }
}
