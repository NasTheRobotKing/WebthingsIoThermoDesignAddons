/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerAdapter = void 0;
const gateway_addon_1 = require("gateway-addon");
let debug = () => { };
const crypto = require('crypto');
const manifest = require('../manifest.json');
class Timer extends gateway_addon_1.Device {
    constructor(adapter, timer) {
        super(adapter, `timer-${timer.id}`);
        this.timer = timer;
        this.callbacks = {};
        this.seconds = 0;
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['MultiLevelSensor'];
        this.name = timer.name;
        this.description = manifest.description;
        this.finishedProperty = this.createProperty({
            type: 'boolean',
            title: 'elapsed',
            description: 'Whether the timer has elapsed',
            readOnly: true
        });
        this.runningProperty = this.createProperty({
            type: 'boolean',
            title: 'running',
            description: 'Whether the timer is currently running',
            readOnly: true
        });
        this.secondsProperty = this.createProperty({
            '@type': 'LevelProperty',
            type: 'integer',
            minimum: 0,
            maximum: timer.seconds,
            title: 'seconds',
            description: 'The number of seconds',
            readOnly: true
        });
        this.addCallbackAction('start', 'Start the timer', () => {
            this.start();
        });
        this.addCallbackAction('restart', 'Restart the timer', () => {
            this.restart();
        });
        this.addCallbackAction('reset', 'Reset the timer', () => {
            this.reset();
        });
    }
    createProperty(description) {
        const property = new gateway_addon_1.Property(this, description.title, description);
        this.properties.set(description.title, property);
        return property;
    }
    addCallbackAction(title, description, callback) {
        this.addAction(title, {
            title,
            description
        });
        this.callbacks[title] = callback;
    }
    performAction(action) {
        return __awaiter(this, void 0, void 0, function* () {
            action.start();
            const callback = this.callbacks[action.name];
            if (callback) {
                callback();
            }
            else {
                console.warn(`Unknown action ${action.name}`);
            }
            action.finish();
        });
    }
    setFinished(value) {
        this.finishedProperty.setCachedValueAndNotify(value);
    }
    setRunning(value) {
        this.runningProperty.setCachedValueAndNotify(value);
    }
    setSeconds(value) {
        this.seconds = value;
        this.secondsProperty.setCachedValueAndNotify(value);
    }
    start() {
        if (!this.timerHandle) {
            debug(`Starting timer ${this.timer.name}`);
            this.setRunning(true);
            this.timerHandle = setInterval(() => {
                this.tick();
            }, 1000);
        }
    }
    restart() {
        debug(`Restarting timer ${this.timer.name}`);
        this.reset();
        this.start();
    }
    reset() {
        if (this.timerHandle) {
            debug(`Resetting timer ${this.timer.name}`);
            clearTimeout(this.timerHandle);
            this.timerHandle = undefined;
        }
        this.setRunning(false);
        this.setFinished(false);
        this.setSeconds(0);
    }
    finish() {
        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = undefined;
        }
        this.setRunning(false);
        this.setFinished(true);
    }
    tick() {
        this.setSeconds(this.seconds + 1);
        if (this.seconds == this.timer.seconds) {
            this.finish();
        }
    }
}
class PrecisionTimer extends gateway_addon_1.Device {
    constructor(adapter, timer) {
        super(adapter, `timer-${timer.id}`);
        this.timer = timer;
        this.callbacks = {};
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = [];
        this.name = timer.name;
        this.description = manifest.description;
        this.addCallbackAction('start', 'Start the timer', () => {
            this.start();
        });
    }
    addCallbackAction(title, description, callback) {
        this.addAction(title, {
            title,
            description
        });
        this.events.set('elapsed', {
            name: 'elapsed',
            metadata: {
                description: 'Timer elapsed',
                type: 'string'
            }
        });
        this.callbacks[title] = callback;
    }
    performAction(action) {
        return __awaiter(this, void 0, void 0, function* () {
            action.start();
            const callback = this.callbacks[action.name];
            if (callback) {
                callback();
            }
            else {
                console.warn(`Unknown action ${action.name}`);
            }
            action.finish();
        });
    }
    start() {
        if (!this.timerHandle) {
            debug(`Starting timer ${this.timer.name}`);
            this.timerHandle = setTimeout(() => {
                this.eventNotify(new gateway_addon_1.Event(this, 'elapsed'));
                this.timerHandle = undefined;
            }, this.timer.seconds * 1000);
        }
    }
}
class Interval extends gateway_addon_1.Device {
    constructor(adapter, interval, progressBar) {
        super(adapter, `interval-${interval.id}`);
        this.interval = interval;
        this.seconds = 1;
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this.name = interval.name;
        this.description = manifest.description;
        if (progressBar) {
            this['@type'] = ['MultiLevelSensor'];
            this.secondsProperty = this.createProperty({
                '@type': 'LevelProperty',
                type: 'integer',
                minimum: 0,
                maximum: interval.seconds,
                title: 'seconds',
                description: 'The number of seconds',
                readOnly: true
            });
        }
        this.activeProperty = this.createProperty({
            type: 'boolean',
            title: 'active',
            description: 'Whether the interval is active',
        });
        this.events.set('elapsed', {
            name: 'elapsed',
            metadata: {
                description: 'Interval elapsed',
                type: 'string'
            }
        });
        setInterval(() => {
            this.tick();
        }, 1000);
    }
    createProperty(description) {
        const property = new gateway_addon_1.Property(this, description.title, description);
        this.properties.set(description.title, property);
        return property;
    }
    setSeconds(value) {
        var _a;
        (_a = this.secondsProperty) === null || _a === void 0 ? void 0 : _a.setCachedValueAndNotify(value);
    }
    tick() {
        return __awaiter(this, void 0, void 0, function* () {
            this.seconds++;
            if (this.seconds == this.interval.seconds && (yield this.activeProperty.getValue())) {
                this.eventNotify(new gateway_addon_1.Event(this, 'elapsed'));
            }
            if (this.seconds > this.interval.seconds) {
                this.seconds = 1;
            }
            this.setSeconds(this.seconds);
        });
    }
}
class TimerAdapter extends gateway_addon_1.Adapter {
    constructor(addonManager, manifest) {
        super(addonManager, TimerAdapter.name, manifest.name);
        this.timers = {};
        this.precisionTimers = {};
        this.intervals = {};
        const { logging } = manifest.moziot.config;
        if ((logging === null || logging === void 0 ? void 0 : logging.debug) === true) {
            debug = console.log;
        }
        addonManager.addAdapter(this);
        this.start();
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.load();
            yield this.advertise();
        });
    }
    startPairing(_timeoutSeconds) {
        debug('Start pairing');
        this.advertise();
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            const db = new gateway_addon_1.Database(manifest.id);
            yield db.open();
            const config = yield db.loadConfig();
            if (config.timers) {
                for (const timer of config.timers) {
                    if (!timer.id) {
                        timer.id = `${crypto.randomBytes(16).toString('hex')}`;
                    }
                    timer.seconds = parseInt(`${timer.seconds}`);
                    this.timers[timer.id] = new Timer(this, timer);
                }
            }
            if (config.precisionTimers) {
                for (const precisionTimer of config.precisionTimers) {
                    if (!precisionTimer.id) {
                        precisionTimer.id = `${crypto.randomBytes(16).toString('hex')}`;
                    }
                    this.precisionTimers[precisionTimer.id] = new PrecisionTimer(this, precisionTimer);
                }
            }
            if (config.intervals) {
                for (const interval of config.intervals) {
                    if (!interval.id) {
                        interval.id = `${crypto.randomBytes(16).toString('hex')}`;
                    }
                    interval.seconds = parseInt(`${interval.seconds}`);
                    this.intervals[interval.id] = new Interval(this, interval, config.deactivateProgressBar !== true);
                }
            }
            yield db.saveConfig(config);
        });
    }
    advertise() {
        for (let id in this.timers) {
            const timer = this.timers[id];
            this.handleDeviceAdded(timer);
        }
        for (let id in this.precisionTimers) {
            const precisionTimer = this.precisionTimers[id];
            this.handleDeviceAdded(precisionTimer);
        }
        for (let id in this.intervals) {
            const interval = this.intervals[id];
            this.handleDeviceAdded(interval);
        }
    }
}
exports.TimerAdapter = TimerAdapter;
//# sourceMappingURL=timer-adapter.js.map