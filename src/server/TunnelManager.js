/**
 * @fileoverview Public HTTPS tunnel manager for localhost.
 *
 * Responsibilities:
 * - Create HTTPS tunnel using cloudflared
 * - Manage tunnel lifecycle
 * - Provide public URL
 */

import { spawn } from 'child_process';
import { platform } from 'os';
import { execSync } from 'child_process';

/**
 * Public HTTPS tunnel manager.
 *
 * @class TunnelManager
 */
export class TunnelManager {
	/**
	 * Creates a TunnelManager instance.
	 *
	 * @param {number} port - Local port to expose
	 */
	constructor(port) {
		/** @type {number} */
		this.port = port;
		
		/** @type {any|null} */
		this.tunnel = null;
		
		/** @type {string|null} */
		this.publicUrl = null;
	}

	/**
	 * Starts the HTTPS tunnel using cloudflared.
	 *
	 * @returns {Promise<string>} Tunnel public URL
	 */
	async start() {
		if (this.tunnel) {
			throw new Error('Tunnel is already active');
		}

		return new Promise((resolve, reject) => {
			const os = platform();
			let command;
			
			const commonPaths = [];
			
			if (os === 'darwin') {
				commonPaths.push('/opt/homebrew/bin/cloudflared');
				commonPaths.push('/usr/local/bin/cloudflared');
			} else if (os === 'linux') {
				commonPaths.push('/usr/local/bin/cloudflared');
				commonPaths.push('/usr/bin/cloudflared');
			} else if (os === 'win32') {
				commonPaths.push('C:\\Program Files\\Cloudflare\\cloudflared.exe');
				commonPaths.push('C:\\Program Files (x86)\\Cloudflare\\cloudflared.exe');
			}
			
			let found = false;
			
			// Try 'which' or 'where' first (if in PATH)
			try {
				if (os === 'win32') {
					const whichResult = execSync('where cloudflared.exe', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
					if (whichResult) {
						command = whichResult.split('\n')[0];
						found = true;
					}
				} else {
					const whichResult = execSync('which cloudflared', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
					if (whichResult) {
						command = whichResult;
						found = true;
					}
				}
			} catch (e) {
				// 'which' failed, try common paths
			}
			
			if (!found) {
				for (const path of commonPaths) {
					try {
						execSync(`"${path}" --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
						command = path;
						found = true;
						break;
					} catch (e) {
						// This path doesn't work, continue
					}
				}
			}
			
			if (!found) {
				command = os === 'win32' ? 'cloudflared.exe' : 'cloudflared';
			}

			// Run cloudflared tunnel
			this.tunnel = spawn(command, [
				'tunnel',
				'--url',
				`http://localhost:${this.port}`
			], {
				stdio: ['ignore', 'pipe', 'pipe'],
				shell: false
			});

			let output = '';
			let errorOutput = '';
			let urlResolved = false;

			// 30 second timeout to get the URL
			let timeoutId;
			
			const tryResolveUrl = (text) => {
				if (urlResolved) return;
				
				// Look for URL in text (cloudflared may show in different formats)
				// Formatos posibles:
				// - https://random-name.trycloudflare.com
				// - +--------------------------------------------------------------------------------------------+
				//   |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
				//   |  https://random-name.trycloudflare.com                                                    |
				//   +--------------------------------------------------------------------------------------------+
				const urlMatch = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi);
				if (urlMatch && urlMatch.length > 0) {
					this.publicUrl = urlMatch[0].toLowerCase();
					urlResolved = true;
					if (timeoutId) {
						clearTimeout(timeoutId);
					}
					resolve(this.publicUrl);
				}
			};

			this.tunnel.stdout.on('data', (data) => {
				const text = data.toString();
				output += text;
				tryResolveUrl(text);
			});

			this.tunnel.stderr.on('data', (data) => {
				const text = data.toString();
				errorOutput += text;
				tryResolveUrl(text);
			});

			this.tunnel.on('error', (err) => {
				if (err.code === 'ENOENT') {
					reject(new Error('cloudflared is not installed or not in PATH. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/ and ensure it is in your PATH.'));
				} else {
					reject(new Error(`Error starting cloudflared: ${err.message}`));
				}
			});

			this.tunnel.on('close', (code) => {
				if (urlResolved) {
					return;
				}
				
				if (code !== 0 && code !== null && !urlResolved) {
					const fullOutput = output + errorOutput;
					let errorMsg = `cloudflared exited with code ${code}`;
					
					if (errorOutput.includes('command not found') || errorOutput.includes('not found')) {
						errorMsg = 'cloudflared is not installed or not in PATH. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/';
					} else if (fullOutput) {
						errorMsg += `\nOutput: ${fullOutput.substring(0, 500)}`;
					}
					
					console.error('cloudflared error:', errorMsg);
					this.tunnel = null;
					this.publicUrl = null;
					
					if (!urlResolved) {
						reject(new Error(errorMsg));
					}
				}
			});

			timeoutId = setTimeout(() => {
				if (!urlResolved) {
					this.tunnel?.kill();
					this.tunnel = null;
					reject(new Error('Timeout waiting for cloudflared URL. Verify cloudflared is installed and working. Output: ' + (output + errorOutput).substring(0, 500)));
				}
			}, 30000);
		});
	}

	/**
	 * Stops the HTTPS tunnel.
	 *
	 * @returns {Promise<void>}
	 */
	async stop() {
		if (!this.tunnel) {
			return;
		}

		try {
			this.tunnel.kill();
			this.tunnel = null;
			this.publicUrl = null;
		} catch (error) {
			console.error('Error closing tunnel:', error);
		}
	}

	/**
	 * Returns whether the tunnel is active.
	 *
	 * @returns {boolean} true if active
	 */
	isActive() {
		return this.tunnel !== null;
	}

	/**
	 * Gets the tunnel public URL.
	 *
	 * @returns {string|null} Public URL or null if not active
	 */
	getPublicUrl() {
		return this.publicUrl;
	}
}

