/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2014 eBay Software Foundation                                │
│                                                                             │
│hh ,'""`.                                                                    │
│  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
│  |(@)(@)|  you may not use this file except in compliance with the License. │
│  )  __  (  You may obtain a copy of the License at                          │
│ /,'))((`.\                                                                  │
│(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
│ `\ `)(' /'                                                                  │
│                                                                             │
│   Unless required by applicable law or agreed to in writing, software       │
│   distributed under the License is distributed on an "AS IS" BASIS,         │
│   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
│   See the License for the specific language governing permissions and       │
│   limitations under the License.                                            │
\*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var async = require('async');
var thing = require('core-util-is');


exports.create = function create(parent) {

    return {

        parent: parent,


        _handlers: Object.create(null),


        /**
         * Locates a handler for the provided value, searching the parent, if necessary
         * @param value the value to match
         * @returns {Object} the handler, if found, otherwise undefined.
         */
        getHandler: function getHandler(value) {
            var resolver, handler;

            resolver = this;
            handler = undefined;

            while (!handler && resolver && resolver._handlers) {

                Object.keys(resolver._handlers).some(function (protocol) {
                    var current = resolver._handlers[protocol];

                    // Test the value to see if this is the appropriate handler.
                    if (current.predicate(value)) {
                        handler = current;
                        return true;
                    }

                    return false;
                });

                // Move to the parent
                resolver = resolver.parent;
            }

            return handler;
        },


        /**
         * Returns the handler stack for a given protocol, including parent handlers
         * @param protocol
         * @returns []
         */
        getStack: function getStack(protocol) {
            var currentStack, parentStack, hasParent;

            currentStack = this._handlers[protocol] && this._handlers[protocol].stack;
            parentStack = this.parent && this.parent.getStack(protocol);
            hasParent = parentStack && parentStack.length;

            if (currentStack && hasParent) {
                return currentStack.concat(parentStack);
            }

            if (hasParent) {
                return parentStack;
            }

            return currentStack;
        },


        /**
         * Register a given handler for the provided protocol.
         * @param protocol the protocol for which the handler should be registered.
         * @param impl the handler function with the signature `function (input, [fn])`
         * @returns {Function} invoke to remove the registered handler from the stack
         */
        use: function use(protocol, impl) {
            var handlers, handler, removed;

            handlers = this._handlers;
            handler = handlers[protocol];

            if (!handler) {
                handler = handlers[protocol] = {

                    protocol: protocol,

                    regex: new RegExp('^' + protocol + ':'),

                    predicate: function (value) {
                        return this.regex.test(value);
                    },

                    stack: []

                };
            }

            handler.stack.push(impl);
            removed = false;

            return function unuse() {
                var idx;
                if (!removed) {
                    removed = true;
                    idx = handler.stack.indexOf(impl);
                    return handler.stack.splice(idx, 1)[0];
                }
                return undefined;
            };
        },


        /**
         * Resolves all the protocols contained in the provided object.
         * @param data The data structure to scan
         * @param callback the callback to invoke when processing is complete with the signature `function (err, data)`
         */
        resolve: function resolve(data, filename, callback) {
            var self, tasks, handler;

            if (!callback) {
                callback = filename;
                filename = null;
            }

            self = this;

            if (thing.isArray(data) || (thing.isObject(data) && Object.getPrototypeOf(data) === Object.prototype)) {

                if (thing.isArray(data)) {

                    tasks = data.map(function (val) {
                        return resolve.bind(self, val, filename);
                    });

                } else {
                    tasks = {};
                    Object.keys(data).forEach(function (key) {
                        tasks[key] = resolve.bind(self, data[key], filename);
                    });
                }

                async.parallel(tasks, function (err, data) {
                    err ? callback(err) : callback(null, data);
                });

            } else if (thing.isString(data)) {

                tasks = [];

                handler = this.getHandler(data);
                if (!handler) {
                    setImmediate(callback.bind(null, null, data));
                    return;
                }

                // Remove protocol prefix
                data = data.slice(handler.protocol.length + 1);

                tasks = self.getStack(handler.protocol).map(function (handler) {
                    if (handler.length < 2) {
                        // If the handler is single argument, expect its return value to be useful,
                        // so we wrap it up in continuation-passing style
                        return function wrapper(input, done) {
                            var data, error;

                            try {
                                data = handler(input);
                            } catch (err) {
                                error = err;
                            }

                            done(error, data);
                        };
                    }

                    return handler;
                });

                tasks.unshift(tasks[0].length == 2 ? function init(done) {
                    done(null, data);
                } : function init(done) {
                    done(null, data, filename);
                });

                // Waterfall will *always* resolve asynchronously
                async.waterfall(tasks, callback);

            } else {

                // Non-protocol-able value
                callback(null, data);

            }

        }

    };

};
