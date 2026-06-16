import { Section, Text } from "@react-email/components";
import { EmailLayout } from "./components/layout";
import { CtaButton, heading, paragraph } from "./components/ui";

export interface EngagementNudgeEmailProps {
	appUrl: string;
	name: string | null;
}

export function EngagementNudgeEmail({ name, appUrl }: EngagementNudgeEmailProps) {
	return (
		<EmailLayout appUrl={appUrl} preview="Tu primer CV te está esperando">
			<Section>
				<Text style={heading}>{name ? `Hola, ${name}` : "Hola"}, tu primer CV te está esperando</Text>
				<Text style={paragraph}>
					Notamos que aún no has creado tu CV en Assendia. Crear uno toma solo unos minutos y puedes empezar desde cero
					o dejar que nuestra IA lo arme por ti a partir de tu experiencia.
				</Text>
				<Text style={paragraph}>Un buen CV es el primer paso para conseguir más entrevistas. ¿Lo intentamos hoy?</Text>
				<Section style={{ margin: "24px 0 8px" }}>
					<CtaButton href={appUrl}>Crear mi CV ahora</CtaButton>
				</Section>
			</Section>
		</EmailLayout>
	);
}

EngagementNudgeEmail.PreviewProps = {
	appUrl: "https://app.stackk.career",
	name: "Ana",
} satisfies EngagementNudgeEmailProps;

export default EngagementNudgeEmail;
