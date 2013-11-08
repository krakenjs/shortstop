/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
'use strict';

var fs = require('fs'),
    path = require('path'),
    resolver = require('./lib/resolver');


exports.create = function (parent) {


    return Object.create(resolver.create(parent), {

        resolveFile: {
            value: function (file, callback) {
                var self, ext;

                self = this;
                function done(err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, self.resolve(data));
                }

                // Short circuit file types node can handle natively.
                ext = path.extname(file);
                if (ext === '' || require.extensions.hasOwnProperty(ext)) {
                    process.nextTick(done.bind(undefined, null, require(file)));
                    return;
                }

                fs.readFile(file, 'utf8', function (err, data) {
                    var json, error;

                    if (err) {
                        done(err);
                        return;
                    }

                    try {
                        json = JSON.parse(data);
                        error = null;
                    } catch (err) {
                        json = undefined;
                        error = err;
                    } finally {
                        done(error, json);
                    }

                });
            }
        },

        resolveFileSync: {
            value: function (file) {
                var data, ext;

                ext = path.extname(file);
                if (ext === '' || require.extensions.hasOwnProperty(ext)) {
                    return this.resolve(require(file));
                }

                data = fs.readFileSync(file, 'utf8');
                data = JSON.parse(data);
                return this.resolve(data);
            }
        }

    });

};