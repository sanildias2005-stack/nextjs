import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<"admin" | "user">().default("user"),
  status: text("status").$type<"PENDING" | "APPROVED" | "REJECTED">().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
});
