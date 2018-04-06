(function (window) {

    var RESOLVE = "resolve";
    var REJECT = "reject";
    var PENDING = "pending";

    function Future(func) {
        var _this = this;
        this.status = PENDING;
        this.data = null;
        this.queue = [];
        this.failCb = null;
        setTimeout(function () {
            func && func.call(this, Future.resolve.bind(_this), Future.reject.bind(_this))
        }, 0);
    }

    Future.resolve = function (data) {
        this.status = RESOLVE;
        this.data = data;
        
        for (let i = 0; i < this.queue.length; i++) {
            var obj = this.queue[i];
            try {
                var d = obj.cb(data);
                if (d instanceof Future) {
                    d = d.data;
                }
                Future.resolve.call(obj.future, d);
            } catch (err) {
                Future.reject.call(obj.future, err);
            }
        }
    }

    Future.reject = function (data) {
        this.status = REJECT;
        this.data = data;
        if (this.failCb) {
            this.failCb(data)
        } else {
            throw new Error("Future need catch")
        }
    }

    Future.prototype.then = function (callback) {
        if (typeof callback !== "function") throw new Error("then函数的参数必须为函数");
        
        var thatFuture = new Future(function(){})
        
        switch (this.status) {
            case RESOLVE:
                try{
                    var d = callback(this.data);
                    Future.resolve.call(thatFuture, d);
                }catch(err){
                    Future.reject.call(thatFuture, err)
                }
                break;
                    
            case PENDING:
                this.queue.push({
                    future: thatFuture,
                    cb: callback
                });
                
                break;

            default:
                Future.reject.call(thatFuture, this.data)
                break;
        }
        // if (this.status === RESOLVE) {
        //     this.data = callback(this.data);
        // } else if (this.status === PENDING) {
        //     this.queue.push(callback);
        // }

        return thatFuture;
    }

    Future.prototype.catch = function (callback) {
        if (this.status === REJECT) {
            this.data = callback && callback(this.data);
        } else if (this.status === PENDING) {
            this.failCb = callback
        }
        return this;
    }


    window.Future = Future;

}(window, undefined))