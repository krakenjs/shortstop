'use strict';



exports.create = function (parent) {

    return {

        _parent: parent,

        _handlers: Object.create(null),

        use: function (protocol, impl) {
            var handlers, handler, index;

            handlers = this._handlers;
            handler = handlers[protocol];

            if(!handler) {
                handler = handlers[protocol] = {

                    protocol: protocol,

                    regex: new RegExp('^' + protocol + ':'),

                    predicate: function (value) {
                        return this.regex.test(value);
                    },

                    stack: []

                };
            }

            index = handler.stack.push(impl);

            // Unuse
            return function () {
                return handler.stack.splice(index - 1, 1);
            }
        },

        getStack: function (protocol) {
            var handlers, current, parent;

            handlers = this._handlers[protocol];
            current = handlers && handlers.stack;
            parent = this._parent && this._parent.getStack(protocol);

            if (current && parent) {
                return current.concat(parent);
            }

            if (parent) {
                return parent;
            }

            return current;
        },

        resolve: function resolve(obj) {
            var self, handlers;

            self = this;

            if (typeof obj === 'object' && obj !== null) {

                Object.keys(obj).forEach(function (key) {
                    obj[key] = self.resolve(obj[key]);
                });

            } else if (typeof obj === 'string') {

                handlers = this._handlers;
                Object.keys(handlers).forEach(function (protocol) {
                    var handler;

                    handler = handlers[protocol];
                    if (handler.predicate(obj)) {

                        // run through stack and mutate in place
                        obj = obj.slice(protocol.length + 1);
                        handler.stack.forEach(function (handler) {
                            obj = handler(obj);
                        });

                    }
                });

            }

            return obj;
        }

    };
};