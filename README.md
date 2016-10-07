# Work in progress!

[`request`](https://github.com/request/request) wrapper to protect from SSRF and similar attacks. It's like sanitizing user input, but for URIs.

``` js
const SafeHttpClient = require('safe-http-client');

const client = new SafeHttpClient({
  decodedLimit: 100 * 1024 // 100 KiB
});

client.request('http://example.org/terabyte-of-zeroes.gzip', (err, res) => {
  console.log(err)
  // Error: PayloadTooBig
});
```

## List of Options

`SafeHttpClient` constructor accepts a single parameter, `options` object. Following is complete list of things you can specify.

Format is "`name` (`defaultValue`) — description".

### Limits

These are approximate tresholds, and not exact numbers. Exceeding any of those will abort the request and return appropriate error.

- `networkLimit` (`Infinity`) — maximum number bytes to read from sockets;
- `encodedLimit` (`Infinity`) — maximum size of encoded payload, in bytes (e.g. gzipped);
- `decodedLimit` (`Infinity`) — maximum size of decoded payload, in bytes (e.g. un-gzipped).

In addition to the above, [Node's HTTP parser](https://github.com/nodejs/http-parser) has a [hard limit](https://github.com/nodejs/http-parser/search?utf8=%E2%9C%93&q=HPE_HEADER_OVERFLOW) on headers size of 80 KiB, exceeding it will result in `PayloadTooBig` error with `reason.code === 'HPE_HEADER_OVERFLOW'`.

## TODOs, Issues and API Limitations

**Configurability**

- validating URIs is hard-coded in `UrlPolicy` meaning no whitelisting or blacklisting anything.

**DNS**

- this module isn't protecting you from attacker messing with DNS,
  so if any hostname other that `localhost` resolves to `127.0.0.1`,
  request will go through.

**`npm publish`**

- refactor, refactor, refactor…
- finalize API;
- check with `.npmignore` and such stuff;
- …


## Installing

This module currently isn't on npm registry, but you can install from GitHub with

``` bash
npm install github:elmigranto/safe-http-client#master
```

## Testing

Unfortunately, you can't just run `npm test` for now, since requets to `localhost` are an error, with no way to configure this due to API limitations. The workaround is to add something like `127.0.0.1 my-pc` to your `/etc/hosts` and run tests with

``` bash
HOST=my-pc npm test
```
