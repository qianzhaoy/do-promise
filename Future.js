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
        setTimeout(function(){
            func && func.call(this, Future.resolve.bind(_this), Future.reject.bind(_this))
        }, 0);
        return this;
    }

    Future.resolve = function (data) {
        var context = this;
        context.status = RESOLVE;
        context.data = data;
        var func = context.queue.shift();
        if(func){
            try{
                var d = func(data);
                if(d instanceof Future){
                    d = d.data;
                }
                Future.resolve.call(context, d);
            }catch(err){
                Future.reject.call(context, err);
            }
        }
    }

    Future.reject = function (data) {
        this.status = REJECT;
        this.data = data;
        if(this.failCb){
            this.failCb(data)
        }else{
            throw new Error("Future catch")
        }
    }

    Future.prototype.then = function (callback) {
        var pass = typeof callback === "function";
        if(this.status === RESOLVE){
            this.data = pass ? callback(this.data) : void 0;
        }else if(this.status === PENDING){
            pass && this.queue.push(callback);
        }
        
        return this;
    }

    Future.prototype.catch = function (callback) {
        if (this.status === REJECT) {
            this.data = callback && callback(this.data);
        }else if(this.status === PENDING){
            this.failCb = callback
        }
        return this;
    }


    window.Future = Future;

}(window, undefined))