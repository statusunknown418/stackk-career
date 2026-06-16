import { env } from "@stackk-career/env/server";
import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Lazily-constructed Resend client. Trigger.dev indexes task files by importing
 * them at build time, where env vars are absent and the `Resend` constructor
 * throws on a missing key. Deferring construction to first call keeps imports
 * side-effect-free, so the client is only built at runtime once the key exists.
 */
export function getResend(): Resend {
	if (!client) {
		client = new Resend(env.RESEND_API_KEY);
	}
	return client;
}
