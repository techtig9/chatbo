import { z } from "zod";

export const addTextSourceSchema = z.object({
  title: z.string().trim().min(1, "Give this source a title").max(200),
  content: z.string().trim().min(20, "Add a bit more content — at least 20 characters"),
});

export const addUrlSourceSchema = z.object({
  url: z.string().trim().url("Enter a valid URL, including https://"),
});

export const addFileSourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  // Text extraction handled at the route level — file *type* validated
  // there against what's actually supported (see route comments).
});


export const SUPPORTED_TEXT_FILE_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
] as const;

export const SUPPORTED_TEXT_FILE_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".htm"] as const;
