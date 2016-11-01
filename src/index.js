'use strict';

import 'babel-polyfill';
import 'source-map-support/register';

import { spawn } from 'child_process';
import logger from 'debug';
import os from 'os';

const
	BASE_16 = 16,
	CHAR_ADVANCE = 2,
	debug = logger('simple-ifconfig'),
	DEFAULT_OPTIONS = {
		ifconfigPath : '/sbin/ifconfig',
		includeLoopback : false
	},
	RE_FLAGS = /^\s*flags\=/,
	RE_FLAGS_LOOPBACK = /(^|\s+)loopback($|\s+)/i,
	RE_FLAGS_PROMISCUOUS = /(^|\s+)promisc($|\s+)/i,
	RE_FLAGS_UP = /(^|\s+)up($|\s+)/i,
	RE_IFCONFIG_IPV4 = /^\s*inet\s/,
	RE_IFCONFIG_IPV6 = /^\s*inet6\s/,
	RE_IPV4 = /^ipv4$/i,
	RE_IPV6 = /^ipv6$/i,
	RE_LINUX_ADDR = /^addr\:/i,
	RE_LINUX_BCAST = /^bcast\:/i,
	RE_LINUX_MASK = /^mask\:/i,
	RE_UNIX_ADDR = /^inet$/i,
	RE_UNIX_BCAST = /^broadcast$/i,
	RE_UNIX_FLAGS_EXTRACT = /[.]*\<([a-z\,\s]*)\>[.]*/i,
	RE_UNIX_MASK = /^netmask$/i,
	VERBOSE = '-v';

/*
function _ensureBroadcast (iface) {
	// if broadcast already exists, don't look it up again
	if (iface.broadcast || !RE_IPV4.test(iface.family)) {
		return Promise.resolve(iface);
	}

	// parse the broadcast from the results of the ifconfig command
	return this::_ifconfig(VERBOSE, iface.name)
		.then((result) => Promise.resolve(this::_parseInterfaceInfo(result)))
		.then((info) => {
			// assign the broadcast address to the interface
			iface.broadcast = info.broadcast

			return Promise.resolve(iface);
		});
}
//*/

function _ensureDefaultOptions () {
	Object
		.getOwnPropertyNames(DEFAULT_OPTIONS)
		.forEach((optionName) => {
			if (_isNullOrUndefined(this.options[optionName])) {
				debug(
					'setting option %s to %o',
					optionName,
					DEFAULT_OPTIONS[optionName]);

				this.options[optionName] = DEFAULT_OPTIONS[optionName];
			}
		});
}

function _ensureInterfaces () {
	if (this._interfaces.length) {
		return Promise.resolve(this._interfaces);
	}

	return new Promise((resolve, reject) => {
		return this::_ifconfig(VERBOSE)
			.then((result) => {
				this::_parseInterfaceInfo(result);

				return resolve(this._interfaces);
			})
			.catch(reject);
	});

	/*
	let networkInterfaceInfo = os.networkInterfaces();

	// collect network interface information
	Object
		.getOwnPropertyNames(networkInterfaceInfo)
		.forEach((name) => (this._interfaces
			.splice(0, 0, ...networkInterfaceInfo[name]
				// add name to each interface
				.map((iface) => {
					iface.name = name;
					return iface;
				})
				// filter out loopback interfaces if necessary
				.filter((iface) => (
					this.options.includeLoopback || !iface.internal))
				.filter((iface) => (
					this.options.includeIPv6 || !RE_IPV6.test(iface.family))))));
	//*/
}

function _ifconfig (...args) {
	return new Promise((resolve, reject) => {
		let
			ifconfig = spawn(this.options.ifconfigPath, args),
			stderr = [],
			stdout = [];

		// handle command exit
		ifconfig.on('close', (code) => {
			debug(
				'%s %s: command completed with code: %s',
				this.options.ifconfigPath,
				args.join(' '),
				code);

			if (code) {
				let err = new Error(stderr.join(''));
				err.code = code;
				err.command = `${this.options.ifconfigPath} ${args.join(' ')}`;

				return reject(err);
			}

			return resolve(stdout.join(''));
		});

		// handle errors while attempting to execute command
		ifconfig.on('error', (err) => {
			err.command = `${this.options.ifconfigPath} ${args.join(' ')}`;
			debug('%s: command failed: %s', err.command, err.message);

			return reject(err);
		});

		// capture command output
		ifconfig.stdout.on('data', (chunk) => stdout.push(chunk));
		ifconfig.stderr.on('data', (chunk) => stderr.push(chunk));
	});
}

function _isNullOrUndefined (value) {
	return value === null || typeof value === 'undefined';
}

function _parseInterfaceInfo (ifconfigResult) {
	let iface;

	ifconfigResult.split(/\r?\n/).forEach((line) => {
		// look for a new interface line
		if (!/\s/.test(line.charAt(0))) {
			// split the line on spaces (and optionally a colon)
			line = line.split(/\:?\s/);

			// create new iface...
			iface = {};

			// assign the name using the first term in the line
			iface.name = line[0];

			// ensure we properly parsed a name for the interface
			if (iface.name) {
				this._interfaces.push(iface);
			}

			// rebuild the line minus the adapter name
			line = line.slice(1).join(' ');
		}

		// look for UNIX style flag information
		if (RE_FLAGS.test(line)) {
			// sanitize the flags
			line = line.match(RE_UNIX_FLAGS_EXTRACT)[1].replace(/\,\s*/g, ' ');

			debug('Interface flags found: %s', line);

			iface.active = RE_FLAGS_UP.test(line);
			iface.loopback = RE_FLAGS_LOOPBACK.test(line);
			iface.promiscuous = RE_FLAGS_PROMISCUOUS.test(line);

			return;
		}

		// look for IPv4 info...
		if (RE_IFCONFIG_IPV4.test(line)) {
			debug('IPv4 information found: %s', line);

			let terms = line.split(/\s+/);

			terms.forEach((term, i) => {
				// linux formatting - addr:10.0.2.15
				if (RE_LINUX_ADDR.test(term)) {
					iface.address = term.split(RE_LINUX_ADDR)[1];
					return;
				}

				// linux formatting - Bcast:10.0.2.255
				if (RE_LINUX_BCAST.test(term)) {
					iface.broadcast = term.split(RE_LINUX_BCAST)[1];
					return;
				}

				// linux formatting - Mask:255.255.255.0
				if (RE_LINUX_MASK.test(term)) {
					iface.netmask = term.split(RE_LINUX_MASK)[1];
					return;
				}

				// unix formatting - address is 1st term
				if (RE_UNIX_ADDR.test(term)) {
					iface.address = terms[i + 1];
					return;
				}

				// unix formatting - netmask 0xffffff00
				if (RE_UNIX_MASK.test(term)) {
					let netmask = terms[i + 1];

					// convert from hexidecimal if applicable
					if (/^0x/.test(netmask)) {
						// iterate 2 chars at a time converting from hex to decimal
						for (let i = CHAR_ADVANCE; i < netmask.length; i += CHAR_ADVANCE) {
							iface.netmask = [
								iface.netmask || '',
								iface.netmask ? '.' : '',
								parseInt(
									['0x', netmask.slice(i, i + CHAR_ADVANCE)].join(''),
									BASE_16)].join('');
						}

						return;
					}

					// set netmask in teh event it is not in hexidecimal format
					iface.netmask = netmask;
					return;
				}

				// unix formatting - broadcast 10.129.8.255
				if (RE_UNIX_BCAST.test(term)) {
					iface.broadcast = terms[i + 1];
				}
			});
		}

		// look for IPv6 info
		if (RE_IFCONFIG_IPV6.test(line)) {
			debug('IPv6 information found: %s', line);
		}
	});

	return this._interfaces;
}

export class NetworkInfo {
	constructor (options) {
		debug('new NetworkInfo(%o)', options);

		this._interfaces = [];
		this.options = options || {};

		this::_ensureDefaultOptions();
	}

	async listInterfaces () {
		await this::_ensureInterfaces();

		return this._interfaces;
	}
}

export default { NetworkInfo }
