import { customAlphabet } from "nanoid";

/** Slug pendek untuk URL awam — tiada aksara mengelirukan (0/O, 1/l). */
export const newSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
