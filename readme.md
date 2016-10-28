# simple-ifconfig

## Requirements

* Node.js >= `v4.x`

## Installation

_PENDING NPM PUBLISH_

```bash
npm install simple-ifconfig
```

## Usage

### Constructor

```javascript
import NetworkInfo from 'simple-ifconfig';

let network = new NetworkInfo({
  ifconfigPath : '/sbin/ifconfig',
  includeLoopback : false
});
```

### #listInterfaces

```javascript
import NetworkInfo from 'simple-ifconfig';

let network = new NetworkInfo();

network.listInterfaces()
  .then(console.log)
  .catch(console.error);
```
