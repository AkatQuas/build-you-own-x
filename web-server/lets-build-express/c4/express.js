var proto = require('./app');
var mixin = require('merge-descriptors');
var http = require('http');

exports = module.exports = createApplication;

function createApplication() {
    var app = function (req, res, next) {
        app.handle(req, res, next);
    }

    mixin(app, proto, false);

    var req = Object.create(http.IncomingMessage.prototype);
    var res = Object.create(http.ServerResponse.prototype);

    res.send = function (body) {
        if (typeof body === 'object') {
            this.json(body);
        } else if (typeof body === 'string') {
            this.setHeader('Content-Type', 'text/plain');
            this.end(body, 'utf8');
        }
        return this;
    }
    res.json = function (body) {
        this.setHeader('Content-Type', 'application/json');
        return this.end(JSON.stringify(body));
    }

    app.response = Object.create(res, {
        app: {
            configurable: true, enumerable: true, writable: true, value: app
        }
    })

    app.init();

    return app;
}