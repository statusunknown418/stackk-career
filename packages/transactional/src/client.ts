import { env } from "@stackk-career/env/server";
import { Resend } from "resend";

/**
 * Shared Resend client. Constructed at module scope; `@stackk-career/env` skips
 * validation during Trigger.dev deploy indexing, so importing this in a task file
 * never throws before runtime env vars exist.
 */
export const resend = new Resend(env.RESEND_API_KEY);
