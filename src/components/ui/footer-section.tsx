'use client';
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon, Truck } from 'lucide-react';

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
	label: string;
	links: FooterLink[];
}

const footerLinks: FooterSection[] = [
	{
		label: 'Plataforma',
		links: [
			{ title: 'Generar Guía', href: '/track' },
			{ title: 'Rastreo de Envíos', href: '/track' },
			{ title: 'Ingreso Comercial', href: '/login' },
			{ title: 'Cobertura Nacional', href: '#' },
		],
	},
	{
		label: 'Empresa',
		links: [
			{ title: 'Preguntas Frecuentes', href: '#' },
			{ title: 'Sobre Nosotros', href: '#' },
			{ title: 'Política de Privacidad', href: '#' },
			{ title: 'Términos de Servicio', href: '#' },
		],
	},
	{
		label: 'Recursos',
		links: [
			{ title: 'Blog', href: '#' },
			{ title: 'Noticias Logísticas', href: '#' },
			{ title: 'Centro de Ayuda', href: '#' },
			{ title: 'Contacto', href: '#' },
		],
	},
	{
		label: 'Síguenos',
		links: [
			{ title: 'Facebook', href: '#', icon: FacebookIcon },
			{ title: 'Instagram', href: '#', icon: InstagramIcon },
			{ title: 'Youtube', href: '#', icon: YoutubeIcon },
			{ title: 'LinkedIn', href: '#', icon: LinkedinIcon },
		],
	},
];

export function Footer() {
	return (
		<footer className="md:rounded-t-6xl relative w-full flex flex-col items-center justify-center rounded-t-4xl border-t shadow-lg bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.primary/8%),transparent)] px-6 py-12 lg:py-16 mt-auto">
			<div className="bg-primary/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

			<div className="grid w-full max-w-7xl mx-auto gap-8 xl:grid-cols-3 xl:gap-8">
				<AnimatedContainer className="space-y-4">
					<div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-primary">
            <div className="bg-primary text-white p-2 rounded-lg">
              <Truck className="h-6 w-6" />
            </div>
            <span>FRONTERAS EXPRESS</span>
          </div>
					<p className="text-muted-foreground mt-8 text-sm md:mt-0 max-w-xs">
						Más que rápido, siempre a tiempo. Soluciones logísticas integrales para todo el país.
            <br/><br/>
            © {new Date().getFullYear()} Fronteras Express. Todos los derechos reservados.
					</p>
				</AnimatedContainer>

				<div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
					{footerLinks.map((section, index) => (
						<AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
							<div className="mb-10 md:mb-0">
								<h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">{section.label}</h3>
								<ul className="text-muted-foreground space-y-3 text-sm">
									{section.links.map((link) => (
										<li key={link.title}>
											<a
												href={link.href}
												className="hover:text-primary hover:translate-x-1 inline-flex items-center transition-all duration-300"
											>
												{link.icon && <link.icon className="mr-2 size-4" />}
												{link.title}
											</a>
										</li>
									))}
								</ul>
							</div>
						</AnimatedContainer>
					))}
				</div>
			</div>
		</footer>
	);
};

type ViewAnimationProps = {
	delay?: number;
	className?: ComponentProps<typeof motion.div>['className'];
	children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
};
