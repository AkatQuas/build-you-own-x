# Overview

> It goes without saying that all of the code in this article has no business in any production app. It is only provided for educational value.

Too simple.

An `curl` example:

```bash
~ curl -v -X POST -d 'a=12' http://localhost:3000/
Note: Unnecessary use of -X or --request, POST is already inferred.
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 3000 (#0)
> POST / HTTP/1.1\r\n
> Host: localhost:3000\r\n
> User-Agent: curl/7.54.0\r\n
> Accept: */*\r\n
> Content-Length: 4\r\n
> Content-Type: application/x-www-form-urlencoded\r\n
> \r\n\r\n
> 'a=12'
>
* upload completely sent off: 4 out of 4 bytes
< HTTP/1.1 200 OK\r\n
< server: my-custom-server\r\n
< content-type: 12\r\n
< date: Wed, 12 Sep 2018 16:08:16 GMT\r\n
< \r\n\r\n
<
* no chunk, no close, no size. Assume close to signal end
<
* Closing connection 0
Hello world!%

```

`HTTP message` consists of the `request line`, `header line` and `body entity`, where the delimiter is `\r\n` (whilst the `header line` ends with `\r\n\r\n`, so we can tell the rest is the `body entity`).

We parse the `http message` with the help of `socket`, which read the incoming request as a `Duplex Stream` (both readable and writable), and encapsulate the writing and reading manipulation as two object `request` and `response`, then pass them to the handler `(req, res) => { /*handler function*/ }`.

That is it.

# References

[original tutorial](https://www.codementor.io/ziad-saab/let-s-code-a-web-server-from-scratch-with-nodejs-streams-h4uc9utji)