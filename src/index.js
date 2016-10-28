'use strict';

import 'babel-polyfill';
import 'source-map-support/register';

import {spawn} from 'child_process';
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
	RE_LINUX_ADDR = /^addr\:/i,
	RE_LINUX_BCAST = /^bcast\:/i,
	RE_LINUX_MASK = /^mask\:/i,
	RE_IFCONFIG_IPV4 = /^inet\s/,
	RE_IFCONFIG_IPV6 = /^inet6\s/,
	RE_IPV4 = /^ipv4$/i,
	RE_UNIX_BCAST = /^broadcast$/i,
	RE_UNIX_MASK = /^netmask$/i,
	VERBOSE = '-v';

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

function _initInterfaces () {
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
					this.options.includeLoopback || !iface.internal)))));
}

function _isNullOrUndefined (value) {
	return value === null || typeof value === 'undefined';
}

function _parseInterfaceInfo (ifconfigResult) {
	let
		info = {},
		terms;

	// parse output
	ifconfigResult.split(/\s{2}/).forEach((line) => {
		line = line.replace(/\t/g, '');

		if (RE_IFCONFIG_IPV4.test(line)) {
			debug('IPv4 information found: %s', line);

			terms = line.split(/\s/);
			terms.forEach((term, i) => {
				// linux formatting - addr:10.0.2.15
				if (RE_LINUX_ADDR.test(term)) {
					info.address = term.split(RE_LINUX_ADDR)[1];
					return;
				}

				// linux formatting - Bcast:10.0.2.255
				if (RE_LINUX_BCAST.test(term)) {
					info.broadcast = term.split(RE_LINUX_BCAST)[1];
					return;
				}

				// linux formatting - Mask:255.255.255.0
				if (RE_LINUX_MASK.test(term)) {
					info.netmask = term.split(RE_LINUX_MASK)[1];
					return;
				}

				// unix formatting - address is 1st term
				if (i === 1) {
					info.address = term;
					return;
				}

				// unix formatting - netmask 0xffffff00
				if (RE_UNIX_MASK.test(term)) {
					let netmask = terms[i + 1];

					// convert from hexidecimal if applicable
					if (/^0x/.test(netmask)) {
						// iterate 2 chars at a time converting from hex to decimal
						for (let i = CHAR_ADVANCE; i < netmask.length; i += CHAR_ADVANCE) {
							info.netmask = [
								info.netmask || '',
								info.netmask ? '.' : '',
								parseInt(
									['0x', netmask.slice(i, i + CHAR_ADVANCE)].join(''),
									BASE_16)].join('');
						}

						return;
					}

					// set netmask in teh event it is not in hexidecimal format
					info.netmask = netmask;
					return;
				}

				// unix formatting - broadcast 10.129.8.255
				if (RE_UNIX_BCAST.test(term)) {
					info.broadcast = terms[i + 1];
				}
			});
		}

		if (RE_IFCONFIG_IPV6.test(line)) {
			debug('IPv6 information found: %s', line);
		}
	});

	return info;
}

export class NetworkInfo {
	constructor (options) {
		this._interfaces = [];
		this.options = options || {};

		this::_ensureDefaultOptions();
		this::_initInterfaces();
	}

	async listInterfaces () {
		return await Promise.all(this._interfaces
			.map((iface) => this::_ensureBroadcast(iface)));
	}
}

export default { NetworkInfo }
