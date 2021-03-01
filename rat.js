var Evolv = (function (exports) {
    'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var Client = /** @class */ (function () {
        function Client(maxWaitTime) {
            if (maxWaitTime === void 0) { maxWaitTime = 5000; }
            this.maxWaitTime = maxWaitTime;
            this.queue = [];
            this.interval = 50;
            this.activeCandidateEvents = {
                confirmed: {},
                contaminated: {}
            };
            this.contaminations = {};
            this.waitForEvolv(this.configureListeners.bind(this));
        }
        Client.prototype.configureListeners = function () {
            var _this = this;
            window.evolv.client.on('confirmed', function (type) {
                _this.sendMetricsForActiveCandidates(type);
            });
        };
        Client.prototype.sendMetricsForActiveCandidates = function (type) {
            var _a;
            var contextKey = this.getContextKey(type);
            var candidates = this.getEvolv().context.get(contextKey) || [];
            for (var i = 0; i < candidates.length; i++) {
                if (this.activeCandidateEvents[type] && !this.activeCandidateEvents[type][(_a = candidates === null || candidates === void 0 ? void 0 : candidates[i]) === null || _a === void 0 ? void 0 : _a.cid]) {
                    var allocation = this.lookupFromAllocations(candidates[i].cid);
                    this.sendMetrics(type, allocation);
                    this.activeCandidateEvents[type][candidates[i].cid] = true;
                }
            }
        };
        Client.prototype.lookupFromAllocations = function (cid) {
            var allocations = this.getEvolv().context.get('experiments').allocations;
            for (var i = 0; i < allocations.length; i++) {
                var allocation = allocations[i];
                if (allocation.cid === cid) {
                    return allocation;
                }
            }
        };
        Client.prototype.getContextKey = function (type) {
            switch (type) {
                case 'confirmed':
                    return 'confirmations';
                case 'contaminated':
                    return 'contaminations';
                default:
                    return '';
            }
        };
        Client.prototype.getEvolv = function () {
            return window.evolv;
        };
        Client.prototype.waitForEvolv = function (functionWhenReady) {
            var _this = this;
            if (this.getEvolv()) {
                functionWhenReady && functionWhenReady();
                return;
            }
            var begin = Date.now();
            var intervalId = setInterval(function () {
                if ((Date.now() - begin) > _this.maxWaitTime) {
                    clearInterval(intervalId);
                    console.log('Evolv: Analytics integration timed out - couldn\'t find Evolv');
                    return;
                }
                var evolv = _this.getEvolv();
                if (!evolv) {
                    return;
                }
                functionWhenReady && functionWhenReady();
                clearInterval(intervalId);
            }, this.interval);
        };
        Client.prototype.getSid = function () {
            return window.evolv.context.sid;
        };
        Client.prototype.getCidEid = function (event) {
            return event.cid ? event.cid : "";
        };
        Client.prototype.getUid = function (event) {
            return event.uid ? event.uid : "";
        };
        return Client;
    }());

    var RATClient = /** @class */ (function (_super) {
        __extends(RATClient, _super);
        function RATClient(acc, aid, maxWaitTime) {
            if (maxWaitTime === void 0) { maxWaitTime = 5000; }
            var _this = _super.call(this, maxWaitTime) || this;
            _this.acc = acc;
            _this.aid = aid;
            _this.maxWaitTime = maxWaitTime;
            return _this;
        }
        RATClient.prototype.sendMetrics = function (type, event) {
            var uid = this.getUid(event);
            var cidEid = this.getCidEid(event);
            var sid = this.getSid();
            this.sendRATEvent(uid, sid, cidEid);
        };
        RATClient.prototype.sendRATEvent = function (userId, sessionId, cidEid) {
            var RAT_URL = 'https://rat.rakuten.co.jp';
            // CS integration should resplit the eid and cid
            var cidEidArray = cidEid.split(':');
            // Make the whole thing the CID as you might have a third
            // field for cloned candidates
            var cid = cidEidArray.join(':');
            var eid = cidEidArray[1];
            var data = {
                "acc": this.acc,
                "aid": this.aid,
                "etype": "async",
                "cp": {
                    "userid": userId,
                    "experimentid": eid,
                    "candidateid": cid,
                    "sessionId": sessionId
                }
            };
            try {
                fetch(RAT_URL, {
                    method: 'POST',
                    body: 'cpkg_none=' + JSON.stringify(data),
                    headers: {}
                });
            }
            catch (error) {
                console.error('Error:', error);
            }
        };
        return RATClient;
    }(Client));

    exports.RATClient = RATClient;

    return exports;

}({}));

const client = new Evolv.RATClient(9999, 2);
