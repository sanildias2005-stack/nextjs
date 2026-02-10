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

export const savedNotes = pgTable("saved_notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoTitle: text("video_title"),
  videoUrl: text("video_url").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
