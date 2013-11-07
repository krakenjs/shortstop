/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
'use strict';



exports.create = function (parent) {

    return {

        _parent: parent,

        _handlers: Object.create(null),

        use: function (protocol, impl) {
            var handlers, handler, index, removed;

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
            removed = false;

            // Unuse
            return function () {
                if (!removed) {
                    removed = true;
                    return handler.stack.splice(index - 1, 1)[0];
                }
                return undefined;
            }
        },

        getStack: function (protocol) {
            var current, parent, hasParent;

            current = this._handlers[protocol] && this._handlers[protocol].stack;
            parent = this._parent && this._parent.getStack(protocol);
            hasParent = parent && parent.length;

            if (current && hasParent) {
                return current.concat(parent);
            }

            if (hasParent) {
                return parent;
            }

            return current;
        },

        resolve: function resolve(src) {
            var dest, handlers;

            dest = src;

            if (typeof src === 'object' && src !== null) {

                dest = (Array.isArray(src) ? [] : Object.create(Object.getPrototypeOf(src)));
                Object.keys(src).forEach(function (key) {
                    dest[key] = this.resolve(src[key]);
                }, this);

            } else if (typeof src === 'string') {

                handlers = this._handlers;
                Object.keys(handlers).forEach(function (protocol) {
                    var handler = handlers[protocol];

                    if (handler.predicate(src)) {
                        // run through stack and mutate
                        dest = src.slice(protocol.length + 1);
                        this.getStack(protocol).forEach(function (handler) {
                            dest = handler(dest);
                        });
                    }
                }, this);

            }

            return dest;
        }

    };
};