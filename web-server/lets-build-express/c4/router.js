var Layer = require('./layer');
var Route = require('./route');
var setPrototypeOf = require('setprototypeof');
var parseUrl = require('parseurl')

function getPathname(req) {
    try {
        return parseUrl(req).pathname;
    } catch (err) {
        return void 0;
    }
}

function matchLayer(layer, path) {
    try {
        return layer.match(path);
    } catch (error) {
        return error;
    }
}

var proto = module.exports = function (options) {
    var opts = options || {};

    function router(req, res, next) {
        router.handle(req, res, next);
    }

    setPrototypeOf(router, proto);

    router.params = {};
    router._params = [];
    router.caseSensitive = opts.caseSensitive;
    router.mergeParams = opts.mergeParams;
    router.strict = opts.strict;
    router.stack = [];

    return router;
}

proto.route = function route(path) {
    var route = new Route(path);

    var layer = new Layer(path, {}, route.dispatch.bind(route));

    layer.route = route;

    this.stack.push(layer);

    return route;
}

proto.handle = function handle(req, res, out) {
    var self = this;
    var stack = self.stack;
    var idx = 0;

    function next() {
        var path = getPathname(req);
        var layer, match, route;

        while (match !== true && idx < stack.length) {
            layer = stack[idx++];
            match = matchLayer(layer, path);

            if (match !== true) {
                continue
            }

            route = layer.route;

            if (!route) {
                continue;
            }

            route.stack[0].handle_request(req, res, next);
        }

        if (match) {
            layer.handle_request(req, res, next);
        }
    }

    next();
}

proto.use = function use(fn) {
    var layer = new Layer('/', {} ,fn);
    layer.route = void 0;
    this.stack.push(layer);

    return this;
}