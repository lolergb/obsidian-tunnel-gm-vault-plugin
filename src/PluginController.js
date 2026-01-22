/**
 * @fileoverview Controlador principal del plugin.
 * 
 * Responsabilidades:
 * - Conectar todos los módulos
 * - Gestionar comandos de Obsidian
 * - Gestionar el estado del plugin
 * - NO contiene lógica de negocio
 */

import { Notice, SuggestModal, TFolder } from 'obsidian';
import { VaultExporter } from './exporters/VaultExporter.js';

/**
 * Controlador principal que orquesta todos los módulos del plugin.
 * 
 * @class PluginController
 */
export class PluginController {
	/**
	 * Crea una instancia de PluginController.
	 * 
	 * @param {import('obsidian').App} app - Aplicación de Obsidian
	 * @param {import('obsidian').Plugin} plugin - Instancia del plugin
	 */
	constructor(app, plugin) {
		/** @type {import('obsidian').App} */
		this.app = app;
		
		/** @type {import('obsidian').Plugin} */
		this.plugin = plugin;
		
		/** @type {VaultExporter|null} */
		this.vaultExporter = null;
		
		/** @type {import('obsidian').TFolder|null} */
		this.currentSessionFolder = null;
	}

	/**
	 * Inicializa el plugin y registra comandos.
	 * 
	 * @returns {Promise<void>}
	 */
	async initialize() {
		// Inicializa módulos
		this.vaultExporter = new VaultExporter(this.app);
		
		// Registra comandos de Obsidian
		this._registerCommands();
		
		// Carga configuración guardada
		await this._loadSettings();
	}

	/**
	 * Limpia recursos cuando el plugin se desactiva.
	 * 
	 * @returns {Promise<void>}
	 */
	async cleanup() {
		// No hay recursos que limpiar en el enfoque local-first
	}

	/**
	 * Registra comandos de Obsidian.
	 * 
	 * @private
	 */
	_registerCommands() {
		this.plugin.addCommand({
			id: 'select-session-folder',
			name: 'Select session folder',
			callback: () => this.selectSessionFolder()
		});
		
		this.plugin.addCommand({
			id: 'export-vault-json',
			name: 'Export vault for GM Vault',
			callback: () => this.exportVaultToJson()
		});
	}


	/**
	 * Exporta el vault a un archivo JSON con HTML embebido (local-first).
	 * No requiere servidor HTTP ni túnel.
	 * Las imágenes locales se omiten (se recomienda usar URLs externas).
	 * 
	 * @returns {Promise<void>}
	 */
	async exportVaultToJson() {
		if (!this.currentSessionFolder) {
			new Notice('❌ Please select a session folder first');
			return;
		}

		try {
			new Notice('⏳ Exporting your vault for GM Vault...');
			
			// Exportar usando VaultExporter (sin opciones de imagen)
			const json = await this.vaultExporter.exportVault(this.currentSessionFolder);
			
			// Convertir a string
			const jsonString = JSON.stringify(json, null, 2);
			
			// Calcular tamaño
			const sizeKB = (new TextEncoder().encode(jsonString).length / 1024).toFixed(1);
			
			// Generar nombre de archivo
			const timestamp = new Date().toISOString().slice(0, 10);
			const fileName = `gm-vault-${this.currentSessionFolder.name}-${timestamp}.json`;
			
			// Crear el archivo en la raíz del vault
			const filePath = fileName;
			
			// Verificar si el archivo ya existe
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);
			if (existingFile) {
				// Sobrescribir
				await this.app.vault.modify(existingFile, jsonString);
			} else {
				// Crear nuevo
				await this.app.vault.create(filePath, jsonString);
			}
			
			// Contar páginas
			let pageCount = 0;
			const countPages = (categories) => {
				for (const cat of categories) {
					for (const item of cat.items || []) {
						if (item.type === 'page') {
							pageCount++;
						} else if (item.type === 'category') {
							countPages([item]);
						}
					}
				}
			};
			countPages(json.categories);
			
			// Mensaje más amigable sin mencionar "JSON"
			new Notice(
				`✅ Your vault has been exported successfully!\n\n` +
				`📁 File: ${fileName}\n` +
				`📊 ${pageCount} pages exported\n` +
				`💾 Size: ${sizeKB} KB\n\n` +
				`📥 Next step: Open GM Vault in Owlbear Rodeo → Settings → Import → Select this file`,
				12000
			);
			
		} catch (error) {
			console.error('Error exporting vault:', error);
			new Notice(`❌ Error exporting vault: ${error.message}`);
		}
	}

	/**
	 * Permite al usuario seleccionar una carpeta de sesión.
	 * Siempre muestra el selector para elegir manualmente.
	 * 
	 * @returns {Promise<void>}
	 */
	async selectSessionFolder() {
		// Obtener todas las carpetas del vault
		const folders = [];
		const addFolders = (folder) => {
			folders.push(folder);
			for (const child of folder.children || []) {
				if (child instanceof TFolder) {
					addFolders(child);
				}
			}
		};
		addFolders(this.app.vault.getRoot());
		
		// Siempre mostrar el selector para elegir carpeta manualmente
		const controller = this;
		
		class FolderSuggester extends SuggestModal {
			constructor(app, folders) {
				super(app);
				this.folders = folders;
				this.setPlaceholder('Type to search folders...');
			}
			
			getSuggestions(query) {
				return this.folders.filter(folder => 
					folder.path.toLowerCase().includes(query.toLowerCase())
				);
			}
			
			renderSuggestion(folder, el) {
				el.createDiv({ text: folder.name });
				el.createDiv({ 
					text: folder.path, 
					cls: 'suggestion-description' 
				});
			}
			
			async onChooseSuggestion(folder, evt) {
				controller.currentSessionFolder = folder;
				new Notice(`✅ Session folder selected: ${folder.path}`);
				await controller._saveSettings();
			}
		}
		
		new FolderSuggester(this.app, folders).open();
	}


	/**
	 * Carga la configuración guardada.
	 * 
	 * @private
	 * @returns {Promise<void>}
	 */
	async _loadSettings() {
		const data = await this.plugin.loadData();
		
		if (data && data.sessionFolderPath) {
			const folder = this.app.vault.getAbstractFileByPath(data.sessionFolderPath);
			if (folder && folder instanceof TFolder) {
				this.currentSessionFolder = folder;
			}
		}
	}

	/**
	 * Guarda la configuración.
	 * 
	 * @private
	 * @returns {Promise<void>}
	 */
	async _saveSettings() {
		await this.plugin.saveData({
			sessionFolderPath: this.currentSessionFolder?.path || null
		});
	}
}

