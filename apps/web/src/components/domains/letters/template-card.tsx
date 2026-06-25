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
		bgHoverClass = "group-hover:bg-indigo-500/5";
	} else if (isMinty) {
		hoverBorderClass = "group-hover:border-emerald-500/50";
		glowBgClass = "bg-emerald-500";
		bgHoverClass = "group-hover:bg-emerald-500/5";
	} else if (isBlue) {
		hoverBorderClass = "group-hover:border-blue-500/50";
		glowBgClass = "bg-blue-500";
		bgHoverClass = "group-hover:bg-blue-500/5";
	}

	return (
		<button
			className="group flex w-full cursor-pointer flex-col gap-2.5 border-none bg-transparent p-0 text-left outline-none"
			onClick={onClick}
			type="button"
		>
			{/* Mock Page Preview */}
			<div
				className={`relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg ${hoverBorderClass} ${bgHoverClass}`}
			>
				{/* Glow on hover */}
				<span
					className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${glowBgClass}`}
				/>

				{type === "centered" && (
					<div className="flex h-full flex-col gap-2.5 p-4 text-neutral-600">
						{/* Centered Name */}
						<div className="mt-1 text-center font-semibold text-neutral-800 text-xs">{author}</div>
						<div className="-mt-1.5 text-center text-neutral-500" style={{ fontSize: "7px" }}>
							Consultor de Desarrollo de Negocios
						</div>
						<div className="border-b pb-2 text-center text-neutral-400 leading-relaxed" style={{ fontSize: "6px" }}>
							correo@ejemplo.com | +51 987 654 | linkedin.com/in/usuario
						</div>

						{/* Letter recipient */}
						<div className="mt-2 font-medium text-neutral-700 leading-tight" style={{ fontSize: "8px" }}>
							Sofía Rodríguez
						</div>
						<div className="-mt-1 text-neutral-500" style={{ fontSize: "7px" }}>
							Meta Platforms Inc.
						</div>

						{/* Letter lines */}
						<div className="mt-2 flex flex-col gap-1.5">
							<div className="mx-auto h-1.5 w-full rounded-full bg-neutral-200/70" />
							<div className="mx-auto h-1.5 w-11/12 rounded-full bg-neutral-200/70" />
							<div className="mx-auto h-1.5 w-5/6 rounded-full bg-neutral-200/70" />
							<div className="mx-auto h-1.5 w-4/5 rounded-full bg-neutral-200/70" />
						</div>

						{/* Signature */}
						<div className="mt-auto text-center text-neutral-700" style={{ fontSize: "8px" }}>
							Atentamente,
						</div>
						<div className="text-center font-semibold text-neutral-800" style={{ fontSize: "8px" }}>
							{author}
						</div>
					</div>
				)}

				{type === "classic" && (
					<div className="flex h-full flex-col gap-2.5 p-4 text-neutral-500">
						{/* Left-aligned name with border */}
						<div className="mt-1 font-semibold text-neutral-800 text-xs">{author}</div>
						<div className="-mt-1 text-neutral-500" style={{ fontSize: "7px" }}>
							Industrias Kings S.A. | andres@ejemplo.com
						</div>
						<div className="w-full border-neutral-200 border-b" />

						{/* Date */}
						<div className="mt-1 text-right text-neutral-400" style={{ fontSize: "6px" }}>
							13 de junio, 2026
						</div>

						{/* Recipient */}
						<div className="font-medium text-neutral-700 leading-tight" style={{ fontSize: "8px" }}>
							Sr. Bermúdez
						</div>

						{/* Body */}
						<div className="mt-1 flex flex-col gap-1.5">
							<div className="h-1.5 w-full rounded-full bg-neutral-200/70" />
							<div className="h-1.5 w-11/12 rounded-full bg-neutral-200/70" />
							<div className="h-1.5 w-full rounded-full bg-neutral-200/70" />
							<div className="h-1.5 w-4/5 rounded-full bg-neutral-200/70" />
						</div>

						{/* Signature */}
						<div className="mt-auto text-neutral-700" style={{ fontSize: "8px" }}>
							Atentamente,
						</div>
						<div className="font-semibold text-neutral-800" style={{ fontSize: "8px" }}>
							{author}
						</div>
					</div>
				)}

				{type === "minty" && (
					<div className="flex h-full w-full bg-white">
						{/* Left Sidebar */}
						<div
							className="flex shrink-0 flex-col gap-2.5 border-emerald-100/80 border-r bg-emerald-50/60 p-2"
							style={{ width: "32%" }}
						>
							<div
								className="flex size-6 items-center justify-center rounded-full bg-emerald-500 font-bold text-white shadow-xs"
								style={{ fontSize: "8px" }}
							>
								{author.charAt(0)}
							</div>
							<div className="flex flex-col gap-0.5">
								<div className="truncate font-bold text-emerald-800 leading-tight" style={{ fontSize: "7px" }}>
									{author}
								</div>
								<div className="truncate text-emerald-600 leading-none" style={{ fontSize: "5px" }}>
									Project Manager
								</div>
							</div>

							{/* Mini contact detail blocks */}
							<div className="mt-2 flex flex-col gap-1">
								<div className="h-1 w-full rounded-full bg-emerald-600/15" />
								<div className="h-1 w-4/5 rounded-full bg-emerald-600/15" />
								<div className="h-1 w-5/6 rounded-full bg-emerald-600/15" />
							</div>
						</div>

						{/* Right Content */}
						<div className="flex flex-1 flex-col gap-2 p-2.5">
							{/* Header / Date */}
							<div className="text-right text-neutral-400" style={{ fontSize: "5px" }}>
								14 de junio, 2026
							</div>

							<div className="mt-1 font-bold text-neutral-800 leading-tight" style={{ fontSize: "7px" }}>
								Estimado equipo:
							</div>

							{/* Body lines */}
							<div className="mt-1 flex flex-col gap-1.5">
								<div className="h-1.5 w-full rounded-full bg-neutral-200/70" />
								<div className="h-1.5 w-11/12 rounded-full bg-neutral-200/70" />
								<div className="h-1.5 w-full rounded-full bg-neutral-200/70" />
								<div className="h-1.5 w-4/5 rounded-full bg-neutral-200/70" />
							</div>

							{/* Signature */}
							<div className="mt-auto flex flex-col gap-0.5">
								<div className="text-neutral-500" style={{ fontSize: "6px" }}>
									Un cordial saludo,
								</div>
								<div className="font-bold text-emerald-700 leading-none" style={{ fontSize: "7.5px" }}>
									{author}
								</div>
							</div>
						</div>
					</div>
				)}

				{type === "blue" && (
					<div className="flex h-full w-full flex-col bg-white">
						{/* Top Banner */}
						<div className="relative flex shrink-0 flex-col gap-0.5 bg-blue-600 p-2.5 pb-4 text-white">
							<div className="truncate font-bold uppercase leading-tight tracking-wide" style={{ fontSize: "9px" }}>
								{author}
							</div>
							<div className="truncate text-blue-100/90 leading-none" style={{ fontSize: "5.5px" }}>
								Asistente de Marketing
							</div>

							{/* Floating round initials icon */}
							<div
								className="absolute right-3 -bottom-3 flex size-6 items-center justify-center rounded-full border-2 border-white bg-blue-50 font-bold text-blue-600 shadow-sm"
								style={{ fontSize: "8px" }}
							>
								{author
									.split(" ")
									.map((n) => n[0])
									.join("")}
							</div>
						</div>

						{/* Main Area */}
						<div className="flex flex-1 flex-col gap-2 p-2.5 pt-3.5">
							{/* Recipient */}
							<div className="mt-1 font-semibold text-blue-800 leading-tight" style={{ fontSize: "7px" }}>
								Atención al Equipo de Reclutamiento
							</div>
							<div className="-mt-1 text-neutral-400" style={{ fontSize: "5.5px" }}>
								Tech Solutions S.A.
							</div>

							{/* Body lines */}
							<div className="mt-1 flex flex-col gap-1.5">
								<div className="h-1.5 w-full rounded-full bg-neutral-200/70" />
								<div className="h-1.5 w-11/12 rounded-full bg-neutral-200/70" />
								<div className="h-1.5 w-full rounded-full bg-neutral-200/70" />
								<div className="h-1.5 w-4/5 rounded-full bg-neutral-200/70" />
							</div>

							{/* Signature */}
							<div className="mt-auto flex flex-col gap-0.5">
								<div className="font-semibold text-blue-600" style={{ fontSize: "6px" }}>
									Atentamente,
								</div>
								<div className="font-bold text-neutral-800 leading-none" style={{ fontSize: "7.5px" }}>
									{author}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Card Details */}
			<div className="flex flex-col gap-0.5">
				<h4 className="truncate font-medium text-foreground text-xs transition-colors group-hover:text-primary">
					{title}
				</h4>
				<p className="truncate text-muted-foreground text-xs">{subtitle}</p>
			</div>
		</button>
	);
}
