import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/policy")({
	component: PolicyPage,
	head: () => ({
		meta: [
			{ title: "Política de Privacidad · ASSENDIA" },
			{
				name: "description",
				content:
					"Política de Privacidad de Assendia: qué datos recolectamos, autenticación con Google OAuth, pagos con Mercado Pago, uso de IA, derechos ARCO (Ley N° 29733) y retención de datos.",
			},
		],
	}),
});

function PolicyPage() {
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
						Política de Privacidad de Assendia
					</h1>
					<p className="mt-6 text-foreground/75 leading-relaxed">
						En Assendia (operado a través de <strong>assendia.com</strong>), la seguridad y la privacidad de los datos
						de nuestros usuarios son prioridades fundamentales. Este documento detalla qué información recolectamos,
						cómo la utilizamos para optimizar su perfil profesional y qué medidas implementamos para proteger su
						integridad.
					</p>
					<p className="mt-4 text-foreground/75 leading-relaxed">
						Al utilizar nuestra plataforma y servicios, usted acepta las prácticas descritas en esta Política de
						Privacidad.
					</p>
				</header>

				<article className="mt-12 space-y-12 text-foreground/75 leading-relaxed [&_a]:font-medium [&_a]:text-oxblood [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-display [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:tracking-tight [&_h3]:font-display [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:text-lg [&_h3]:tracking-tight [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:ps-5 [&_ol]:marker:font-medium [&_ol]:marker:text-oxblood [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:ps-5 [&_ul]:marker:text-oxblood">
					<section className="space-y-4">
						<h2>1. Información que Recolectamos</h2>
						<p>
							Para ofrecer las herramientas de optimización de CV y gestionar asesorías personalizadas, recopilamos la
							siguiente información:
						</p>
						<ul>
							<li>
								<strong>Datos de Cuenta y Autenticación:</strong> Nombre completo, dirección de correo electrónico y
								número de teléfono.
							</li>
							<li>
								<strong>Información Profesional (Datos de CV):</strong> Historial laboral, educación, certificaciones,
								habilidades, enlaces a perfiles profesionales como LinkedIn y cualquier archivo o texto que el usuario
								cargue en la plataforma para su análisis.
							</li>
							<li>
								<strong>Información de Uso Técnico:</strong> Dirección IP, tipo de navegador, cookies de sesión e
								interacciones dentro de la aplicación destinadas a la optimización del rendimiento del servicio.
							</li>
						</ul>

						<h3>Exclusión de Contraseñas y Datos Bancarios</h3>
						<p>
							<strong>
								Assendia no almacena, no recolectamos ni tenemos acceso a sus contraseñas ni a sus datos bancarios.
							</strong>
						</p>
						<ul>
							<li>
								<strong>Autenticación:</strong> El acceso a la plataforma se realiza exclusivamente a través del sistema
								de autenticación segura <strong>Google OAuth</strong>. Assendia solo recibe la confirmación de identidad
								y los datos básicos de perfil autorizados por el usuario, sin interactuar jamás con su contraseña de
								Google.
							</li>
							<li>
								<strong>Pagos:</strong> Todos los pagos y suscripciones se procesan de forma externa y segura a través
								de la pasarela de pago <strong>Mercado Pago</strong>, bajo sus propios estándares de seguridad
								internacional.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2>2. Finalidad del Uso de la Información</h2>
						<p>La información recopilada se utiliza exclusivamente para los siguientes fines:</p>
						<ol>
							<li>
								<strong>Prestación del Servicio:</strong> Análisis y procesamiento de currículums mediante algoritmos de
								Inteligencia Artificial para generar sugerencias de mejora.
							</li>
							<li>
								<strong>Asesorías Personalizadas:</strong> Intercambio de información del perfil profesional con el
								mentor asignado para la preparación de la sesión internacional.
							</li>
							<li>
								<strong>Gestión y Soporte:</strong> Autenticación de sesiones, administración de suscripciones y
								respuesta a consultas técnicas.
							</li>
							<li>
								<strong>Auditoría de Reembolsos:</strong> En solicitudes de garantía del Plan Max, la documentación
								enviada (evidencias de postulación y validación de ingresos) será tratada bajo estricta confidencialidad
								y eliminada permanentemente tras concluir la auditoría.
							</li>
						</ol>
					</section>

					<section className="space-y-4">
						<h2>3. Inteligencia Artificial y Proveedores Terceros</h2>
						<p>
							Para ejecutar el análisis avanzado de perfiles, Assendia utiliza infraestructura en la nube y modelos de
							procesamiento de lenguaje.
						</p>
						<ul>
							<li>
								Los datos profesionales se envían de forma cifrada a estos servicios únicamente con el fin de generar
								sugerencias de redacción.
							</li>
							<li>
								Assendia no vende, comercializa ni transfiere sus datos personales a terceras empresas para fines
								publicitarios ajenos a nuestro servicio.
							</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2>4. Retención y Eliminación de Datos</h2>
						<p>
							Los datos personales se conservarán mientras la cuenta del usuario permanezca activa o sea necesario para
							la prestación del servicio contratado. El usuario podrá solicitar la eliminación definitiva de su cuenta y
							de todo su historial profesional mediante una solicitud escrita al equipo de soporte. Una vez procesada,
							la información será borrada de nuestros servidores de forma irreversible.
						</p>
					</section>

					<section className="space-y-4">
						<h2>5. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)</h2>
						<p>
							Conforme a la Ley N° 29733 (Ley de Protección de Datos Personales en Perú), el usuario tiene derecho a:
						</p>
						<ul>
							<li>
								<strong>Acceso:</strong> Conocer qué información personal se encuentra en nuestras bases de datos.
							</li>
							<li>
								<strong>Rectificación:</strong> Actualizar o corregir datos inexactos o incompletos.
							</li>
							<li>
								<strong>Cancelación:</strong> Solicitar la supresión de sus datos cuando ya no sean necesarios para los
								fines que fueron recopilados.
							</li>
							<li>
								<strong>Oposición:</strong> Negarse al uso de sus datos para fines específicos no esenciales para el
								servicio.
							</li>
						</ul>
						<p>
							Para ejercer estos derechos, el usuario debe enviar una comunicación formal al correo electrónico de
							contacto de Assendia.
						</p>
					</section>

					<section className="space-y-4">
						<h2>6. Seguridad de la Información</h2>
						<p>
							Implementamos medidas técnicas y administrativas, como el cifrado SSL en la transferencia de datos, para
							proteger la información contra accesos no autorizados o alteraciones. Dado que el acceso se gestiona a
							través de terceros, el usuario es responsable de mantener la seguridad y privacidad de su propia cuenta de
							Google.
						</p>
					</section>

					<section className="space-y-4">
						<h2>7. Modificaciones a la Política</h2>
						<p>
							Assendia se reserva el derecho de actualizar esta Política de Privacidad para adaptarla a cambios
							legislativos o mejoras en el servicio. Cualquier modificación relevante será notificada a través de la
							plataforma o vía correo electrónico antes de entrar en vigor.
						</p>
					</section>

					<section className="space-y-4">
						<h2>8. Contacto</h2>
						<p>
							Para consultas relacionadas con la protección de datos personales, puede comunicarse con nosotros a través
							de los siguientes medios:
						</p>
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
