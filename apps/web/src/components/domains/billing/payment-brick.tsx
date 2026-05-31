import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { env } from "@stackk-career/env/web";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";

let sdkInitialized = false;

function ensureSdkInitialized(): void {
	if (sdkInitialized) {
		return;
	}
	initMercadoPago(env.VITE_MERCADOPAGO_PUBLIC_KEY, { locale: "es-PE" });
	sdkInitialized = true;
}

export interface PaymentBrickProps {
	/** First-charge display/validation amount in PEN. Recurring amount is governed by the MP plan. */
	amount: number;
	/** Surface a recoverable brick-level error (init/render/processing) to the parent. */
	onBrickError: (message: string) => void;
	/** Forward the card token, device fingerprint, and payer email produced by the brick to the billing mutation. */
	onTokenReady: (args: {
		cardTokenId: string;
		deviceId: string | undefined;
		payerEmail: string | undefined;
	}) => Promise<void>;
	/** Pre-fill the payer email so the brick hides its email field and the user does not retype it. */
	payerEmail?: string;
}

/**
 * Credit/debit-only Payment Brick for the subscription flow. Cash (`ticket`), wallet balance
 * (`mercadoPago`) and bank transfer are hidden because MP preapprovals require a recurring-capable
 * card token; installments are capped at 1 since the recurring charge is monthly.
 *
 * Default export so it can be `React.lazy`-loaded — that keeps the MP SDK out of the SSR bundle.
 */
export default function PaymentBrick({ amount, payerEmail, onBrickError, onTokenReady }: PaymentBrickProps) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		ensureSdkInitialized();
		setReady(true);
	}, []);

	if (!ready) {
		return <Loader />;
	}

	return (
		<Payment
			customization={{
				paymentMethods: {
					creditCard: "all",
					debitCard: "all",
					ticket: [],
					bankTransfer: [],
					atm: [],
					mercadoPago: [],
					prepaidCard: [],
					maxInstallments: 1,
				},
			}}
			initialization={{
				amount,
				payer: payerEmail ? { email: payerEmail } : undefined,
			}}
			onError={(error) => onBrickError(error.message ?? "No pudimos cargar el formulario de pago.")}
			onSubmit={async ({ formData }) => {
				const deviceId =
					typeof window === "undefined"
						? undefined
						: (window as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID;

				await onTokenReady({ cardTokenId: formData.token, deviceId, payerEmail: formData.payer.email });
			}}
		/>
	);
}
