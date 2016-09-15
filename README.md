# Work in progress!

[`request`](https://github.com/request/request) wrapper to protect from SSRF and similar attacks. It's like sanitizing user input, but for URIs.

``` js
const SafeHttpClient = require('safe-http-client');

const client = new SafeHttpClient({
  payloadLimit: 100 * 1024 // 100 KiB
});

client.request('http://example.org/terabyte-of-zeroes.gzip', (err, res) => {
  console.log(err)
  // Error: PayloadTooBig
});
```

**TODOs**

 - Implement URL checkers (possibly with APIs for easier consturction of white/blacklists);
  - `request` itself won't follow redirects like `file:///etc/passwd`, but HTTP 302 to `localhost` is fair game;
 - DNS spoofing (what if hostname resolves to `127.0.0.1`);
 - …
 - `npm publish`, better readme:
  - check with `.npmignore` and such stuff;
  - …
