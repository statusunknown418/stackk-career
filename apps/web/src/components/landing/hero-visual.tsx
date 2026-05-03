import {
	BriefcaseIcon,
	CalendarIcon,
	ChatCircleIcon,
	CheckIcon,
	FileTextIcon,
	LinkedinLogoIcon,
	SparkleIcon,
	TrendUpIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarItem {
	active?: boolean;
	badge?: string;
	icon: ReactNode;
	label: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
	{
		icon: <BriefcaseIcon size={14} weight="duotone" />,
		label: "Diagnóstico",
		active: true,
	},
	{
		icon: <FileTextIcon size={14} weight="duotone" />,
		label: "CV Rewrite",
		badge: "3",
	},
	{
		icon: <LinkedinLogoIcon size={14} weight="duotone" />,
		label: "LinkedIn",
	},
	{
		icon: <ChatCircleIcon size={14} weight="duotone" />,
		label: "Mock interview",
	},
	{
		icon: <CalendarIcon size={14} weight="duotone" />,
		label: "Estrategia",
	},
];

export function HeroVisual() {
	return (
		<div className="relative" style={{ perspective: "2000px" }}>
			<div className="absolute -top-3 -right-3 hidden size-24 rounded-full border-2 border-foreground/15 border-dashed lg:block" />
			<div className="absolute -bottom-4 -left-4 hidden size-16 rounded-full bg-marigold/30 blur-2xl lg:block" />

			<div
				className="relative rounded-sm border border-foreground/10 bg-gradient-to-b from-oxblood/8 to-transparent p-px shadow-[0_50px_100px_-20px_oklch(0.46_0.18_22_/_0.35),0_30px_60px_-30px_oklch(0.18_0.02_40_/_0.5)]"
				style={{
					transform: "rotateX(6deg)",
					transformStyle: "preserve-3d",
				}}
			>
				<div className="grid min-h-[480px] grid-cols-1 overflow-hidden rounded-[1px] bg-card md:grid-cols-[280px_1fr]">
					<MockSidebar />
					<MockMain />
				</div>
			</div>
			<FloatingCard
				className="top-14 -right-3 hidden animate-float-slow lg:flex"
				icon={<CheckIcon size={16} weight="bold" />}
				style={{ animationDelay: "-1s" }}
				subtitle="Score: 94/100"
				title="CV pasó el ATS"
			/>
			<FloatingCard
				className="bottom-16 -left-4 hidden animate-float-slow lg:flex"
				icon={<SparkleIcon size={16} weight="fill" />}
				iconClassName="bg-gradient-to-br from-marigold to-orange-600"
				style={{ animationDelay: "-3s" }}
				subtitle="Mercado Libre · Vie 14:00"
				title="Entrevista agendada"
			/>
		</div>
	);
}

function MockSidebar() {
	return (
		<aside className="hidden border-foreground/8 border-r bg-foreground/[0.02] px-4 py-6 md:block">
			<p className="mb-3 px-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.18em]">— Mi journey</p>
			<ul className="flex flex-col gap-0.5">
				{SIDEBAR_ITEMS.map((item) => (
					<li key={item.label}>
						<div
							className={cn(
								"flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm",
								item.active ? "bg-background font-medium text-foreground" : "text-foreground/60"
							)}
						>
							<span
								className={cn("grid size-5 place-items-center rounded text-oxblood", item.active ? "" : "opacity-50")}
							>
								{item.icon}
							</span>
							<span className="flex-1">{item.label}</span>
							{item.badge && (
								<span className="rounded-full bg-oxblood px-1.5 py-0.5 font-semibold text-[10px] text-white">
									{item.badge}
								</span>
							)}
						</div>
					</li>
				))}
			</ul>
			<p className="mt-6 mb-3 px-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.18em]">— Mentor</p>
			<div className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-foreground/70 text-sm">
				<span aria-hidden="true" className="block size-6 rounded-full bg-gradient-to-br from-rose-200 to-rose-500" />
				<span className="font-display-italic text-base">Sofía Martínez</span>
			</div>
		</aside>
	);
}

function MockMain() {
	return (
		<div className="px-7 py-6">
			<h3 className="mb-1 font-display font-medium text-2xl text-foreground tracking-[-0.02em]">
				Hola, <span className="font-display-italic font-light text-oxblood">Camila</span>
			</h3>
			<p className="mb-5 font-serif text-foreground/65 text-sm italic">
				Vamos por el rewrite del Bullet 2 de tu primera experiencia.
			</p>

			<div className="mb-4 grid grid-cols-2 gap-3.5">
				<MockKpi delta="↑ 7 vs semana pasada" label="Aplicaciones esta semana" value="14" />
				<MockKpi delta="↑ tasa 36%" label="Respuestas" value="5" />
			</div>

			<div className="rounded-sm border border-foreground/10 bg-background p-5">
				<p className="font-display font-medium text-foreground text-xl leading-tight tracking-[-0.02em]">
					Camila Reyes
				</p>
				<p className="mb-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">
					Ing. Industrial · Buenos Aires
				</p>
				<MockBullet>
					Coordiné un equipo de <Mark>6 voluntarios</Mark> para una campaña que recolectó <Mark>$340K MXN</Mark> en 8
					semanas.
				</MockBullet>
				<MockBullet>
					Optimicé un proceso de inventario reduciendo <Mark>23% el tiempo</Mark> de cierre mensual.
				</MockBullet>
				<MockBullet>
					Presenté hallazgos a la gerencia, resultando en <Mark>3 mejoras adoptadas</Mark>.
				</MockBullet>
			</div>
		</div>
	);
}

function MockKpi({ label, value, delta }: { label: string; value: string; delta: string }) {
	return (
		<div className="rounded-sm border border-foreground/10 bg-background p-4">
			<p className="mb-1.5 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">{label}</p>
			<p className="numeral font-display font-medium text-2xl text-foreground tracking-[-0.025em]">{value}</p>
			<p className="flex items-center gap-1 text-oxblood text-xs">
				<TrendUpIcon size={12} weight="bold" />
				{delta}
			</p>
		</div>
	);
}

function MockBullet({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-2.5 border-foreground/8 border-t py-2 text-foreground/80 text-sm leading-snug">
			<CheckIcon className="mt-0.5 shrink-0 text-oxblood" size={14} weight="bold" />
			<span>{children}</span>
		</div>
	);
}

function Mark({ children }: { children: ReactNode }) {
	return <mark className="rounded-sm bg-marigold/30 px-1 py-px font-semibold text-foreground">{children}</mark>;
}

function FloatingCard({
	className,
	icon,
	title,
	subtitle,
	iconClassName,
	style,
}: {
	className?: string;
	icon: ReactNode;
	title: string;
	subtitle: string;
	iconClassName?: string;
	style?: React.CSSProperties;
}) {
	return (
		<div
			className={cn(
				"absolute z-10 items-center gap-3 rounded-sm border border-foreground/15 bg-card/85 px-4 py-2.5 shadow-[0_12px_32px_-6px_oklch(0.18_0.02_40_/_0.35)] backdrop-blur-md",
				className
			)}
			style={style}
		>
			<span
				className={cn(
					"grid size-8 place-items-center rounded-full bg-gradient-to-br from-oxblood to-aurora-3 text-background",
					iconClassName
				)}
			>
				{icon}
			</span>
			<div>
				<p className="font-display font-medium text-foreground text-sm leading-tight">{title}</p>
				<p className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.12em]">{subtitle}</p>
			</div>
		</div>
	);
}
