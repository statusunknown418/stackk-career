import { createHash } from "node:crypto";
import { getTriggerDb } from "@stackk-career/db/http";
import { user } from "@stackk-career/db/schema/auth";
import { env } from "@stackk-career/env/server";
import { getResend } from "@stackk-career/transactional/client";
import { logger, schedules } from "@trigger.dev/sdk";
import { subDays } from "date-fns";
import { and, asc, gt, lte } from "drizzle-orm";

const FEEDBACK_REQUEST_SUBJECT = "Feedback sobre Assendia";
const CSV_COLUMNS = ["email", "name", "subject", "body", "mailto", "userId", "createdAt"] as const;
const FROM_ADDRESS = /<([^>]+)>/;
const WHITESPACE = /\s+/;

interface FeedbackRequestCandidate {
	createdAt: Date;
	email: string;
	name: string | null;
	userId: string;
}

interface FeedbackRequestWindow {
	from: Date;
	to: Date;
}

function feedbackRequestBody(name: string | null): string {
	const trimmedName = name?.trim();
	const recipientName = trimmedName ? (trimmedName.split(WHITESPACE).at(0) ?? trimmedName) : null;
	const greeting = recipientName ? `Hola ${recipientName}!` : "Hola que tal!";
	return `${greeting}

Te escribe Alvaro, co-fundador de Stackk Studios, la compañía detrás de Assendia (https://assendia.com). Vi que estuviste probando la app y me encantaría entender cómo fue tu experiencia.

Si tienes un minuto, me podrías contar qué parte te resultó útil, qué te confundió o qué cambiarías para que Assendia sea mejor?

Tu feedback como early user nos ayuda muchísimo. Puedes responder directamente a este email - los escribo yo personalmente y leo todas las respuestas.

Gracias por probar Assendia,

Alvaro
CEO & Co-founder, stackkstudios.com`;
}

function csvCell(value: Date | string | null): string {
	const text = value instanceof Date ? value.toISOString() : (value ?? "");
	return `"${text.replaceAll('"', '""')}"`;
}

function feedbackRequestCsv(candidates: readonly FeedbackRequestCandidate[]): string {
	const rows = candidates.map((candidate) => {
		const body = feedbackRequestBody(candidate.name);
		return [
			candidate.email,
			candidate.name,
			FEEDBACK_REQUEST_SUBJECT,
			body,
			`mailto:${candidate.email}?subject=${encodeURIComponent(FEEDBACK_REQUEST_SUBJECT)}&body=${encodeURIComponent(body)}`,
			candidate.userId,
			candidate.createdAt,
		]
			.map(csvCell)
			.join(",");
	});

	return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

async function selectNewUsersForFeedback(window: FeedbackRequestWindow): Promise<FeedbackRequestCandidate[]> {
	const db = getTriggerDb();

	const rows = await db
		.select({
			createdAt: user.createdAt,
			email: user.email,
			name: user.name,
			userId: user.id,
		})
		.from(user)
		.where(and(gt(user.createdAt, window.from), lte(user.createdAt, window.to)))
		.orderBy(asc(user.createdAt));

	return rows.map((row) => ({ ...row, name: row.name ?? null }));
}

interface SendFeedbackExportEmailInput {
	count: number;
	csv: string;
	filename: string;
	window: FeedbackRequestWindow;
}

function feedbackExportIdempotencyKey({
	count,
	csv,
	filename,
	sentTo,
	window,
}: SendFeedbackExportEmailInput & { sentTo: string }): string {
	const digest = createHash("sha256")
		.update(
			[env.EMAIL_FROM, sentTo, count, filename, window.from.toISOString(), window.to.toISOString(), csv].join("\0")
		)
		.digest("hex")
		.slice(0, 32);

	return `feedback-request-export:${digest}`;
}

async function sendFeedbackExportEmail({
	count,
	csv,
	filename,
	window,
}: SendFeedbackExportEmailInput): Promise<{ resendId: string; sentTo: string }> {
	const sentTo = env.FEEDBACK_EXPORT_RECIPIENT_EMAIL ?? FROM_ADDRESS.exec(env.EMAIL_FROM)?.[1] ?? env.EMAIL_FROM;
	const { data, error } = await getResend().emails.send(
		{
			from: env.EMAIL_FROM,
			to: sentTo,
			subject: `Assendia feedback CSV (${count} new users)`,
			html: `<p>Attached: ${filename}</p><p>Window: ${window.from.toISOString()} → ${window.to.toISOString()}</p>`,
			attachments: [
				{
					filename,
					content: Buffer.from(csv, "utf8").toString("base64"),
					contentType: "text/csv; charset=utf-8",
				},
			],
		},
		{ idempotencyKey: feedbackExportIdempotencyKey({ count, csv, filename, sentTo, window }) }
	);

	if (error) {
		throw new Error(`Feedback export email failed: ${error.message}`);
	}

	return { resendId: data?.id ?? "", sentTo };
}

/**
 * Daily mail-merge export for new users. The task does NOT send email to users;
 * it emails Alvaro a CSV attachment plus mailto links so each feedback request
 * can still be sent from his own mailbox/email client after review.
 */
export const feedbackRequestExportScheduleTask = schedules.task({
	id: "feedback-request-export",
	cron: { pattern: "30 9 * * *", timezone: "America/Lima" },
	run: async (payload) => {
		const scheduledAt = new Date(payload.timestamp);
		const from = payload.lastTimestamp ? new Date(payload.lastTimestamp) : subDays(scheduledAt, 1);
		const window = { from, to: scheduledAt };
		const candidates = await selectNewUsersForFeedback(window);
		const csv = feedbackRequestCsv(candidates);
		const filename = `feedback-requests-${window.to.toISOString().slice(0, 10)}.csv`;

		const emailDelivery =
			candidates.length > 0 ? await sendFeedbackExportEmail({ count: candidates.length, csv, filename, window }) : null;

		logger.info("feedback-request-export generated", {
			candidates: candidates.length,
			emailDelivery,
			from: window.from.toISOString(),
			to: window.to.toISOString(),
		});

		return {
			count: candidates.length,
			csv,
			emailDelivery,
			filename,
			rows: candidates.map((candidate) => ({
				createdAt: candidate.createdAt.toISOString(),
				email: candidate.email,
				name: candidate.name,
				userId: candidate.userId,
			})),
			window: {
				from: window.from.toISOString(),
				to: window.to.toISOString(),
			},
		};
	},
});
