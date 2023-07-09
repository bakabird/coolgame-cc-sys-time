import { SysBase } from 'coolgame-cc';
import { FreeList } from 'gnfun';

var Private;
(function (Private) {
    class Timer {
        get interval() {
            return this.intervalMS * 0.001;
        }
        get complete() {
            return this.loopLeft === 0;
        }
        trigger() {
            if (!this.args || this.args.length === 0) {
                this.args = [this.id];
            }
            this.method.apply(this.caller, this.args);
            return this;
        }
    }
    Private.Timer = Timer;
})(Private || (Private = {}));
class TimerModule {
    constructor(_sys) {
        this._sys = _sys;
        this._everTimers = null;
        this._valid = true;
        this._everTimers = [];
    }
    Dispose() {
        var _a;
        (_a = this._everTimers) === null || _a === void 0 ? void 0 : _a.forEach(tid => {
            this._sys.delete(tid);
        });
        this._sys = null;
        this._valid = false;
    }
    delay(delay, func, caller, ...arg) {
        return this._addTimer(delay, 1, func, caller, ...arg);
    }
    nextframe(func, caller, ...arg) {
        return this._addTimer(0, 1, func, caller, ...arg);
    }
    _addTimer(interval, loops, func, caller, ...arg) {
        if (!this._valid) {
            console.warn("module isnot valid cant add timer");
            return;
        }
        const t = this._sys.timer(interval, loops, func, caller, ...arg);
        if (!this._everTimers) {
            this._everTimers = [];
        }
        this._everTimers.push(t);
        return t;
    }
}
/**
 * 定时器服务
 */
class TimeSys extends SysBase {
    constructor() {
        super(...arguments);
        this.sysName = "TimeSys";
    }
    OnInit(complete) {
        this._nextGlobalID = 1;
        this._pool = new Array();
        this._timers = new FreeList();
        complete();
    }
    OnLateInit(complete) {
        complete();
    }
    OnDispose() {
        this._pool = null;
        this._timers = null;
    }
    update(dt) {
        const curTime = Date.now();
        this._timers.foreach_safe((t) => {
            if (t.loopLeft > 0) {
                if (t.latestTriggerTime + t.intervalMS <= curTime) {
                    t.latestTriggerTime = curTime;
                    --t.loopLeft;
                    t.trigger();
                }
            }
            else {
                this._gabage(t);
                this._timers.remove(t);
            }
            return true;
        });
    }
    /**
     * 当前时间，秒
     */
    static get seconds() {
        return Date.now() * 0.001;
    }
    /**
     * 注册并开始一个定时器
     * @param interval 间隔时间，单位秒
     * @param loops 循环次数，小于0表示无限循环
     * @param caller 回调者（用于this, 可以为null）
     * @param func 回调函数
     * @param args 回调参数，选填
     */
    timer(interval, loops, func, caller, ...args) {
        return this._timer(interval, loops, func, caller, args);
    }
    /**
     * 延迟一定时间调用（一次）
     * @param interval 延迟多久执行，单位秒
     * @param func
     * @param caller
     * @param args
     */
    delay(interval, func, caller, ...args) {
        return this._timer(interval, 1, func, caller, args);
    }
    /**
     * 注册一个帧回调计时器
     * @param loops 回调次数，小于0表示无限循环
     * @param caller
     * @param func
     * @param args
     */
    frame(loops, func, caller, ...args) {
        return this._timer(0, loops, func, caller, args);
    }
    /**
     * 注册一个延迟一帧执行的计时器
     * @param caller
     * @param func
     * @param args
     */
    nextFrame(func, caller, ...args) {
        return this._timer(0, 1, func, caller, args);
    }
    /**
     * 删除给定计时器
     * @param timerID 计时器id
     * @return undefined，方便链式表达
     */
    delete(timerID) {
        if ((timerID !== null && timerID !== void 0 ? timerID : false) && timerID > 0) {
            let t = this._timers.removeFirstIf((t) => {
                return t.id === timerID;
            });
            if (t) {
                this._gabage(t);
            }
        }
        return undefined;
    }
    isTimerComplete(timerID) {
        let t = this._getTimer(timerID);
        return t ? t.complete : true;
    }
    getTimerInterval(timerID) {
        let t = this._getTimer(timerID);
        return t ? t.interval : -1;
    }
    getTimerCallback(timerID) {
        let t = this._getTimer(timerID);
        return t ? t.method : undefined;
    }
    getTimerThisObj(timerID) {
        let t = this._getTimer(timerID);
        return t ? t.caller : undefined;
    }
    getTimerNextTriggerTime(timerID) {
        let t = this._getTimer(timerID);
        return t ? t.latestTriggerTime + t.interval : 0;
    }
    getTimerArgs(timerID) {
        let t = this._getTimer(timerID);
        return t ? t.args : undefined;
    }
    triggerTimer(timerID) {
        let t = this._getTimer(timerID);
        if (t) {
            t.trigger();
        }
        return timerID;
    }
    generateModule() {
        return new TimerModule(this);
    }
    _getTimer(timerID) {
        if ((timerID !== null && timerID !== void 0 ? timerID : true) || timerID <= 0) {
            return undefined;
        }
        return this._timers.findFirstIf((t) => {
            return t.id === timerID;
        });
    }
    _timer(interval, loops, func, caller, args) {
        let t = this._pool.length > 0 ? this._pool.pop() : new Private.Timer();
        t.id = this._nextGlobalID++;
        t.intervalMS = interval * 1000;
        t.loopLeft = loops < 0 ? Number.MAX_VALUE : loops === 0 ? 1 : loops;
        t.latestTriggerTime = Date.now();
        if (args) {
            args.push(t.id);
        }
        t.method = func;
        t.caller = caller;
        t.args = args;
        this._timers.push(t);
        return t.id;
    }
    _gabage(t) {
        t.method = undefined;
        t.caller = undefined;
        t.args = undefined;
        this._pool.push(t);
    }
    get timerCount() { return this._timers.length; }
}

export { TimerModule, TimeSys as default };
