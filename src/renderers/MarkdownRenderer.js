/**
 * @fileoverview Renderizador que convierte archivos Markdown de Obsidian a HTML.
 * Usado exclusivamente por el endpoint GET /pages/:slug.
 * 
 * Utiliza markdown-it para el parsing y renderizado.
 */

import MarkdownIt from 'markdown-it';

/**
 * Renderizador de Markdown a HTML para páginas individuales.
 * 
 * @class MarkdownRenderer
 */
export class MarkdownRenderer {
	/**
	 * Crea una instancia de MarkdownRenderer.
	 * 
	 * @param {string|null} baseUrl - URL base para convertir URLs relativas a absolutas
	 */
	constructor(baseUrl = null) {
		/** @type {string|null} */
		this.baseUrl = baseUrl;
		
		/** @type {MarkdownIt} */
		this.md = new MarkdownIt({
			html: true,
			linkify: true,
			typographer: true
		});
		
		/**
		 * Mapeo de nombres de archivo a información de página para mentions
		 * @type {Map<string, {id: string, name: string, slug: string}>|null}
		 */
		this.pageMap = null;
		
		// Configura el renderizador para manejar wiki links de Obsidian
		this._configureWikiLinks();
	}
	
	/**
	 * Establece la URL base para convertir URLs relativas a absolutas.
	 * 
	 * @param {string} baseUrl - URL base
	 */
	setBaseUrl(baseUrl) {
		this.baseUrl = baseUrl;
	}

	/**
	 * Establece el mapeo de páginas para convertir wiki links a mentions.
	 * 
	 * @param {Map<string, {id: string, name: string, slug: string}>} pageMap - Mapeo de nombres de página a información
	 */
	setPageMap(pageMap) {
		this.pageMap = pageMap;
	}

	/**
	 * Renderiza contenido Markdown a HTML.
	 * 
	 * @param {string} markdown - Contenido Markdown a renderizar
	 * @param {string|null} baseUrl - URL base para los wiki links (opcional, usa this.baseUrl si no se proporciona)
	 * @returns {string} HTML renderizado
	 */
	render(markdown, baseUrl = null) {
		const urlBase = baseUrl || this.baseUrl;
		
		// Si tenemos pageMap, procesar wiki links DESPUÉS del renderizado para evitar que markdown-it los procese
		// Si no tenemos pageMap, procesar antes del renderizado como fallback
		if (this.pageMap) {
			// Primero renderizar el markdown normalmente
			let html = this.md.render(markdown);
			// Luego convertir los wiki links que quedaron sin procesar a mentions
			html = this._convertWikiLinksToMentions(html, urlBase);
			return html;
		} else {
			// Fallback: procesar antes del renderizado (pero no en bloques de código)
			const processedMarkdown = this._convertWikiLinksInMarkdown(markdown, urlBase);
			let html = this.md.render(processedMarkdown);
			// También procesar después del renderizado por si algunos se escaparon
			html = this._convertWikiLinksInHTML(html, urlBase);
			return html;
		}
	}

	/**
	 * Renderiza Markdown a HTML con un wrapper completo de página.
	 * 
	 * @param {string} markdown - Contenido Markdown
	 * @param {string} title - Título de la página
	 * @param {string|null} baseUrl - URL base para convertir URLs relativas (opcional, usa this.baseUrl si no se proporciona)
	 * @returns {string} HTML completo de la página
	 */
	renderPage(markdown, title, baseUrl = null) {
		// Usar el baseUrl proporcionado o el de la instancia
		const urlBase = baseUrl || this.baseUrl;
		let content = this.render(markdown, urlBase);
		
		// Convertir URLs relativas a absolutas si hay una URL base
		if (urlBase) {
			content = this._convertRelativeUrlsToAbsolute(content, urlBase);
		}
		
		// Convertir tags de Obsidian a tags de Notion
		content = this._convertTagsToNotionTags(content);
		
		// Añadir clases de Notion
		content = this._addNotionClasses(content);
		
		// Añadir target="_blank" a enlaces externos
		content = this._addTargetToExternalLinks(content);
		
		// Procesar el título y envolver el contenido
		content = this._wrapInNotionStructure(content, title);
		
		return `<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${this._escapeHtml(title)}</title>
	<style>
		/* ==========================================================================
		   Variables CSS (de GM Vault app.css)
		   ========================================================================== */
		:root {
			/* Backgrounds */
			--color-bg-primary: rgba(0, 0, 0, 0.24);
			--color-bg-hover: rgba(0, 0, 0, 0.24);
			--color-bg-active: rgba(187, 153, 255, 0.12);
			--color-bg-overlay: rgba(34, 38, 57, 0.8);
			--color-bg-surface: rgb(34, 38, 57);
			
			/* Borders */
			--color-border-primary: rgba(0, 0, 0, 0);
			--color-border-active: rgba(187, 153, 255, 0.32);
			--color-border-subtle: rgba(255, 255, 255, 0.1);
			
			/* Text */
			--color-text-primary: #fff;
			--color-text-secondary: #e0e0e0;
			--color-text-muted: #999;
			--color-text-hint: #888;
			--color-text-disabled: #777;
			
			/* Accent */
			--color-accent-primary: #967ACC;
			--color-accent-primary-hover: #603EA2;
			--color-accent-link: #967ACC;
			
			/* Error */
			--color-error-bg: #4a2d2d;
			--color-error-border: #6a4040;
			--color-error-text: #ff6b6b;
			
			/* Spacing */
			--spacing-xs: 4px;
			--spacing-sm: 8px;
			--spacing-md: 12px;
			--spacing-lg: 16px;
			--spacing-xl: 24px;
			
			/* Border radius */
			--radius-sm: 4px;
			--radius-md: 6px;
			--radius-lg: 8px;
			--radius-full: 50%;
			
			/* Transitions */
			--transition-fast: 0.15s ease;
			--transition-normal: 0.2s ease;
			--transition-slow: 0.3s ease;
			
			/* Typography */
			--font-family-base: Roboto, Helvetica, Arial, sans-serif;
			--font-family-mono: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
			--font-size-xs: 12px;
			--font-size-sm: 14px;
			--font-size-base: 16px;
			--font-size-md: 18px;
			--font-size-lg: 20px;
			--font-size-xl: 24px;
			--font-weight-normal: 400;
			--font-weight-medium: 500;
			--font-weight-bold: 700;
			
			/* Icons */
			--icon-size-lg: 28px;
			
			/* Images */
			--max-height-image-container: 300px;
			--min-height-image-container: 100px;
		}
		
		/* ==========================================================================
		   Base styles
		   ========================================================================== */
		* {
			box-sizing: border-box;
		}
		
		body {
			margin: 0;
			padding: 0;
			background: var(--color-bg-surface);
			font-family: var(--font-family-base);
			font-size: var(--font-size-base);
			color: var(--color-text-secondary);
		}
		
		/* ==========================================================================
		   Notion Content Styles (de notion-markdown.css)
		   ========================================================================== */
		.notion-content {
			padding: 0 var(--spacing-xl) var(--spacing-xl);
			max-width: 800px;
			margin: 0 auto;
			color: var(--color-text-primary);
			line-height: 1.6;
			font-family: var(--font-family-base);
			transition: max-width 0.3s ease;
		}
		
		/* Cover de página de Notion */
		.notion-page-cover {
			width: calc(100% + var(--spacing-xl)*2);
			max-width: calc(100% + var(--spacing-xl)*2);
			min-height: var(--max-height-image-container);
			margin: calc(var(--spacing-xl) * -1) calc(var(--spacing-xl) * -1) var(--spacing-xl);
			margin-top: calc(var(--spacing-xl) * -1);
			overflow: hidden;
			border-radius: 0;
			position: relative;
		}
		
		.notion-page-cover .notion-image-container {
			position: relative;
			width: 100%;
			min-height: var(--max-height-image-container);
			display: flex;
			align-items: center;
			justify-content: center;
		}
		
		.notion-page-cover .notion-image-container img,
		.notion-cover-image {
			width: 100%;
			height: auto;
			display: block;
			object-fit: cover;
			object-position: center center;
			max-height: var(--max-height-image-container);
			cursor: pointer;
			opacity: 1 !important;
			transition: opacity 0.2s ease;
			margin: 0 auto;
		}
		
		.notion-cover-image:hover {
			opacity: 0.9 !important;
		}
		
		/* Título de página de Notion (después del cover) */
		.notion-page-title {
			font-size: calc(var(--font-size-xl) * 1.6);
			font-weight: var(--font-weight-bold);
			margin-top: var(--spacing-xl);
			margin-bottom: var(--spacing-md);
			line-height: 1.2;
			color: var(--color-text-primary);
			padding: 0;
		}
		
		/* Ajustar padding del contenido cuando hay cover */
		.notion-content:has(.notion-page-cover) {
			padding-top: var(--spacing-xl);
		}
		
		.notion-content h1 {
			font-size: calc(var(--font-size-xl) * 1.4);
			font-weight: var(--font-weight-bold);
			margin-top: var(--spacing-xl);
			margin-bottom: var(--spacing-md);
			line-height: 1.2;
		}
		
		.notion-content h2 {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-bold);
			margin-top: calc(var(--spacing-xl) * 1.4);
			margin-bottom: var(--spacing-md);
			line-height: var(--icon-size-lg);
			font-family: var(--font-family-base);
		}
		
		.notion-content h3 {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-medium);
			margin-top: var(--spacing-xl);
			margin-bottom: var(--spacing-md);
			line-height: 1.3;
		}
		
		.notion-content p {
			margin-top: calc(var(--font-size-base) * 0.5);
			margin-bottom: calc(var(--font-size-base) * 0.5);
			white-space: pre-wrap;
			word-break: break-word;
		}
		
		.notion-content .notion-text {
			color: var(--color-text-primary);
		}
		
		.notion-content .notion-text-bold {
			font-weight: var(--font-weight-medium);
		}
		
		.notion-content .notion-text-italic {
			font-style: italic;
		}
		
		.notion-content .notion-text-underline {
			text-decoration: underline;
		}
		
		.notion-content .notion-text-strikethrough {
			text-decoration: line-through;
		}
		
		.notion-content .notion-text-code {
			background: rgba(135, 131, 120, 0.15);
			color: var(--color-error-text);
			border-radius: var(--radius-sm);
			padding: calc(var(--font-size-base) * 0.2) calc(var(--font-size-base) * 0.4);
			font-size: 85%;
			font-family: var(--font-family-mono);
		}
		
		.notion-content .notion-text-link,
		.notion-content a {
			color: var(--color-accent-link);
			text-decoration: underline;
			text-decoration-color: var(--color-text-muted);
			transition: background-color var(--transition-fast);
		}
		
		.notion-content .notion-text-link:hover,
		.notion-content a:hover {
			background-color: var(--color-bg-hover);
		}
		
		.notion-content .notion-image {
			width: 100%;
			max-width: 100%;
			margin: var(--font-size-base) 0;
			border-radius: var(--radius-sm);
			display: block;
			position: relative;
		}
		
		.notion-content .notion-image-container {
			position: relative;
			width: 100%;
			display: inline-block;
			max-width: 100%;
			min-height: var(--min-height-image-container);
		}
		
		.notion-content .notion-image img,
		.notion-content img {
			width: 100%;
			height: auto;
			border-radius: var(--radius-sm);
			transition: opacity var(--transition-normal);
		}
		
		.notion-content .notion-image-clickable {
			cursor: pointer;
		}
		
		.notion-content .notion-image-clickable:hover {
			opacity: 0.9;
		}
		
		.notion-content .notion-image-caption {
			font-size: var(--font-size-base);
			color: var(--color-text-muted);
			text-align: center;
			margin-top: var(--spacing-xs);
		}
		
		.notion-content .notion-bulleted-list,
		.notion-content .notion-numbered-list,
		.notion-content ul,
		.notion-content ol {
			margin: var(--spacing-xs) 0;
			padding-left: calc(var(--spacing-lg) + var(--spacing-md));
		}
		
		.notion-content .notion-bulleted-list-item,
		.notion-content .notion-numbered-list-item,
		.notion-content li {
			margin: var(--spacing-xs) 0;
			padding-left: var(--radius-sm);
		}
		
		.notion-content .notion-bulleted-list-item::marker,
		.notion-content .notion-numbered-list-item::marker,
		.notion-content li::marker {
			color: var(--color-text-primary);
		}
		
		.notion-content .notion-callout,
		.notion-content blockquote {
			padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
			margin: var(--spacing-lg) 0;
			border-radius: var(--radius-sm);
			background: var(--color-bg-primary);
			border-left: 3px solid var(--color-border-subtle);
			display: flex;
			flex-direction: row;
			gap: var(--spacing-md);
		}
		
		.notion-content .notion-callout-icon {
			font-size: calc(var(--font-size-base) * 1.5);
			line-height: 1;
		}
		
		.notion-content .notion-callout-content {
			flex: 1;
		}
		
		.notion-content .notion-divider,
		.notion-content hr {
			border: none;
			border-top: 1px solid var(--color-border-subtle);
			margin: calc(var(--spacing-sm) - var(--spacing-xs)) 0;
		}
		
		.notion-content .notion-code,
		.notion-content pre {
			background: rgba(135, 131, 120, 0.15);
			border-radius: var(--radius-sm);
			padding: var(--font-size-base);
			margin: var(--font-size-base) 0;
			overflow-x: auto;
			font-family: var(--font-family-mono);
			font-size: 85%;
			line-height: 1.5;
		}
		
		.notion-content .notion-code code,
		.notion-content pre code,
		.notion-content code {
			color: var(--color-text-primary);
			white-space: pre;
			font-family: var(--font-family-mono);
		}
		
		/* Inline code */
		.notion-content p code,
		.notion-content li code {
			background: rgba(135, 131, 120, 0.15);
			color: var(--color-error-text);
			border-radius: var(--radius-sm);
			padding: calc(var(--font-size-base) * 0.2) calc(var(--font-size-base) * 0.4);
			font-size: 85%;
			white-space: normal;
		}
		
		.notion-content .notion-table,
		.notion-content table {
			width: 100%;
			margin: var(--font-size-base) 0;
			border-collapse: collapse;
			border: 1px solid var(--color-border-subtle);
		}
		
		.notion-content .notion-table th,
		.notion-content .notion-table td,
		.notion-content table th,
		.notion-content table td {
			padding: var(--spacing-sm) var(--spacing-md);
			border: 1px solid var(--color-border-subtle);
			text-align: left;
		}
		
		.notion-content .notion-table th,
		.notion-content table th {
			background: var(--color-bg-primary);
			font-weight: var(--font-weight-medium);
		}
		
		.notion-content .notion-table tr:nth-child(even),
		.notion-content table tr:nth-child(even) {
			background: var(--color-bg-hover);
		}
		
		.notion-content .notion-quote {
			border-left: 3px solid var(--color-border-subtle);
			padding-left: calc(var(--spacing-md) + var(--spacing-xs));
			margin: calc(var(--spacing-sm) - var(--spacing-xs)) 0;
			color: var(--color-text-muted);
		}
		
		.notion-content .notion-toggle {
			margin: var(--spacing-xs) 0;
		}
		
		.notion-content .notion-toggle-summary {
			cursor: pointer;
			user-select: none;
			padding: var(--radius-sm) 2px;
			margin-left: 1px;
		}
		
		.notion-content .notion-toggle-content {
			margin-left: calc(var(--spacing-lg) + var(--spacing-md));
			margin-top: 2px;
		}
		
		/* ==========================================================================
		   Mention Styles
		   ========================================================================== */
		.notion-mention {
			display: inline-flex;
			align-items: center;
			background: var(--color-bg-primary);
			border-radius: var(--radius-sm);
			padding: 2px 6px;
			margin: 0 2px;
			cursor: pointer;
			transition: background-color var(--transition-fast);
		}
		
		.notion-mention:hover {
			background: var(--color-bg-hover);
		}
		
		.notion-mention--link {
			color: var(--color-accent-link);
			text-decoration: none;
		}
		
		/* ==========================================================================
		   Tag Styles
		   ========================================================================== */
		.notion-tag {
			display: inline-block;
			background: var(--color-bg-primary);
			color: var(--color-text-secondary);
			padding: 2px 8px;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			margin: 2px;
		}
		
		/* ==========================================================================
		   Animations
		   ========================================================================== */
		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.5; }
		}
	</style>
</head>
<body>
	<div id="notion-content">
		${content}
	</div>
	<script>
		// VERSION: 2026-01-28-v2 - Solo usa postMessage, NO accede a extensionController
		console.log('🚀 Script cargado - VERSION 2026-01-28-v2');
		
		// Manejar clics en mentions - usar el sistema de modales de GM Vault
		// Si GM Vault no encuentra la página por ID, intentar buscarla por URL
		(function() {
			const mentions = document.querySelectorAll('.notion-mention--link');
			console.log('🔍 Mentions encontrados:', mentions.length);
			
			mentions.forEach(function(mention) {
				if (mention.dataset.listenerAdded) return;
				mention.dataset.listenerAdded = 'true';
				
				const pageId = mention.dataset.mentionPageId;
				const pageName = mention.dataset.mentionPageName || 'Page';
				const pageUrl = mention.dataset.mentionPageUrl;
				
				console.log('📌 Mention configurado:', { pageId, pageName, pageUrl });
				
				// Click handler que usa postMessage para comunicarse con GM Vault de forma segura
				mention.addEventListener('click', function(e) {
					e.preventDefault();
					e.stopPropagation();
					
					console.log('🖱️ Click en mention:', { pageId, pageName, pageUrl });
					
					if (!pageUrl) {
						console.warn('⚠️ No hay pageUrl en el mention');
						return;
					}
					
					// Siempre intentar usar postMessage si estamos en un iframe
					// No intentar acceder a window.parent.extensionController (causa error CORS)
					try {
						if (window.parent && window.parent !== window) {
							console.log('📨 Enviando mensaje a window.parent...');
							window.parent.postMessage({
								type: 'openMentionModal',
								pageId: pageId,
								pageName: pageName,
								pageUrl: pageUrl
							}, '*');
							console.log('✅ Mensaje enviado a GM Vault');
							return;
						}
					} catch (error) {
						console.error('❌ Error al enviar mensaje:', error);
					}
					
					// Fallback: navegar directamente a la página
					console.log('🔗 Navegando directamente a:', pageUrl);
					window.location.href = pageUrl;
				});
				
				// Keyboard handler (Enter/Space for accessibility)
				mention.addEventListener('keydown', function(e) {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						e.stopPropagation();
						
						const pageId = this.dataset.mentionPageId;
						const pageName = this.dataset.mentionPageName || 'Page';
						const pageUrl = this.dataset.mentionPageUrl;
						
						if (!pageUrl) return;
						
						// Usar postMessage igual que en el click handler
						try {
							if (window.parent && window.parent !== window) {
								window.parent.postMessage({
									type: 'openMentionModal',
									pageId: pageId,
									pageName: pageName,
									pageUrl: pageUrl
								}, '*');
								return;
							}
						} catch (error) {
							console.error('❌ Error al enviar mensaje:', error);
						}
						
						window.location.href = pageUrl;
					}
				});
			});
		})();
	</script>
</body>
</html>`;
	}

	/**
	 * Añade clases de Notion al HTML renderizado usando regex.
	 * 
	 * @private
	 * @param {string} html - HTML renderizado
	 * @returns {string} HTML con clases de Notion
	 */
	_addNotionClasses(html) {
		let processed = html;
		
		// Función helper para añadir clase solo si no existe
		const addClass = (tag, className) => {
			// Buscar tags que no tengan la clase ya
			const regex = new RegExp(`<${tag}(?![^>]*class="[^"]*${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^>]*)>`, 'gi');
			return processed.replace(regex, (match, attrs) => {
				// Si ya tiene atributos, añadir la clase al final
				if (attrs && attrs.trim()) {
					return `<${tag}${attrs} class="${className}">`;
				} else {
					return `<${tag} class="${className}">`;
				}
			});
		};
		
		// Normalizar párrafos
		processed = addClass('p', 'notion-paragraph');
		
		// Normalizar listas
		processed = addClass('ul', 'notion-bulleted-list');
		processed = addClass('ol', 'notion-numbered-list');
		
		// Normalizar items de lista (más complejo porque depende del padre)
		// Primero procesar los que están dentro de ul ya procesados
		processed = processed.replace(/(<ul[^>]*class="[^"]*notion-bulleted-list[^>]*>)([\s\S]*?)(<\/ul>)/g, (match, open, content, close) => {
			const processedContent = content.replace(/<li([^>]*)>/gi, (liMatch, liAttrs) => {
				if (!liAttrs || !liAttrs.includes('class="notion-bulleted-list-item"')) {
					return liAttrs.trim() 
						? `<li${liAttrs} class="notion-bulleted-list-item">`
						: `<li class="notion-bulleted-list-item">`;
				}
				return liMatch;
			});
			return open + processedContent + close;
		});
		
		// Procesar los que están dentro de ol ya procesados
		processed = processed.replace(/(<ol[^>]*class="[^"]*notion-numbered-list[^>]*>)([\s\S]*?)(<\/ol>)/g, (match, open, content, close) => {
			const processedContent = content.replace(/<li([^>]*)>/gi, (liMatch, liAttrs) => {
				if (!liAttrs || !liAttrs.includes('class="notion-numbered-list-item"')) {
					return liAttrs.trim() 
						? `<li${liAttrs} class="notion-numbered-list-item">`
						: `<li class="notion-numbered-list-item">`;
				}
				return liMatch;
			});
			return open + processedContent + close;
		});
		
		// Normalizar código (bloques primero)
		processed = addClass('pre', 'notion-code');
		
		// Código inline (solo si no está dentro de un pre)
		processed = processed.replace(/<code(?![^>]*class="[^"]*notion-text-code)(?![^>]*<pre)([^>]*)>/gi, (match, attrs) => {
			return attrs.trim() 
				? `<code${attrs} class="notion-text-code">`
				: `<code class="notion-text-code">`;
		});
		
		// Normalizar enlaces (pero no añadir target aquí, se hace después)
		processed = addClass('a', 'notion-text-link');
		
		// Normalizar texto en negrita (strong y b)
		processed = processed.replace(/<(strong)(?![^>]*class="[^"]*notion-text-bold)([^>]*)>/gi, (match, tag, attrs) => {
			return attrs.trim() 
				? `<${tag}${attrs} class="notion-text-bold">`
				: `<${tag} class="notion-text-bold">`;
		});
		processed = processed.replace(/<(b)(?![^>]*class="[^"]*notion-text-bold)([^>]*)>/gi, (match, tag, attrs) => {
			return attrs.trim() 
				? `<${tag}${attrs} class="notion-text-bold">`
				: `<${tag} class="notion-text-bold">`;
		});
		
		// Normalizar texto en cursiva (em e i)
		processed = processed.replace(/<(em)(?![^>]*class="[^"]*notion-text-italic)([^>]*)>/gi, (match, tag, attrs) => {
			return attrs.trim() 
				? `<${tag}${attrs} class="notion-text-italic">`
				: `<${tag} class="notion-text-italic">`;
		});
		processed = processed.replace(/<(i)(?![^>]*class="[^"]*notion-text-italic)([^>]*)>/gi, (match, tag, attrs) => {
			return attrs.trim() 
				? `<${tag}${attrs} class="notion-text-italic">`
				: `<${tag} class="notion-text-italic">`;
		});
		
		// Normalizar texto subrayado
		processed = addClass('u', 'notion-text-underline');
		
		// Normalizar texto tachado (s y del)
		processed = processed.replace(/<(s)(?![^>]*class="[^"]*notion-text-strikethrough)([^>]*)>/gi, (match, tag, attrs) => {
			return attrs.trim() 
				? `<${tag}${attrs} class="notion-text-strikethrough">`
				: `<${tag} class="notion-text-strikethrough">`;
		});
		processed = processed.replace(/<(del)(?![^>]*class="[^"]*notion-text-strikethrough)([^>]*)>/gi, (match, tag, attrs) => {
			return attrs.trim() 
				? `<${tag}${attrs} class="notion-text-strikethrough">`
				: `<${tag} class="notion-text-strikethrough">`;
		});
		
		// Normalizar blockquotes
		processed = addClass('blockquote', 'notion-quote');
		
		// Normalizar tablas
		processed = addClass('table', 'notion-table');
		
		// Normalizar separadores
		processed = addClass('hr', 'notion-divider');
		
		return processed;
	}

	/**
	 * Configura el renderizador para manejar wiki links de Obsidian [[link]].
	 * Nota: Los wiki links se procesan después del renderizado en el método render().
	 * 
	 * @private
	 */
	_configureWikiLinks() {
		// Los wiki links se procesan después del renderizado en el método render()
		// para evitar conflictos con el parsing de markdown-it
	}

	/**
	 * Convierte wiki links [[nombre]] a enlaces markdown antes del renderizado.
	 * Evita procesar wiki links dentro de bloques de código (tanto bloques como inline).
	 * 
	 * @private
	 * @param {string} markdown - Markdown con wiki links sin procesar
	 * @param {string|null} baseUrl - URL base para los enlaces (opcional)
	 * @returns {string} Markdown con wiki links convertidos a enlaces markdown
	 */
	_convertWikiLinksInMarkdown(markdown, baseUrl = null) {
		// Dividir el markdown en partes: bloques de código y texto normal
		const parts = [];
		let lastIndex = 0;
		
		// Buscar bloques de código (```...```) y código inline (`...`)
		// Usar una regex que capture ambos tipos
		const codeRegex = /```[\s\S]*?```|`[^`\n]+`/g;
		let match;
		
		while ((match = codeRegex.exec(markdown)) !== null) {
			// Procesar texto antes del código
			if (match.index > lastIndex) {
				const beforeCode = markdown.substring(lastIndex, match.index);
				parts.push({ text: beforeCode, isCode: false });
			}
			// Guardar el código sin procesar
			parts.push({ text: match[0], isCode: true });
			lastIndex = match.index + match[0].length;
		}
		
		// Procesar el resto del texto
		if (lastIndex < markdown.length) {
			parts.push({ text: markdown.substring(lastIndex), isCode: false });
		}
		
		// Si no hay código, procesar todo el texto
		if (parts.length === 0) {
			parts.push({ text: markdown, isCode: false });
		}
		
		// Procesar solo las partes que no son código
		const processedParts = parts.map(part => {
			if (part.isCode) {
				return part.text;
			}
			
			// Buscar wiki links: [[nombre]] o [[nombre|display]]
			// Usar una regex más robusta que capture todo entre los corchetes
			const wikiLinkRegex = /\[\[([^\]]+?)\]\]/g;
			
			return part.text.replace(wikiLinkRegex, (match, linkContent) => {
				// Separar path y display name
				const parts = linkContent.split('|');
				const linkPath = parts[0].trim();
				const displayName = (parts[1] || parts[0]).trim();
				
				// Si tenemos pageMap, convertir a mention de Notion directamente en HTML
				if (this.pageMap) {
					const pageInfo = this.pageMap.get(linkPath.toLowerCase());
					if (pageInfo) {
						// Página encontrada: crear mention clickeable
						const urlBase = baseUrl || this.baseUrl;
						const pageUrl = urlBase 
							? `${urlBase}/pages/${pageInfo.slug}`
							: `/pages/${pageInfo.slug}`;
						return `<span class="notion-mention notion-mention--link" data-mention-page-id="${pageInfo.id}" data-mention-page-name="${this._escapeHtml(pageInfo.name)}" data-mention-page-url="${pageUrl}" role="button" tabindex="0" aria-label="Open ${this._escapeHtml(pageInfo.name)}">${this._escapeHtml(displayName)}</span>`;
					} else {
						// Página no encontrada: mention sin link
						return `<span class="notion-mention notion-mention--plain" data-mention-page-name="${this._escapeHtml(linkPath)}">${this._escapeHtml(displayName)}</span>`;
					}
				}
				
				// Si no hay pageMap, convertir a enlace markdown estándar (fallback)
				const slug = this._slugify(linkPath);
				const urlBase = baseUrl || this.baseUrl;
				const href = urlBase 
					? `${urlBase}/pages/${slug}`
					: `/pages/${slug}`;
				
				// Convertir a enlace markdown estándar
				return `[${displayName}](${href})`;
			});
		});
		
		return processedParts.join('');
	}

	/**
	 * Convierte wiki links [[nombre]] a mentions de Notion después del renderizado.
	 * Usa el pageMap para crear mentions con IDs correctos.
	 * 
	 * @private
	 * @param {string} html - HTML renderizado que puede contener wiki links sin procesar
	 * @param {string|null} baseUrl - URL base para los enlaces (opcional)
	 * @returns {string} HTML con wiki links convertidos a mentions
	 */
	_convertWikiLinksToMentions(html, baseUrl = null) {
		if (!this.pageMap) {
			return html;
		}
		
		// Dividir el HTML en partes: dentro de enlaces/spans y fuera
		const parts = [];
		let lastIndex = 0;
		
		// Buscar enlaces HTML y spans existentes para no procesar wiki links dentro de ellos
		const existingElementsRegex = /<(a|span)\s+[^>]*>[\s\S]*?<\/(a|span)>/gi;
		let match;
		
		while ((match = existingElementsRegex.exec(html)) !== null) {
			// Procesar texto antes del elemento
			if (match.index > lastIndex) {
				const beforeElement = html.substring(lastIndex, match.index);
				parts.push({ text: beforeElement, isElement: false });
			}
			// Guardar el elemento sin procesar
			parts.push({ text: match[0], isElement: true });
			lastIndex = match.index + match[0].length;
		}
		
		// Procesar el resto del texto
		if (lastIndex < html.length) {
			parts.push({ text: html.substring(lastIndex), isElement: false });
		}
		
		// Si no hay elementos, procesar todo el texto
		if (parts.length === 0) {
			parts.push({ text: html, isElement: false });
		}
		
		// Procesar solo las partes que no son elementos existentes
		const processedParts = parts.map(part => {
			if (part.isElement) {
				return part.text;
			}
			
			// Buscar wiki links: [[nombre]] o [[nombre|display]]
			const wikiLinkRegex = /\[\[([^\]]+?)\]\]/g;
			
			return part.text.replace(wikiLinkRegex, (match, linkContent) => {
				// Separar path y display name
				const parts = linkContent.split('|');
				const linkPath = parts[0].trim();
				const displayName = (parts[1] || parts[0]).trim();
				
				// Buscar la página en el mapeo
				const pageInfo = this.pageMap.get(linkPath.toLowerCase());
				
				if (pageInfo) {
					// Página encontrada: crear mention clickeable
					const urlBase = baseUrl || this.baseUrl;
					const pageUrl = urlBase 
						? `${urlBase}/pages/${pageInfo.slug}`
						: `/pages/${pageInfo.slug}`;
					return `<span class="notion-mention notion-mention--link" data-mention-page-id="${pageInfo.id}" data-mention-page-name="${this._escapeHtml(pageInfo.name)}" data-mention-page-url="${pageUrl}" role="button" tabindex="0" aria-label="Open ${this._escapeHtml(pageInfo.name)}">${this._escapeHtml(displayName)}</span>`;
				} else {
					// Página no encontrada: mention sin link
					return `<span class="notion-mention notion-mention--plain" data-mention-page-name="${this._escapeHtml(linkPath)}">${this._escapeHtml(displayName)}</span>`;
				}
			});
		});
		
		return processedParts.join('');
	}

	/**
	 * Convierte wiki links [[nombre]] que quedaron en el HTML después del renderizado.
	 * Esto captura los casos donde markdown-it escapó los corchetes.
	 * Evita procesar wiki links que ya están dentro de enlaces HTML.
	 * 
	 * @private
	 * @param {string} html - HTML renderizado que puede contener wiki links escapados
	 * @param {string|null} baseUrl - URL base para los enlaces (opcional)
	 * @returns {string} HTML con wiki links convertidos a enlaces
	 */
	_convertWikiLinksInHTML(html, baseUrl = null) {
		// Dividir el HTML en partes: dentro de enlaces y fuera de enlaces
		const parts = [];
		let lastIndex = 0;
		
		// Buscar enlaces HTML existentes para no procesar wiki links dentro de ellos
		const linkRegex = /<a\s+[^>]*>[\s\S]*?<\/a>/gi;
		let match;
		
		while ((match = linkRegex.exec(html)) !== null) {
			// Procesar texto antes del enlace
			if (match.index > lastIndex) {
				const beforeLink = html.substring(lastIndex, match.index);
				parts.push({ text: beforeLink, isLink: false });
			}
			// Guardar el enlace sin procesar
			parts.push({ text: match[0], isLink: true });
			lastIndex = match.index + match[0].length;
		}
		
		// Procesar el resto del texto
		if (lastIndex < html.length) {
			parts.push({ text: html.substring(lastIndex), isLink: false });
		}
		
		// Si no hay enlaces, procesar todo el texto
		if (parts.length === 0) {
			parts.push({ text: html, isLink: false });
		}
		
		// Procesar solo las partes que no son enlaces
		const processedParts = parts.map(part => {
			if (part.isLink) {
				return part.text;
			}
			
			// Buscar wiki links que puedan haber sido escapados
			// Patrón 1: [[nombre]] normal (por si no se procesó antes)
			// Patrón 2: &lt;&lt;nombre&gt;&gt; (si fueron escapados como HTML entities)
			const wikiLinkPatterns = [
				/\[\[([^\]]+?)\]\]/g,  // [[nombre]] normal
				/&lt;&lt;([^&]+?)&gt;&gt;/g  // &lt;&lt;nombre&gt;&gt; escapado
			];
			
			let processedText = part.text;
			for (const pattern of wikiLinkPatterns) {
				processedText = processedText.replace(pattern, (match, linkContent) => {
					// Separar path y display name
					const parts = linkContent.split('|');
					const linkPath = parts[0].trim();
					const displayName = (parts[1] || parts[0]).trim();
					
					// Si tenemos pageMap, convertir a mention de Notion
					if (this.pageMap) {
						const pageInfo = this.pageMap.get(linkPath.toLowerCase());
						if (pageInfo) {
							// Página encontrada: crear mention clickeable
							const urlBase = baseUrl || this.baseUrl;
							const pageUrl = urlBase 
								? `${urlBase}/pages/${pageInfo.slug}`
								: `/pages/${pageInfo.slug}`;
							return `<span class="notion-mention notion-mention--link" data-mention-page-id="${pageInfo.id}" data-mention-page-name="${this._escapeHtml(pageInfo.name)}" data-mention-page-url="${pageUrl}" role="button" tabindex="0" aria-label="Open ${this._escapeHtml(pageInfo.name)}">${this._escapeHtml(displayName)}</span>`;
						} else {
							// Página no encontrada: mention sin link
							return `<span class="notion-mention notion-mention--plain" data-mention-page-name="${this._escapeHtml(linkPath)}">${this._escapeHtml(displayName)}</span>`;
						}
					}
					
					// Si no hay pageMap, convertir a enlace HTML (fallback)
					const slug = this._slugify(linkPath);
					const urlBase = baseUrl || this.baseUrl;
					const href = urlBase 
						? `${urlBase}/pages/${slug}`
						: `/pages/${slug}`;
					
					// Convertir a enlace HTML
					return `<a href="${href}" class="notion-text-link">${this._escapeHtml(displayName)}</a>`;
				});
			}
			
			return processedText;
		});
		
		return processedParts.join('');
	}

	/**
	 * Convierte un texto a slug (similar a slugify.js pero inline).
	 * 
	 * @private
	 * @param {string} text - Texto a convertir
	 * @returns {string} Slug generado
	 */
	_slugify(text) {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	/**
	 * Convierte URLs relativas a absolutas en el HTML.
	 * 
	 * @private
	 * @param {string} html - HTML con URLs relativas
	 * @param {string} baseUrl - URL base (sin barra final)
	 * @returns {string} HTML con URLs absolutas
	 */
	_convertRelativeUrlsToAbsolute(html, baseUrl) {
		// Normalizar la URL base (eliminar barra final si existe)
		const normalizedBase = baseUrl.replace(/\/$/, '');
		
		// Convertir enlaces <a href="/..."> a absolutos
		html = html.replace(/<a\s+([^>]*\s+)?href="(\/[^"]+)"/gi, (match, attrs, href) => {
			// Solo convertir si es una URL relativa que empieza con /
			if (href.startsWith('/') && !href.startsWith('//')) {
				return `<a ${attrs || ''}href="${normalizedBase}${href}"`.replace(/\s+/g, ' ').trim();
			}
			return match;
		});
		
		// Convertir imágenes <img src="/..."> a absolutos
		html = html.replace(/<img\s+([^>]*\s+)?src="(\/[^"]+)"/gi, (match, attrs, src) => {
			// Solo convertir si es una URL relativa que empieza con /
			if (src.startsWith('/') && !src.startsWith('//')) {
				return `<img ${attrs || ''}src="${normalizedBase}${src}"`.replace(/\s+/g, ' ').trim();
			}
			return match;
		});
		
		return html;
	}

	/**
	 * Renderiza una galería de imágenes en tres columnas.
	 * 
	 * @param {Array<{name: string, path: string}>} images - Array de objetos con nombre y ruta de las imágenes
	 * @param {string} title - Título de la galería
	 * @param {string|null} baseUrl - URL base para las imágenes
	 * @returns {string} HTML de la galería
	 */
	renderImageGallery(images, title, baseUrl = null) {
		const urlBase = baseUrl || this.baseUrl || '';
		const normalizedBase = urlBase.replace(/\/$/, '');
		
		// Generar HTML de las imágenes en tres columnas
		let imagesHtml = '';
		for (let i = 0; i < images.length; i += 3) {
			imagesHtml += '<div style="display: flex; gap: 16px; margin-bottom: 16px;">';
			
			// Columna 1
			if (i < images.length) {
				const img1 = images[i];
				const imgUrl = img1.path.startsWith('http') ? img1.path : `${normalizedBase}${img1.path}`;
				imagesHtml += `
					<div style="flex: 1;">
						<img src="${this._escapeHtml(imgUrl)}" alt="${this._escapeHtml(img1.name)}" style="width: 100%; height: auto; border-radius: 4px; object-fit: contain; background: #f5f5f5;" />
					</div>`;
			}
			
			// Columna 2
			if (i + 1 < images.length) {
				const img2 = images[i + 1];
				const imgUrl = img2.path.startsWith('http') ? img2.path : `${normalizedBase}${img2.path}`;
				imagesHtml += `
					<div style="flex: 1;">
						<img src="${this._escapeHtml(imgUrl)}" alt="${this._escapeHtml(img2.name)}" style="width: 100%; height: auto; border-radius: 4px; object-fit: contain; background: #f5f5f5;" />
					</div>`;
			} else {
				imagesHtml += '<div style="flex: 1;"></div>';
			}
			
			// Columna 3
			if (i + 2 < images.length) {
				const img3 = images[i + 2];
				const imgUrl = img3.path.startsWith('http') ? img3.path : `${normalizedBase}${img3.path}`;
				imagesHtml += `
					<div style="flex: 1;">
						<img src="${this._escapeHtml(imgUrl)}" alt="${this._escapeHtml(img3.name)}" style="width: 100%; height: auto; border-radius: 4px; object-fit: contain; background: #f5f5f5;" />
					</div>`;
			} else {
				imagesHtml += '<div style="flex: 1;"></div>';
			}
			
			imagesHtml += '</div>';
		}
		
		return `<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${this._escapeHtml(title)}</title>
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			background: transparent;
		}
		#notion-content {
			max-width: 1200px;
			margin: 0 auto;
		}
		h1 {
			margin-bottom: 24px;
			font-size: 24px;
			font-weight: 600;
			color: inherit;
		}
	</style>
</head>
<body>
	<div id="notion-content">
		<h1>${this._escapeHtml(title)}</h1>
		${imagesHtml}
	</div>
</body>
</html>`;
	}

	/**
	 * Convierte tags de Obsidian (#tag) a tags de Notion.
	 * 
	 * @private
	 * @param {string} html - HTML con tags de Obsidian
	 * @returns {string} HTML con tags de Notion
	 */
	_convertTagsToNotionTags(html) {
		// Colores disponibles de Notion (sin el prefijo "notion-tag--")
		const colors = ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
		
		/**
		 * Obtiene un color consistente para un tag basado en su nombre
		 * @param {string} tagName - Nombre del tag
		 * @returns {string} Color de Notion
		 */
		const getTagColor = (tagName) => {
			// Hash simple del nombre para consistencia
			let hash = 0;
			for (let i = 0; i < tagName.length; i++) {
				hash = ((hash << 5) - hash) + tagName.charCodeAt(i);
				hash = hash & hash; // Convertir a 32bit integer
			}
			return colors[Math.abs(hash) % colors.length];
		};
		
		// Patrón 1: tags: #tag1, #tag2 o tags: #tag1 #tag2 (al final de párrafos)
		// Buscar líneas que empiecen con "tags:" seguido de tags
		html = html.replace(
			/<p[^>]*>tags:\s*([^<]+)<\/p>/gi,
			(match, tagsText) => {
				// Extraer todos los tags (#tag)
				const tagMatches = tagsText.match(/#[\w-]+/g) || [];
				if (tagMatches.length === 0) return match;
				
				// Convertir cada tag a tag de Notion
				const notionTags = tagMatches.map(tag => {
					const tagName = tag.substring(1); // Quitar el #
					const color = getTagColor(tagName);
					return `<span class="notion-tag notion-tag--${color}">${this._escapeHtml(tagName)}</span>`;
				}).join(' ');
				
				return `<p class="notion-paragraph">${notionTags}</p>`;
			}
		);
		
		// Patrón 2: Tags individuales en línea (#tag)
		// Procesar solo dentro de párrafos y listas, evitando code blocks
		// Dividir el HTML en partes: dentro y fuera de code blocks
		const parts = [];
		let lastIndex = 0;
		const codeBlockRegex = /<code[^>]*>[\s\S]*?<\/code>/gi;
		let match;
		
		while ((match = codeBlockRegex.exec(html)) !== null) {
			// Procesar texto antes del code block
			if (match.index > lastIndex) {
				const beforeCode = html.substring(lastIndex, match.index);
				parts.push({ text: beforeCode, isCode: false });
			}
			// Guardar el code block sin procesar
			parts.push({ text: match[0], isCode: true });
			lastIndex = match.index + match[0].length;
		}
		
		// Procesar el resto del texto
		if (lastIndex < html.length) {
			parts.push({ text: html.substring(lastIndex), isCode: false });
		}
		
		// Procesar solo las partes que no son code blocks
		const processedParts = parts.map(part => {
			if (part.isCode) {
				return part.text;
			}
			
			// Reemplazar tags en esta parte
			return part.text.replace(
				/(?<![\w-])#([\w-]+)(?![\w-])/g,
				(match, tagName) => {
					const color = getTagColor(tagName);
					return `<span class="notion-tag notion-tag--${color}">${this._escapeHtml(tagName)}</span>`;
				}
			);
		});
		
		return processedParts.join('');
	}

	/**
	 * Añade target="_blank" a enlaces externos (http/https).
	 * No añade target a enlaces internos que apuntan a /pages/.
	 * 
	 * @private
	 * @param {string} html - HTML con enlaces
	 * @returns {string} HTML con target añadido a enlaces externos
	 */
	_addTargetToExternalLinks(html) {
		return html.replace(/<a\s+([^>]*\s+)?href="([^"]+)"([^>]*)>/gi, (match, attrs1, href, attrs2) => {
			// Si ya tiene target, no modificar
			const allAttrs = (attrs1 || '') + (attrs2 || '');
			if (allAttrs.includes('target=')) {
				return match;
			}
			
			// No añadir target a enlaces internos (que apuntan a /pages/)
			if (href.includes('/pages/')) {
				return match;
			}
			
			// Solo añadir target a URLs externas (http/https)
			if (href.startsWith('http://') || href.startsWith('https://')) {
				// Asegurar que tenga la clase notion-text-link
				let finalAttrs = allAttrs.trim();
				if (!finalAttrs.includes('class="notion-text-link"')) {
					finalAttrs = `class="notion-text-link" ${finalAttrs}`.trim();
				}
				return `<a href="${href}" ${finalAttrs} target="_blank" rel="noopener noreferrer">`;
			}
			
			return match;
		});
	}

	/**
	 * Envuelve el contenido en la estructura de Notion con título.
	 * 
	 * @private
	 * @param {string} content - Contenido HTML
	 * @param {string} title - Título de la página (puede contener markdown)
	 * @returns {string} HTML con estructura de Notion y título
	 */
	_wrapInNotionStructure(content, title) {
		// Remover el primer H1 si existe (el título del markdown)
		// para evitar duplicar el título
		let cleanedContent = content;
		
		// Buscar y remover el primer H1 (puede tener clases de Notion ya aplicadas)
		cleanedContent = cleanedContent.replace(
			/^<h1[^>]*>.*?<\/h1>\s*/i,
			''
		);
		
		// También buscar H1 que pueda estar al inicio de un párrafo o bloque
		cleanedContent = cleanedContent.replace(
			/^<p[^>]*>\s*<h1[^>]*>.*?<\/h1>\s*<\/p>\s*/i,
			''
		);
		
		// Renderizar el título si contiene markdown (ej: **texto**, *texto*, etc.)
		let titleHtml = title;
		if (title.includes('**') || title.includes('*') || title.includes('`') || title.includes('[')) {
			// Renderizar el markdown del título
			titleHtml = this.md.renderInline(title);
			// Aplicar clases de Notion al HTML renderizado
			titleHtml = titleHtml.replace(/<strong>/gi, '<strong class="notion-text-bold">');
			titleHtml = titleHtml.replace(/<em>/gi, '<em class="notion-text-italic">');
			titleHtml = titleHtml.replace(/<code>/gi, '<code class="notion-text-code">');
		} else {
			// Si no tiene markdown, solo escapar HTML
			titleHtml = this._escapeHtml(title);
		}
		
		// Limpiar saltos de línea innecesarios al inicio del contenido
		cleanedContent = cleanedContent.replace(/^\s*\n+/g, '');
		
		return `<h1 class="notion-page-title">${titleHtml}</h1>${cleanedContent}`;
	}

	/**
	 * Escapa HTML para prevenir XSS.
	 * 
	 * @private
	 * @param {string} text - Texto a escapar
	 * @returns {string} Texto escapado
	 */
	_escapeHtml(text) {
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace(/[&<>"']/g, m => map[m]);
	}
}

