/*eslint babel/object-shorthand:0*/
/*eslint no-unused-expressions:0*/

var
	childProcess = require('child_process'),

	chai = require('chai'),
	mockSpawn = require('mock-spawn'),

	lib = require('../dist'),

	should = chai.should();


describe('unit tests for simple-ifconfig', function () {
	'use strict';

	var
		ifconfigMock = mockSpawn(),
		commandCalled = {},
		mockErr = '',
		mockExitCode = 0,
		mockOutput = '';

		// override the child process to mock calls to spawn
		childProcess.spawn = ifconfigMock;
		ifconfigMock.setStrategy((command, args, opts) => {
			if (!/ifconfig/.test(command)) {
				return null;
			}

			// track what was called
			commandCalled = {
				command : command,
				args : args,
				opts : opts
			};

			// handle response
			return function (done) {
				if (mockErr) {
					this.stderr.write(mockErr);
				} else {
					this.stdout.write(mockOutput);
				}

				return done(mockExitCode);
			}
		});

		beforeEach(function () {
			// reset mock outputs
			mockErr = '';
			mockExitCode = 0;
			mockOutput = '';

			/*
			testMac = `lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384
	options=1203<RXCSUM,TXCSUM,TXSTATUS,SW_TIMESTAMP>
	inet 127.0.0.1 netmask 0xff000000
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x1
	nd6 options=201<PERFORMNUD,DAD>
gif0: flags=8010<POINTOPOINT,MULTICAST> mtu 1280
stf0: flags=0<> mtu 1280
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether 28:cf:e9:17:99:a9
	inet6 fe80::1858:e1c7:bd6e:7f8b%en0 prefixlen 64 secured scopeid 0x5
	inet 10.129.8.128 netmask 0xffffff00 broadcast 10.129.8.255
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect
	status: active
en1: flags=963<UP,BROADCAST,SMART,RUNNING,PROMISC,SIMPLEX> mtu 1500
	options=60<TSO4,TSO6>
	ether 32:00:12:54:34:a0
	media: autoselect <full-duplex>
	status: inactive
en2: flags=963<UP,BROADCAST,SMART,RUNNING,PROMISC,SIMPLEX> mtu 1500
	options=60<TSO4,TSO6>
	ether 32:00:12:54:34:a1
	media: autoselect <full-duplex>
	status: inactive
p2p0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 2304
	ether 0a:cf:e9:17:99:a9
	media: autoselect
	status: inactive
awdl0: flags=8943<UP,BROADCAST,RUNNING,PROMISC,SIMPLEX,MULTICAST> mtu 1484
	ether ba:6a:33:46:e7:3b
	inet6 fe80::b86a:33ff:fe46:e73b%awdl0 prefixlen 64 scopeid 0xa
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect
	status: active
bridge0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	options=63<RXCSUM,TXCSUM,TSO4,TSO6>
	ether 32:00:12:54:34:a0
	Configuration:
		id 0:0:0:0:0:0 priority 0 hellotime 0 fwddelay 0
		maxage 0 holdcnt 0 proto stp maxaddr 100 timeout 1200
		root id 0:0:0:0:0:0 priority 0 ifcost 0 port 0
		ipfilter disabled flags 0x2
	member: en1 flags=3<LEARNING,DISCOVER>
	        ifmaxaddr 0 port 6 priority 0 path cost 0
	member: en2 flags=3<LEARNING,DISCOVER>
	        ifmaxaddr 0 port 7 priority 0 path cost 0
	nd6 options=201<PERFORMNUD,DAD>
	media: <unknown type>
	status: inactive
utun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 2000
	inet6 fe80::1718:cddc:a53c:d8ce%utun0 prefixlen 64 scopeid 0xc
	nd6 options=201<PERFORMNUD,DAD>
utun1: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380
	inet6 fe80::1131:d105:b655:d508%utun1 prefixlen 64 scopeid 0xd
	nd6 options=201<PERFORMNUD,DAD>
fw0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 4078
	lladdr 00:0a:27:02:00:4b:13:fb
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect <full-duplex>
	status: inactive
en3: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	options=10b<RXCSUM,TXCSUM,VLAN_HWTAGGING,AV>
	ether a8:20:66:16:d4:9d
	inet6 fe80::47c:7156:262f:72db%en3 prefixlen 64 secured scopeid 0x4
	inet 10.129.4.66 netmask 0xfffffc00 broadcast 10.129.7.255
	nd6 options=201<PERFORMNUD,DAD>
	media: autoselect (100baseTX <full-duplex>)
	status: active
vboxnet0: flags=8943<UP,BROADCAST,RUNNING,PROMISC,SIMPLEX,MULTICAST> mtu 1500
	ether 0a:00:27:00:00:00
	inet 192.168.99.1 netmask 0xffffff00 broadcast 192.168.99.255`;
//*/
		});

		describe('#', () => {
			it('should default options when not provided', () => {
				var client = new lib.NetworkInfo();
				should.exist(client);
				should.exist(client.listInterfaces);
				should.exist(client.options);

				should.exist(client.options.ifconfigPath);
				client.options.ifconfigPath.should.equal('/sbin/ifconfig');
				should.exist(client.options.includeInternal);
				client.options.includeInternal.should.be.false;
			});

			it('should override options when specified', () => {
				var client = new lib.NetworkInfo({
					ifconfigPath : '/usr/local/bin/ifconfig',
					includeInternal : true
				});

				should.exist(client);
				should.exist(client.listInterfaces);
				should.exist(client.options);

				should.exist(client.options.ifconfigPath);
				client.options.ifconfigPath.should.equal('/usr/local/bin/ifconfig');
				should.exist(client.options.includeInternal);
				client.options.includeInternal.should.be.true;
			});
		});

		describe('#listInterfaces', () => {
			describe('bsd', () => {
				beforeEach(() => {
					mockOutput = `
em0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> metric 0 mtu 1500
	options=9b<RXCSUM,TXCSUM,VLAN_MTU,VLAN_HWTAGGING,VLAN_HWCSUM>
	ether 08:00:27:35:48:46
	inet6 fe80::a00:27ff:fe35:4846%em0 prefixlen 64 scopeid 0x1
	inet 10.0.2.4 netmask 0xffffff00 broadcast 10.0.2.255
	nd6 options=23<PERFORMNUD,ACCEPT_RTADV,AUTO_LINKLOCAL>
	media: Ethernet autoselect (1000baseT <full-duplex>)
	status: active
lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> metric 0 mtu 16384
	options=600003<RXCSUM,TXCSUM,RXCSUM_IPV6,TXCSUM_IPV6>
	inet6 ::1 prefixlen 128
	inet6 fe80::1%lo0 prefixlen 64 scopeid 0x2
	inet 127.0.0.1 netmask 0xff000000
	nd6 options=21<PERFORMNUD,AUTO_LINKLOCAL>
	groups: lo
`;
				});
			});

			describe('linux', () => {
				beforeEach(() => {
					mockOutput = `
enp0s3    Link encap:Ethernet  HWaddr 08:00:27:a9:57:5a
        inet addr:10.0.2.15  Bcast:10.0.2.255  Mask:255.255.255.0
        inet6 addr: fe80::a00:27ff:fea9:575a/64 Scope:Link
        UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
        RX packets:1358 errors:0 dropped:0 overruns:0 frame:0
        TX packets:649 errors:0 dropped:0 overruns:0 carrier:0
        collisions:0 txqueuelen:1000
        RX bytes:1821168 (1.8 MB)  TX bytes:49319 (49.3 KB)

lo        Link encap:Local Loopback
        inet addr:127.0.0.1  Mask:255.0.0.0
        inet6 addr: ::1/128 Scope:Host
        UP LOOPBACK RUNNING  MTU:65536  Metric:1
        RX packets:0 errors:0 dropped:0 overruns:0 frame:0
        TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
        collisions:0 txqueuelen:1
        RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)
`;
				});

				it('should properly parse linux ifconfig output (defaults)', (done) => {
					var
						client = new lib.NetworkInfo(),
						interfaces;

					client
						.listInterfaces()
						.then((interfaces) => {
							should.exist(interfaces);
							interfaces.should.be.an.Array;
							interfaces.should.have.length(1);

							return done();
						})
						.catch(done);
				});
			});
		});
});
