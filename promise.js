(function (window) {

    function promise(func) {
        this.status = "pending";
        this.data = null;
        this.queue = [];
        this.failCb = null;
        setTimeout(function(){
            func && func.call(this, promise.resolve.bind(this), promise.reject.bind(this))
        }, 0);
        return this;
    }

    promise.resolve = function (data) {
        var context = this;
        context.status = 'resolve';
        context.data = data;
        var func = context.queue.shift();
        if(func){
            try{
                var d = func(data);
                if(d instanceof promise){
                    d = d.data;
                }
                promise.resolve.call(context, d);
            }catch(err){
                promise.reject.call(context, err);
            }
        }
    }

    promise.reject = function (data) {
        this.status = 'reject';
        this.data = data;
        if(this.failCb){
            this.failCb(data)
        }else{
            throw new Error("promise catch")
        }
    }

    promise.prototype.then = function (callback) {
        var pass = typeof callback === "function";
        if(this.status === 'success'){
            this.data = pass ? callback(this.data) : void 0;
        }else if(this.status === null){
            pass && this.queue.push(callback);
        }
        
        return this;
    }

    promise.prototype.catch = function (callback) {
        if (this.status === 'fail') {
            this.data = callback && callback(this.data);
        }else if(this.status === null){
            this.failCb = callback
        }
        return this;
    }


    window.promise = promise;

}(window, undefined))