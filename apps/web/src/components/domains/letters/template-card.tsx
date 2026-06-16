export interface TemplateCardProps {
	author: string;
	onClick: () => void;
	subtitle: string;
	title: string;
	type: "centered" | "classic" | "minty" | "blue";
}

export function TemplateCard({ title, subtitle, author, type, onClick }: TemplateCardProps) {
	const isFormal = type === "centered" || type === "classic";
	const isMinty = type === "minty";
	const isBlue = type === "blue";

	let hoverBorderClass = "group-hover:border-primary/45";
	let glowBgClass = "bg-primary";
	let bgHoverClass = "";

	if (isFormal) {
		hoverBorderClass = "group-hover:border-indigo-500/50";
		glowBgClass = "bg-indigo-500";
		bgHoverClass = "group-hover:bg-indigo-500/[0.03] dark:group-hover:bg-indigo-500/[0.015]";
	} else if (isMinty) {
		hoverBorderClass = "group-hover:border-emerald-500/50";
		glowBgClass = "bg-emerald-500";
		bgHoverClass = "group-hover:bg-emerald-500/[0.03] dark:group-hover:bg-emerald-500/[0.015]";
	} else if (isBlue) {
		hoverBorderClass = "group-hover:border-blue-500/50";
		glowBgClass = "bg-blue-500";
		bgHoverClass = "group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-500/[0.015]";
	}

	return (
		<button
			className="group flex w-full cursor-pointer flex-col gap-2.5 border-none bg-transparent p-0 text-left outline-none"
			onClick={onClick}
			type="button"
		>
			{/* Mock Page Preview */}
			<div
				className={`relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg dark:bg-neutral-900 ${hoverBorderClass} ${bgHoverClass}`}
			>
				{/* Glow on hover */}
				<span
					className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${glowBgClass}`}
				/>

				{type === "centered" && (
					<div className="flex h-full flex-col gap-2.5 text-neutral-600 dark:text-neutral-400">
						{/* Centered Name */}
						<div className="mt-1 text-center font-semibold text-[12px] text-neutral-800 dark:text-neutral-100">
							{author}
						</div>
						<div className="-mt-1.5 text-center text-[7px] text-neutral-500 dark:text-neutral-400">
							Consultor de Desarrollo de Negocios
						</div>
						<div className="border-b pb-2 text-center text-[6px] text-neutral-400 leading-relaxed dark:text-neutral-500">
							correo@ejemplo.com | +51 987 654 | linkedin.com/in/usuario
						</div>

						{/* Letter recipient */}
						<div className="mt-2 font-medium text-[8px] text-neutral-700 leading-tight dark:text-neutral-300">
							Sofía Rodríguez
						</div>
						<div className="-mt-1 text-[7px] text-neutral-500 dark:text-neutral-550">Meta Platforms Inc.</div>

						{/* Letter lines */}
						<div className="mt-2 flex flex-col gap-1.5">
							<div className="mx-auto h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="mx-auto h-1.5 w-11/12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="mx-auto h-1.5 w-5/6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="mx-auto h-1.5 w-4/5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
						</div>

						{/* Signature */}
						<div className="mt-auto text-center text-[8px] text-neutral-700 dark:text-neutral-300">Atentamente,</div>
						<div className="text-center font-semibold text-[8px] text-neutral-800 dark:text-neutral-200">{author}</div>
					</div>
				)}

				{type === "classic" && (
					<div className="flex h-full flex-col gap-2.5 text-neutral-500 dark:text-neutral-400">
						{/* Left-aligned name with border */}
						<div className="mt-1 font-semibold text-[12px] text-neutral-800 dark:text-neutral-100">{author}</div>
						<div className="-mt-1 text-[7px] text-neutral-500 dark:text-neutral-400">
							Industrias Kings S.A. | andres@ejemplo.com
						</div>
						<div className="w-full border-neutral-250 border-b dark:border-neutral-800" />

						{/* Date */}
						<div className="mt-1 text-right text-[6px] text-neutral-400 dark:text-neutral-550">13 de junio, 2026</div>

						{/* Recipient */}
						<div className="font-medium text-[8px] text-neutral-700 leading-tight dark:text-neutral-350">
							Sr. Bermúdez
						</div>

						{/* Body */}
						<div className="mt-1 flex flex-col gap-1.5">
							<div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-1.5 w-11/12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-1.5 w-4/5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
						</div>

						{/* Signature */}
						<div className="mt-auto text-[8px] text-neutral-700 dark:text-neutral-300">Atentamente,</div>
						<div className="font-semibold text-[8px] text-neutral-800 dark:text-neutral-200">{author}</div>
					</div>
				)}

				{type === "minty" && (
					<div className="flex h-full flex-col text-neutral-500 dark:text-neutral-400">
						{/* Mint Accent Top Header */}
						<div className="-mx-4 -mt-4 mb-3 flex items-center justify-between border-emerald-500/20 border-b bg-emerald-500/10 px-3 py-2.5 dark:bg-emerald-500/20">
							<div className="font-semibold text-[10px] text-emerald-700 dark:text-emerald-400">{author}</div>
							<div className="font-medium text-[7px] text-emerald-600 dark:text-emerald-500">
								Gestor de Proyectos Junior
							</div>
						</div>

						<div className="flex gap-3 px-0.5">
							{/* Photo Placeholder */}
							<div className="flex w-10 shrink-0 flex-col items-center gap-1.5">
								<div className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-neutral-200 dark:bg-neutral-800">
									<span className="text-[4px] text-neutral-400">👤</span>
								</div>
								<div className="text-[2px] text-neutral-400">14 de junio, 2026</div>
							</div>

							{/* Body */}
							<div className="flex flex-1 flex-col gap-1.5">
								<div className="font-medium text-[8px] text-neutral-700 dark:text-neutral-300">Estimado equipo:</div>
								<div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
								<div className="h-1.5 w-11/12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
								<div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
								<div className="h-1.5 w-4/5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
							</div>
						</div>
					</div>
				)}

				{type === "blue" && (
					<div className="flex h-full flex-col text-neutral-500 dark:text-neutral-400">
						{/* Blue Accent Card */}
						<div className="mt-1 flex flex-col items-center gap-1.5 border-blue-500/20 border-b pb-2">
							{/* Blue Photo Placeholder */}
							<div className="flex size-6 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-blue-500/10 dark:bg-blue-500/20">
								<span className="text-[5px] text-blue-500">👤</span>
							</div>
							<div className="font-medium text-[6px] text-blue-600 dark:text-blue-400">{author}</div>
							<div className="text-[2.5px] opacity-60">Asistente de Marketing</div>
						</div>

						{/* Body */}
						<div className="mt-2 flex flex-col gap-1">
							<div className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-1 w-11/12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-1 w-4/5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
						</div>

						{/* Signature */}
						<div className="mt-auto font-medium text-[4px] text-blue-600 dark:text-blue-400">Atentamente,</div>
						<div className="font-semibold text-[4px] text-neutral-800 dark:text-neutral-200">{author}</div>
					</div>
				)}
			</div>

			{/* Card Details */}
			<div className="flex flex-col gap-0.5">
				<h4 className="truncate font-medium text-foreground text-xs transition-colors group-hover:text-primary">
					{title}
				</h4>
				<p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
			</div>
		</button>
	);
}
