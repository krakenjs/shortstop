/*───────────────────────────────────────────────────────────────────────────*\
│  Copyright (C) 2025 PayPal                                                  │
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

var fs = require('fs');
var path = require('path');
var resolver = require('./lib/resolver');


function isModule(file) {
    // require.resolve will locate a file without a known extension (e.g. txt)
    // and try to load it as javascript. That won't work for this case.
    var ext = path.extname(file);
    return ext === '' || Object.prototype.hasOwnProperty.call(require.extensions, ext);
}


exports.create = function create(parent) {

    return Object.create(resolver.create(parent), {

        resolveFile: {
            value: function resolveFile(file, callback) {
                var resolve = this.resolve.bind(this);

                if (isModule(file)) {
                    resolve(require(file), file, callback);
                    return;
                }

                fs.readFile(file, 'utf8', function (err, data) {
                    if (err) {
                        callback(new Error(`Error occured while reading file ${file}`, {
                            cause: err
                        }));
                        return;
                    }

                    try {
                        data = JSON.parse(data);
                        resolve(data, file, callback);
                    } catch (err) {
                        callback(new Error(`Error occured while parsing JSON data for file ${file}`, {
                            cause: err
                        }));
                    }
                });
            }
        }

    });

};
