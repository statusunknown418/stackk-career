import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
	head: () => ({
		meta: [
			{ title: "Términos de Servicio · ASSENDIA" },
			{
				name: "description",
				content:
					"Términos de Servicio de Assendia: planes y precios, uso de IA, pagos con Mercado Pago, política de inasistencia y garantía de reembolso del Plan Max.",
			},
		],
	}),
});

function TermsPage() {
	return (
		<main className="bg-background">
			<div className="mx-auto max-w-3xl px-6 py-8">
				<Link
					className="group inline-flex items-center gap-2 font-medium text-foreground/60 text-sm tracking-tight transition-colors hover:text-foreground"
					to="/"
				>
					<ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" weight="bold" />
					Volver al inicio
				</Link>

				<header className="mt-10 border-border border-b pb-8">
					<p className="font-medium font-mono text-oxblood text-xs uppercase">Última actualización: Junio de 2026</p>
					<h1 className="mt-4 font-display font-medium text-3xl text-foreground tracking-tighter sm:text-4xl">
						Términos de Servicio de Assendia
					</h1>
					<p className="mt-6 text-foreground/75 leading-relaxed">
						Te damos la bienvenida a Assendia. Te invitamos a leer detenidamente estos Términos de Servicio
						("Términos"), ya que regulan el acceso y uso de nuestra plataforma web <strong>assendia.com</strong> y de
						los servicios de optimización de CV y asesorías laborales que ofrecemos.
					</p>
					<p className="mt-4 text-foreground/75 leading-relaxed">
						Al crear una cuenta, suscribirte a nuestros planes o adquirir una asesoría, aceptas cumplir con estos
						Términos en su totalidad. Si no estás de acuerdo con alguna parte de ellos, deberás abstenerte de utilizar
						nuestra plataforma.
					</p>
				</header>

				<article className="mt-12 space-y-12 text-foreground/75 leading-relaxed [&_a]:font-medium [&_a]:text-oxblood [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:tracking-tight [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:ps-5 [&_ol]:marker:font-medium [&_ol]:marker:text-oxblood [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:ps-5 [&_ul]:marker:text-oxblood">
					<section className="space-y-4">
						<h2>1. Descripción de los Servicios</h2>
						<p>
							Assendia es una plataforma tecnológica diseñada para ayudar a los usuarios a mejorar su perfil profesional
							y acelerar su búsqueda de empleo a través de herramientas automatizadas de optimización de currículums
							(CV) y sesiones de asesoría personalizada con mentores orientados al mercado laboral.
						</p>
					</section>

					<section className="space-y-4">
						<h2>2. Uso de Inteligencia Artificial (IA) y Responsabilidad del Usuario</h2>
						<p>
							Assendia utiliza herramientas basadas en Inteligencia Artificial (IA) para analizar, estructurar y sugerir
							mejoras en el contenido de los currículums de los usuarios.
						</p>
						<ul>
							<li>
								El usuario reconoce y acepta que los modelos de IA pueden generar textos predictivos o imprecisiones
								técnicas de forma automatizada.
							</li>
							<li>
								<strong>
									La revisión final, veracidad, exactitud y contenido de cualquier CV o documento generado en la
									plataforma es responsabilidad exclusiva y absoluta del usuario
								</strong>{" "}
								antes de realizar cualquier postulación laboral. Assendia no se hace responsable por información falsa o
								errónea presentada por el usuario ante terceros.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2>3. Registro de Cuenta y Seguridad de Pagos</h2>
						<p>
							Para acceder a las funciones de Assendia, deberás registrarte y crear una cuenta. Al realizar
							transacciones dentro de la plataforma, se aplican las siguientes reglas:
						</p>
						<ul>
							<li>
								<strong>Procesamiento de Pagos Seguro:</strong> Todos los pagos y transacciones con tarjetas de crédito
								o débito se procesan de forma externa y segura a través de la pasarela de pago{" "}
								<strong>Mercado Pago</strong>.
							</li>
							<li>
								<strong>No Almacenamiento de Datos Bancarios:</strong> Assendia{" "}
								<strong>NO almacena, recopila ni tiene acceso</strong> a los números de tarjeta, códigos de seguridad
								(CVV) ni datos bancarios privados de los usuarios. Dicha información es gestionada en su totalidad bajo
								los estándares de seguridad de Mercado Pago.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2>4. Planes, Precios y Suscripciones Recurrentes</h2>
						<p>
							Los precios de los servicios de Assendia están expresados en Soles Peruanos (PEN) e{" "}
							<strong>incluyen el Impuesto General a las Ventas (IGV)</strong>.
						</p>
						<div className="overflow-x-auto rounded-xl border border-border">
							<table className="w-full border-collapse text-left text-sm">
								<thead className="bg-foreground/[0.03]">
									<tr className="border-border border-b">
										<th className="px-4 py-3 font-semibold text-foreground" scope="col">
											Servicio / Plan
										</th>
										<th className="px-4 py-3 font-semibold text-foreground" scope="col">
											Tarifa (Incluye IGV)
										</th>
										<th className="px-4 py-3 font-semibold text-foreground" scope="col">
											Tipo de Acceso / Modalidad
										</th>
									</tr>
								</thead>
								<tbody className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_tr:not(:last-child)]:border-b [&_tr]:border-border">
									<tr>
										<td>
											<strong>Plan Pro</strong>
										</td>
										<td className="whitespace-nowrap">S/ 79.00</td>
										<td>Suscripción mensual con renovación automática recurrente.</td>
									</tr>
									<tr>
										<td>
											<strong>Plan Max</strong>
										</td>
										<td className="whitespace-nowrap">S/ 179.00</td>
										<td>Suscripción mensual con renovación automática recurrente y beneficios exclusivos.</td>
									</tr>
									<tr>
										<td>
											<strong>Asesoría Individual</strong>
										</td>
										<td className="whitespace-nowrap">S/ 40.00 (por sesión)</td>
										<td>Pago único por sesión de mentoría personalizada. No requiere suscripción.</td>
									</tr>
								</tbody>
							</table>
						</div>
						<ul>
							<li>
								<strong>Recurrencia:</strong> Las suscripciones a los planes Pro y Max se cobrarán de manera mensual y
								automática al inicio de cada ciclo de facturación, utilizando el método de pago registrado en Mercado
								Pago.
							</li>
							<li>
								<strong>Cancelación:</strong> El usuario puede cancelar la renovación de su suscripción en cualquier
								momento desde el panel de configuración de su cuenta. Tras la cancelación, mantendrá el acceso premium
								hasta el último día de su periodo facturado vigente, cesando los cobros automáticos posteriores.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2>5. Política de Cancelación y Reprogramación de Asesorías Individuales</h2>
						<p>
							Para las sesiones de asesoría individual (S/ 40.00), Assendia gestiona la agenda de sus profesionales con
							anticipación. Por ello, se establece la siguiente política de inasistencia ("No-Show"):
						</p>
						<ul>
							<li>
								<strong>Margen de Reprogramación:</strong> El usuario podrá reprogramar o cancelar la fecha de su
								asesoría individual sin penalidad alguna hasta un <strong>mínimo de 4 horas antes</strong> del horario
								pactado originalmente.
							</li>
							<li>
								<strong>Penalidad por Cancelación Tardía o Inasistencia:</strong> Si el usuario solicita la
								reprogramación/cancelación con menos de 4 horas de anticipación, o si no se presenta a la sesión
								virtual,{" "}
								<strong>
									perderá el 50% del monto pagado (S/ 20.00) por concepto de penalidad operativa, sin lugar a reclamo ni
									apelación posterior.
								</strong>
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2>6. Garantía de Reembolso del 100% (Exclusivo del Plan Max)</h2>
						<p>
							Assendia confía en la efectividad de sus metodologías, por lo que ofrece una política de reembolso
							completo del 100% del dinero invertido, aplicable <strong>únicamente al Plan Max</strong>, bajo el
							cumplimiento estricto y obligatorio de los siguientes requisitos acumulativos:
						</p>
						<ol>
							<li>
								<strong>Uso Continuo:</strong> El usuario debe haber mantenido una suscripción activa, pagada e
								ininterrumpida en el <strong>Plan Max por un periodo mínimo de tres (3) meses consecutivos</strong>.
							</li>
							<li>
								<strong>Registro de Postulaciones:</strong> El usuario debe presentar una bitácora o registro fidedigno
								de todas las aplicaciones y postulaciones de trabajo realizadas a empresas durante ese periodo.
							</li>
							<li>
								<strong>Evidencias de Rechazo Total:</strong> El usuario debe mostrar evidencias formales (cartas o
								correos electrónicos de rechazo explícitos) de <strong>todas y cada una</strong> de las empresas a las
								que postuló, demostrando que no fue contratado en ninguna de ellas.
							</li>
							<li>
								<strong>LinkedIn Optimizado:</strong> El usuario debe contar con su perfil de LinkedIn actualizado y
								optimizado conforme a las instrucciones y asesorías brindadas por Assendia durante su permanencia.
							</li>
							<li>
								<strong>Validación de Ingresos Posterior:</strong> Como medida de auditoría para validar la condición de
								desempleo, el usuario acepta y se compromete a presentar sus{" "}
								<strong>estados de cuenta bancarios correspondientes a los 45 días calendario posteriores</strong> a la
								emisión del reembolso por parte de Assendia, donde se evidencie que{" "}
								<strong>NO ha recibido ningún tipo de ingreso económico</strong> por concepto de contratación laboral,
								planillas o servicios profesionales. De detectarse algún ingreso laboral en dicho periodo, la garantía
								quedará sin efecto y Assendia se reserva el derecho de revertir o reclamar la devolución del fondo
								reembolsado por incumplimiento de términos.
							</li>
						</ol>
						<p>
							Para cualquier otro plan o servicio individual fuera de estas condiciones específicas del Plan Max, los
							pagos realizados <strong>no son reembolsables</strong>.
						</p>
					</section>

					<section className="space-y-4">
						<h2>7. Exclusión de Garantías Generales y Limitación de Responsabilidad</h2>
						<p>
							Assendia es una plataforma de acompañamiento, optimización de herramientas y desarrollo profesional. El
							éxito en la búsqueda de empleo depende de factores externos como el desempeño del usuario en los filtros
							de selección, la oferta del mercado y la decisión discrecional de las empresas contratantes.
						</p>
						<p>
							Por lo tanto, fuera de la garantía específica detallada en la Sección 6,{" "}
							<strong>
								Assendia no garantiza de ninguna manera la obtención final de un empleo, entrevistas de trabajo
								garantizadas ni ofertas salariales específicas.
							</strong>
						</p>
					</section>

					<section className="space-y-4">
						<h2>8. Propiedad Intelectual</h2>
						<p>
							Todo el contenido disponible en Assendia (marcas, interfaces, software, metodologías de asesoría,
							algoritmos de optimización, textos y plantillas) es propiedad exclusiva de Assendia y está protegido por
							las leyes de propiedad intelectual e industrial. Queda prohibida la reproducción, distribución, reventa o
							uso comercial no autorizado de estos materiales.
						</p>
					</section>

					<section className="space-y-4">
						<h2>9. Ley Aplicable y Jurisdicción</h2>
						<p>
							Estos Términos se rigen e interpretan de acuerdo con las leyes de la República del Perú. Cualquier
							controversia, disputa o reclamación que surja en relación con el uso de la plataforma o la prestación de
							los servicios se someterá a la jurisdicción exclusiva de los jueces y tribunales del distrito judicial de
							Lima Centro, Perú.
						</p>
					</section>

					<section className="space-y-4">
						<h2>10. Contacto</h2>
						<p>Si tienes alguna duda o consulta técnica respecto a estos Términos de Servicio, puedes escribirnos a:</p>
						<address className="space-y-2 not-italic">
							<p>
								<strong>Correo electrónico:</strong>{" "}
								<a href="mailto:assendia@stackkstudios.com">assendia@stackkstudios.com</a>
							</p>
							<p>
								<strong>Sitio Web:</strong> <a href="https://assendia.com">assendia.com</a>
							</p>
						</address>
					</section>
				</article>
			</div>
		</main>
	);
}
