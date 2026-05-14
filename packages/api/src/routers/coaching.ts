import type { CoachingStage } from "@stackk-career/db/schema/coaching-sessions";

const _STEP_CONTENT: Record<CoachingStage, { description: string; label: string }> = {
	"cv-analysis": {
		description: "Revisión estratégica de CV, gaps y narrativa antes de salir al mercado.",
		label: "Análisis de CV",
	},
	"pre-interview-training": {
		description: "Práctica enfocada en pitch, preguntas críticas y timing de entrevista.",
		label: "Pre-entrevista training",
	},
	"general-coaching": {
		description: "Sesión abierta para targets, negociación, estrategia o bloqueos puntuales.",
		label: "General Coaching",
	},
	"follow-up": {
		description: "Seguimiento para calibrar avances, próximas acciones y feedback real.",
		label: "Follow up",
	},
};

export const coachingRouter = {};
