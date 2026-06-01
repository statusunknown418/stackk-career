import {
	ArrowLeftIcon,
	ArrowsClockwiseIcon,
	InfinityIcon,
	LockSimpleIcon,
	SealCheckIcon,
	ShieldCheckIcon,
	SparkleIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import type { PaidPlanIdInput } from "@stackk-career/schemas/api/billing";
import type { CachedUsageLimitKey, LimitValue, SubscriptionStatus } from "@stackk-career/schemas/subscriptions";
import { hasActiveSubscriptionAccess, isUnlimited, PLAN_CATALOG } from "@stackk-career/schemas/subscriptions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { DashRing } from "@/components/loading-ui/dash-ring";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetPanel,
	SheetPopup,
	SheetTitle,
} from "@/components/ui/sheet";
import { ShineBorder } from "@/components/ui/shine-border";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { invalidateBillingQueries } from "@/lib/billing-cache";
import { cn } from "@/lib/utils";
import { type client, orpc } from "@/utils/orpc";
import type { PaymentBrickProps } from "./payment-brick";
import { type BillingSheetView, useBillingSheet } from "./use-billing-sheet";

const PaymentBrick = lazy(() => import("./payment-brick"));

/** Cached billing snapshot exactly as the oRPC client deserializes it. */
type BillingSnapshot = Awaited<ReturnType<typeof client.billing.getSnapshot>>;

/** Which screen of the sheet is showing. `checkout` carries the plan being purchased. */
type View = { kind: "overview" } | { kind: "selector" } | { kind: "checkout"; planId: PaidPlanIdInput };

const penCurrencyFormatter = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	maximumFractionDigits: 0,
});

const PAID_PLAN_IDS = ["pro", "max"] as const satisfies readonly PaidPlanIdInput[];

const NEAR_LIMIT_RATIO = 0.8;

const USAGE_METRICS: { key: CachedUsageLimitKey; label: string }[] = [
	{ key: "resumes_total", label: "CVs" },
	{ key: "resume_creation_generations_per_cycle", label: "Creaciones de CV con AI" },
	{ key: "conversation_generations_per_cycle", label: "Conversaciones" },
	{ key: "resume_analyses_per_cycle", label: "Análisis de CV" },
	{ key: "resume_inline_ai_suggestions", label: "Sugerencias con AI" },
	{ key: "coaching_sessions_per_cycle", label: "Sesiones de coaching" },
];

const STATUS_BADGE: Record<SubscriptionStatus, { label: string; variant: BadgeProps["variant"] }> = {
	active: { label: "Activo", variant: "success" },
	trialing: { label: "Prueba", variant: "info" },
	past_due: { label: "Pago pendiente", variant: "warning" },
	paused: { label: "Pausado", variant: "outline" },
	canceled: { label: "Cancelado", variant: "outline" },
	expired: { label: "Expirado", variant: "error" },
};

const HEADER_COPY: Record<View["kind"], { description: string; title: string }> = {
	overview: { description: "Tu plan, tu uso y opciones de cambio.", title: "Plan" },
	selector: { description: "Cambia o mejora tu plan cuando quieras.", title: "Elige tu plan" },
	checkout: { description: "Ingresa los datos de tu tarjeta. El cobro es mensual.", title: "Confirmar pago" },
};

function planEntitlementDisplay(value: LimitValue): { muted: boolean; text: string } {
	if (isUnlimited(value)) {
		return { muted: false, text: "Ilimitado" };
	}
	if (value === 0) {
		return { muted: true, text: "No incluido" };
	}
	return { muted: false, text: String(value) };
}

function formatPeriodDate(date: Date): string {
	return format(date, "d 'de' MMMM, yyyy", { locale: es });
}

function formatResetDate(date: Date): string {
	return format(date, "d MMM", { locale: es });
}

export function BillingSheet(): React.ReactElement {
	const open = useBillingSheet((state) => state.open);
	const view = useBillingSheet((state) => state.view);
	const closeBillingSheet = useBillingSheet((state) => state.closeBillingSheet);

	return (
		<Sheet
			onOpenChange={(next) => {
				if (!next) {
					closeBillingSheet();
				}
			}}
			open={open}
		>
			<SheetPopup side="right">{open ? <BillingSheetContent initialView={view} /> : null}</SheetPopup>
		</Sheet>
	);
}

function BillingSkeleton(): React.ReactElement {
	return (
		<div className="flex flex-col gap-7">
			<div className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-5">
				<div className="flex items-center gap-2">
					<Skeleton className="h-7 w-28" />
					<Skeleton className="h-5 w-16 rounded-sm" />
				</div>
				<Skeleton className="h-4 w-40" />
			</div>
			<div className="flex flex-col gap-4">
				<Skeleton className="h-4 w-32" />
				<div className="flex flex-col gap-4">
					{USAGE_METRICS.map(({ key }) => (
						<div className="flex flex-col gap-2" key={key}>
							<div className="flex justify-between">
								<Skeleton className="h-3.5 w-28" />
								<Skeleton className="h-3.5 w-12" />
							</div>
							<Skeleton className="h-1.5 w-full rounded-full" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function UsageRow({ label, limit, used }: { label: string; limit: LimitValue; used: number }): React.ReactElement {
	if (isUnlimited(limit)) {
		return (
			<div className="flex items-center justify-between gap-3 py-0.5 text-sm">
				<span className="text-foreground">{label}</span>
				<span className="inline-flex items-center gap-1.5 text-muted-foreground tabular-nums">
					{used}
					<InfinityIcon className="size-3.5 opacity-70" weight="bold" />
				</span>
			</div>
		);
	}

	if (limit === 0) {
		return (
			<div className="flex flex-col gap-2 opacity-55">
				<div className="flex items-center justify-between gap-3 text-sm">
					<span className="inline-flex items-center gap-1.5">
						<LockSimpleIcon className="size-3.5" />
						{label}
					</span>
					<span className="text-muted-foreground text-xs">No incluido</span>
				</div>
				<Meter max={1} value={0}>
					<MeterTrack className="h-1.5 rounded-full" />
				</Meter>
			</div>
		);
	}

	const isOverLimit = used >= limit;
	const isNearLimit = !isOverLimit && used / limit >= NEAR_LIMIT_RATIO;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-3 text-sm">
				<span className="text-foreground">{label}</span>
				<span
					className={cn(
						"tabular-nums",
						isOverLimit && "text-destructive-foreground",
						isNearLimit && "text-warning-foreground",
						!(isOverLimit || isNearLimit) && "text-muted-foreground"
					)}
				>
					{used} / {limit}
				</span>
			</div>
			<Meter max={limit} value={Math.min(used, limit)}>
				<MeterTrack className="h-1.5 rounded-full">
					<MeterIndicator
						className={cn("rounded-full", isOverLimit && "bg-destructive", isNearLimit && "bg-warning")}
					/>
				</MeterTrack>
			</Meter>
		</div>
	);
}

function PlanOverview({ snapshot }: { snapshot: BillingSnapshot }): React.ReactElement {
	const isFree = snapshot.subscription.planId === "free";
	const hasAccess = hasActiveSubscriptionAccess(snapshot.subscription.status);
	const periodEnd = snapshot.subscription.currentPeriodEnd;
	const isInactivePaidPlan = !(isFree || hasAccess);
	const status = STATUS_BADGE[snapshot.subscription.status];
	const price = PLAN_CATALOG[snapshot.subscription.planId].priceMonthlyPen;

	return (
		<div className="flex flex-col gap-7">
			<div className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-2">
						<span className="font-heading text-2xl leading-none">{snapshot.plan.displayName}</span>
						<Badge variant={status.variant}>{status.label}</Badge>
					</div>
					{!isFree && (
						<div className="flex items-baseline gap-1">
							<span className="font-heading text-lg tabular-nums leading-none">
								{penCurrencyFormatter.format(price)}
							</span>
							<span className="text-muted-foreground text-xs">/mes</span>
						</div>
					)}
				</div>

				<Separator />

				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					{!isInactivePaidPlan && <ArrowsClockwiseIcon className="size-4 shrink-0" />}
					{isInactivePaidPlan && <LockSimpleIcon className="size-4 shrink-0" />}
					{isFree && <span>Sin cobros. Mejora cuando lo necesites.</span>}
					{!isFree && hasAccess && <span>Se renueva el {formatPeriodDate(periodEnd)}</span>}
					{isInactivePaidPlan && <span>Tu acceso volvió a {snapshot.effectivePlan.displayName}.</span>}
				</div>
			</div>

			{isInactivePaidPlan && (
				<Alert variant="warning">
					<LockSimpleIcon />
					<AlertTitle>Suscripción inactiva</AlertTitle>
					<AlertDescription>
						No hay una suscripción pagada activa. Aplican los límites de {snapshot.effectivePlan.displayName}.
					</AlertDescription>
				</Alert>
			)}

			<div className="flex flex-col gap-4">
				<div className="flex items-baseline justify-between gap-2">
					<span className="font-medium text-foreground text-sm">Uso del ciclo</span>
					<span className="text-muted-foreground text-xs tabular-nums">Reinicia {formatResetDate(periodEnd)}</span>
				</div>
				<div className="flex flex-col gap-3.5">
					{USAGE_METRICS.map(({ key, label }) => (
						<UsageRow key={key} label={label} limit={snapshot.entitlements[key]} used={snapshot.usage[key]} />
					))}
				</div>
			</div>
		</div>
	);
}

function PlanSelector({
	onSelectPlan,
	snapshot,
}: {
	onSelectPlan: (planId: PaidPlanIdInput) => void;
	snapshot: BillingSnapshot;
}): React.ReactElement {
	const recommendedId = "max" satisfies PaidPlanIdInput;

	return (
		<div className="flex flex-col gap-3">
			{PAID_PLAN_IDS.map((planId) => {
				const plan = PLAN_CATALOG[planId];
				const isCurrent = snapshot.subscription.planId === planId && snapshot.subscription.status === "active";
				const isRecommended = planId === recommendedId;

				return (
					<div
						className={cn("relative flex flex-col gap-4 rounded-xl border p-5 transition-colors", isCurrent && "ring")}
						key={planId}
					>
						{isRecommended && <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />}

						{isRecommended && isCurrent !== isRecommended && (
							<Badge className="w-max" size="sm" variant="default">
								<SealCheckIcon weight="fill" />
								Recomendado
							</Badge>
						)}

						<div className="flex justify-between gap-2">
							<div className="flex items-start gap-2">
								<span className="font-heading text-lg leading-none">{plan.displayName}</span>

								{isCurrent && (
									<Badge size="sm" variant="outline">
										Actual
									</Badge>
								)}
							</div>

							<div className="flex items-baseline gap-1">
								<span className="font-heading text-xl tabular-nums leading-none">
									{penCurrencyFormatter.format(plan.priceMonthlyPen)}
								</span>
								<span className="text-muted-foreground text-xs">x mes</span>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							{USAGE_METRICS.map(({ key, label }) => {
								const entitlement = planEntitlementDisplay(plan.entitlements[key]);
								return (
									<div
										className={cn("flex items-center justify-between gap-3 text-sm", entitlement.muted && "opacity-55")}
										key={key}
									>
										<span className="text-muted-foreground">{label}</span>
										<span className="text-foreground tabular-nums">{entitlement.text}</span>
									</div>
								);
							})}
						</div>

						<Button className="w-full" disabled={isCurrent} onClick={() => onSelectPlan(planId)} variant={"outline"}>
							{isCurrent ? "Tu plan actual" : `Elegir ${plan.displayName}`}
						</Button>
					</div>
				);
			})}
		</div>
	);
}

function useRefreshBilling(): () => void {
	const queryClient = useQueryClient();

	return () => {
		invalidateBillingQueries(queryClient);
	};
}

function PlanCheckout({
	onCompleted,
	planId,
	snapshot,
}: {
	onCompleted: () => void;
	planId: PaidPlanIdInput;
	snapshot: BillingSnapshot;
}): React.ReactElement {
	const { data: session } = authClient.useSession();
	const refreshBilling = useRefreshBilling();

	const [brickError, setBrickError] = useState<string | null>(null);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const plan = PLAN_CATALOG[planId];
	const isFree = snapshot.subscription.planId === "free";

	const showError = (message: string) => {
		setCheckoutError(message);
		toast.error(message);
	};

	const createSubscription = useMutation(
		orpc.billing.createSubscription.mutationOptions({
			onMutate: () => setCheckoutError(null),
			onSuccess: () => {
				refreshBilling();
				toast.success("¡Tu plan está activo!");
				onCompleted();
			},
			onError: (err) => showError(err.message),
		})
	);

	const changePlan = useMutation(
		orpc.billing.changePlan.mutationOptions({
			onMutate: () => setCheckoutError(null),
			onSuccess: () => {
				refreshBilling();
				toast.success("Tu plan fue actualizado.");
				onCompleted();
			},
			onError: (err) => showError(err.message),
		})
	);

	const processing = createSubscription.isPending || changePlan.isPending;

	const submit: PaymentBrickProps["onTokenReady"] = async ({ cardTokenId, deviceId, payerEmail }) => {
		const email = payerEmail ?? session?.user.email;

		if (!email) {
			showError("Necesitamos un correo para procesar el pago.");
			return;
		}

		const mutation = isFree ? createSubscription : changePlan;

		await mutation.mutateAsync({
			backUrl: window.location.href.includes("localhost")
				? "https://unoutspoken-arty-clayton.ngrok-free.dev/"
				: window.location.href,
			cardTokenId,
			deviceId,
			payerEmail: email,
			planId,
		});
	};

	return (
		<section className="flex flex-col gap-5">
			<article className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
				<div className="flex flex-col gap-0.5">
					<span className="font-medium text-sm">{plan.displayName}</span>
					<span className="text-muted-foreground text-xs">Primer cobro hoy, luego cada mes</span>
				</div>
				<p className="flex items-baseline gap-1">
					<span className="font-heading text-lg tabular-nums leading-none">
						{penCurrencyFormatter.format(plan.priceMonthlyPen)}
					</span>
					<span className="text-muted-foreground text-xs">/mes</span>
				</p>
			</article>

			{checkoutError && (
				<Alert variant="error">
					<WarningCircleIcon />
					<AlertTitle>No pudimos procesar el pago</AlertTitle>
					<AlertDescription>
						<span>{checkoutError}</span>
						<span>
							Asegúrate de que las compras por internet estén activadas. Si el problema continúa, intenta con otra
							tarjeta; aceptamos Visa, Mastercard, Diners Club, American Express y entre otras.
						</span>
					</AlertDescription>
				</Alert>
			)}

			{brickError && (
				<Alert variant="error">
					<WarningCircleIcon />
					<AlertTitle>No pudimos cargar Mercado Pago</AlertTitle>
					<AlertDescription>{brickError}</AlertDescription>
				</Alert>
			)}

			<div className="relative">
				<Suspense
					fallback={
						<div className="flex min-h-48 items-center justify-center">
							<Loader />
						</div>
					}
				>
					<PaymentBrick
						amount={plan.priceMonthlyPen}
						onBrickError={(message) => {
							setBrickError(message);
							toast.error(message);
						}}
						onTokenReady={async (args) => {
							setBrickError(null);
							await submit(args);
						}}
						payerEmail={session?.user.email}
					/>
				</Suspense>

				{processing && (
					<div
						className="fade-in-0 absolute inset-0 z-10 flex animate-in flex-col items-center justify-center gap-4 bg-background duration-200"
						role="status"
					>
						<DashRing className="size-8 text-foreground" />
						<p className="max-w-xs text-balance text-center text-sm">
							<span className="font-medium">Procesando tu pago</span>
							<span className="mt-1 block text-muted-foreground text-xs">
								Estamos validando tu tarjeta con Mercado Pago. No cierres esta ventana.
							</span>
						</p>
					</div>
				)}
			</div>

			<footer className="flex justify-center gap-1.5 text-muted-foreground text-xs">
				<ShieldCheckIcon className="size-3 text-success" />
				Pago protegido por Mercado Pago. No guardamos los datos de tu tarjeta.
			</footer>
		</section>
	);
}

function BillingSheetContent({ initialView }: { initialView: BillingSheetView }): React.ReactElement {
	const [view, setView] = useState<View>(initialView === "selector" ? { kind: "selector" } : { kind: "overview" });
	const refreshBilling = useRefreshBilling();
	const snapshotQuery = useQuery(orpc.billing.getSnapshot.queryOptions());

	const pauseSubscription = useMutation(
		orpc.billing.pauseSubscription.mutationOptions({
			onSuccess: () => {
				refreshBilling();
				toast.success("Tu suscripción fue pausada.");
			},
			onError: (err) => toast.error(err.message),
		})
	);

	if (snapshotQuery.isPending) {
		return (
			<>
				<SheetHeader>
					<SheetDescription>Tu plan, tu uso y opciones de cambio.</SheetDescription>
				</SheetHeader>
				<SheetPanel>
					<BillingSkeleton />
				</SheetPanel>
			</>
		);
	}

	if (snapshotQuery.isError || !snapshotQuery.data) {
		return (
			<SheetPanel>
				<Alert variant="warning">
					<AlertTitle>No pudimos cargar tu plan</AlertTitle>
					<AlertDescription>Revisa tu conexión e inténtalo otra vez.</AlertDescription>
					<AlertAction>
						<Button
							loading={snapshotQuery.isFetching}
							onClick={() => snapshotQuery.refetch()}
							size="sm"
							variant="outline"
						>
							Reintentar
						</Button>
					</AlertAction>
				</Alert>
			</SheetPanel>
		);
	}

	const snapshot = snapshotQuery.data;
	const isFree = snapshot.subscription.planId === "free";
	const hasAccess = hasActiveSubscriptionAccess(snapshot.subscription.status);
	const canPauseSubscription = !isFree && hasAccess;

	const inUpgradeFlow = view.kind !== "overview";
	const header = HEADER_COPY[view.kind];
	const goBack = () => setView(view.kind === "checkout" ? { kind: "selector" } : { kind: "overview" });

	return (
		<>
			<SheetHeader>
				<div className="flex items-center gap-2">
					{inUpgradeFlow && (
						<Button aria-label="Volver" onClick={goBack} size="icon-sm" variant="ghost-muted">
							<ArrowLeftIcon />
						</Button>
					)}
					<SheetTitle>{header.title}</SheetTitle>
				</div>
				<SheetDescription>{header.description}</SheetDescription>
			</SheetHeader>

			<SheetPanel>
				{view.kind === "overview" && <PlanOverview snapshot={snapshot} />}
				{view.kind === "selector" && (
					<PlanSelector onSelectPlan={(planId) => setView({ kind: "checkout", planId })} snapshot={snapshot} />
				)}
				{view.kind === "checkout" && (
					<PlanCheckout onCompleted={() => setView({ kind: "overview" })} planId={view.planId} snapshot={snapshot} />
				)}
			</SheetPanel>

			{!inUpgradeFlow && (
				<SheetFooter className="flex-col sm:flex-col sm:items-stretch sm:justify-start">
					<Button onClick={() => setView({ kind: "selector" })} size="lg">
						<SparkleIcon weight="fill" />
						{isFree ? "Mejorar plan" : "Cambiar plan"}
					</Button>
					{canPauseSubscription && (
						<Button
							loading={pauseSubscription.isPending}
							onClick={() => pauseSubscription.mutate(undefined)}
							size="sm"
							variant="ghost-muted"
						>
							Pausar ahora
						</Button>
					)}
				</SheetFooter>
			)}
		</>
	);
}
