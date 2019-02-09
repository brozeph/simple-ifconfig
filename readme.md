# simple-ifconfig

[![Build Status](https://travis-ci.org/brozeph/simple-ifconfig.svg?branch=master)](https://travis-ci.org/brozeph/simple-ifconfig) [![Coverage Status](https://coveralls.io/repos/github/brozeph/simple-ifconfig/badge.svg?branch=master)](https://coveralls.io/github/brozeph/simple-ifconfig?branch=master)

This module aims to provide additional information beyond what the `os.networkInterfaces()` method returns (via Node) for each detected network interface.

## Requirements

* `Node.js`: >= `v6.x`
* `Platform`: `Darwin`, `Unix` or `Linux` (_Windows is not supported at this time_)

## Installation

```bash
npm install simple-ifconfig
```

## Usage

### Constructor

Creates a new instance of the `NetworkInfo` class that allows for interaction with the networking interfaces of the system.

`new NetworkInfo(options)`

#### Options (optional)

* `ifconfigPath` (_optional_, `String`) - defaults to `/sbin/ifconfig` when not provided; defines the path to the `ifconfig` executable
* `active` (_optional_, `Boolean`) - defaults to `true` when not provided; when `true`, only the interfaces that are connected and actively transmitting data are included
* `internal` (_optional_, `Boolean`) - defaults to `false` when not provided; when `true`, internal (i.e. loopback, etc.) adapters are included when interacting with various other module methods
* `verbose` (_optional_, `Booelan`) - defaults to `true` when not provided; when `true`, `ifconfig` is called with the verbose flag (`-v`) - on some distros (i.e. `Alpine Linux`) this flag is not supported and it is helpful to turn it off

```javascript
import { NetworkInfo } from 'simple-ifconfig';

const
  ifconfigPath = '/sbin/ifconfg',
  active = false,
  internal = false;

let networking = new NetworkInfo({
  ifconfigPath,
  active,
  internal
});

// work with networking instance...
```

### #applySettings

Uses `ifconfig` to set `hardwareAddress`, `ipv4`, `mtu` as well as `up`/`down` (active) status for an interface.

`new NetworkInfo().applySettings(interfaceName, settings)`

```javascript
import { NetworkInfo } from 'simple-ifconfig';

let networking = new NetworkInfo();

networking
  .applySettings(`eth0`, {
    active : true,
    hardwareAddress : 'AA:BB:CC:00:11:22',
    ipv4 : {
      address : '192.168.0.2',
      broadcast : '192.168.0.1',
      netmask : '255.255.255.0'
    },
    mtu : 1800
  })
  .then(console.log)
  .catch(console.error);
```

* `active` (_optional_, `Boolean`) - brings the interface specified up when `true` or down when `false`
* `hardwareAddress` (_optional_, `String`) - will change the MAC address of the specified interface to the provided value when specified
* `ipv4` (_optional_, `Object`) - will allow for specifying IP address (STATIC) configuration for the specified interface
  * `address` (_optional_, `String`)
  * `broadcast` (_optional_, `String`)
  * `netmask` (_optional_, `String`)
* `mtu` (_optional_, `Number`) - when provided, sets the MTU for the specified interface

**note**: in order to clear a statically configured IP address, most OS variants support providing `0.0.0.0` to "unset" the previously specified `address`, `broadcast` and `subnet`

### #listInterfaces

Retrieves an array of available interfaces, optionally filtered according to [options](#options-optional) provided to the [constructor](#constructor).

`new NetworkInfo().listInterfaces()`

```javascript
import { NetworkInfo } from 'simple-ifconfig';

let networking = new NetworkInfo();

networking.listInterfaces()
  .then(console.log)
  .catch(console.error);
```

Example output:

```javascript
[ { hardwareAddress: '28:cf:e9:17:99:a9',
    internal: false,
    name: 'en0',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 4,
    mtu: 1500,
    ipv6: [ { address: 'fe80::8f0:d3fc:39a2:bb9d', prefixLength: 64 } ],
    ipv4:
     [ { address: '10.129.14.60',
         netmask: '255.255.255.0',
         broadcast: '10.129.14.255' } ],
    active: true },
  { hardwareAddress: 'a8:20:66:16:d4:9d',
    internal: false,
    name: 'en3',
    flags:
     { broadcast: true,
       multicast: true,
       running: true,
       simplex: true,
       smart: true,
       up: true },
    index: 8,
    mtu: 1500,
    ipv6: [ { address: 'fe80::48e:ceba:32c2:923c', prefixLength: 64 } ],
    ipv4:
     [ { address: '10.129.41.23',
         netmask: '255.255.255.0',
         broadcast: '10.129.41.255' } ],
    active: true },
  { hardwareAddress: '4e:98:56:5b:36:97',
    internal: false,
    name: 'awdl0',
    flags:
     { broadcast: true,
       multicast: true,
       promisc: true,
       running: true,
       simplex: true,
       up: true },
    index: 11,
    mtu: 1484,
    ipv6: [ { address: 'fe80::4c98:56ff:fe5b:3697', prefixLength: 64 } ],
    active: true } ]
```

#### interface

Each interface returned is an object with the following properties:

* `active` (_required_, `Boolean`) - indicates whether or not the interface is connected and actively transmitting data
* `flags` (_optional_, `String`) - a sub-document that provides additional detail regarding the interface and its hardware configuration
  * `addrconf` (_optional_, `Boolean`)
  * `allmulti` (_optional_, `Boolean`)
  * `anycast` (_optional_, `Boolean`)
  * `broadcast` (_optional_, `Boolean`)
  * `cluif` (_optional_, `Boolean`)
  * `cos` (_optional_, `Boolean`)
  * `debug` (_optional_, `Boolean`)
  * `deprecated` (_optional_, `Boolean`)
  * `dhcp` (_optional_, `Boolean`)
  * `duplicate` (_optional_, `Boolean`)
  * `failed` (_optional_, `Boolean`)
  * `fixedmtu` (_optional_, `Boolean`)
  * `grouprt` (_optional_, `Boolean`)
  * `inactive` (_optional_, `Boolean`)
  * `loopback` (_optional_, `Boolean`)
  * `mip` (_optional_, `Boolean`)
  * `multibcast` (_optional_, `Boolean`)
  * `multicast` (_optional_, `Boolean`)
  * `multinet` (_optional_, `Boolean`)
  * `noarp` (_optional_, `Boolean`)
  * `nochecksum` (_optional_, `Boolean`)
  * `nofailover` (_optional_, `Boolean`)
  * `nolocal` (_optional_, `Boolean`)
  * `nonud` (_optional_, `Boolean`)
  * `nortexch` (_optional_, `Boolean`)
  * `notrailers` (_optional_, `Boolean`)
  * `noxmit` (_optional_, `Boolean`)
  * `oactive` (_optional_, `Boolean`)
  * `offline` (_optional_, `Boolean`)
  * `pfcopyall` (_optional_, `Boolean`)
  * `pointopoint` (_optional_, `Boolean`)
  * `preferred` (_optional_, `Boolean`)
  * `private` (_optional_, `Boolean`)
  * `pseg` (_optional_, `Boolean`)
  * `promisc` (_optional_, `Boolean`)
  * `quorumloss` (_optional_, `Boolean`)
  * `router` (_optional_, `Boolean`)
  * `running` (_optional_, `Boolean`)
  * `simplex` (_optional_, `Boolean`)
  * `smart` (_optional_, `Boolean`)
  * `standby` (_optional_, `Boolean`)
  * `temporary` (_optional_, `Boolean`)
  * `unnumbered` (_optional_, `Boolean`)
  * `up` (_optional_, `Boolean`)
  * `virtual` (_optional_, `Boolean`)
  * `varmtu` (_optional_, `Boolean`)
  * `xresolv` (_optional_, `Boolean`)
* `hardwareAddress` (_required_, `String`) - the MAC address assigned to the interface
* `index` (_optional_, `String`) - on `Darwin` OS, this is functionality equivalent to `metric`... it is the prioritized order of the interface to the OS
* `internal` (_required_, `Boolean`) - indicates whether the interface exists for internal use within the OS (i.e. a loopback interface)
* `ipv4` (_optional_, `Array`) - IPv4 address information for the interface
  * `address` (_optional_, `String`)
  * `broadcast` (_optional_, `String`)
  * `netmask` (_optional_, `String`)
* `ipv6` (_optional_, `Array`) - IPv6 address information for the interface
  * `address` (_optional_, `String`)
  * `prefixLength` (_optional_, `Number`)
* `metric` (_optional_, `Number`) - the prioritized order of the interface to the OS
* `mtu` (_optional_, `Number`) - the maximum transmission unit size for the interface
* `name` (_required_, `String`) - the name assigned to the interface
