# 我如何在不看别人怎么实现promise的情况下,自己实现一个promise

> 为什么要写? 
>
> ​	年前和年后面试了几家公司, 虽然都挂了… 但是都谈到了一个面试题,就是promise. 虽然使用promise很简单,而且我回答的都没问题.
>
> ​	但是面试官都问到了一个题目. "如果让你实现一个promise.all方法, 怎么实现 ? " 临时想了一个每个promise.then里用计数器+1, 在判断计数器是否等于参数Array[promise]的 length 来判断promise是否都完成的实现思路, 也不知道算不算是对的.
>
> ​	然后就回来想自己能不能在不看任何人的代码的情况下, 实现一个promise



## 第一步: 先稍微分析一下原生的Promise

### Promise 使用方式

 var a = new Promise(function( resolve, reject ){})

new一个Promise实例，传入一个函数，里面有两个参数。

`resolve`：成功时调用，并将成功后的数据传进`then`方法里。

`reject`：失败的时候调用，并将失败的数据传进`catch`方法里。



### Promise的原型方法

![Promise原型](http://7xs4ej.com1.z0.glb.clouddn.com/WX20180406-164147@2x.png)

很简单，只有我们常见的`then` `catch`还有`finally`方法。不过`finally`方法应该不属于ES6标准的，所以先忽略。（上网查了一下好像是ES2018标准）



##第二步：开写

### 2.1：构造函数

什么都不想，先写一个构造函数，就叫 Future 把。

因为Promise有两种状态，所以我给他加一个 `status`。

```javascript
function Future(func){
  this.status = null;
}
```



### 2.2：增加resolve和reject

​	接着需要执行传入的函数，并传给他一个`resolve`和`reject`方法。经常用Promise的同学应该知道 `Promise.resolve` 和 `Promise.reject`。

​	但是没在原型里找到这两个方法，所以我就直接在`Future`上加这两个方法。

```javascript
// 只要执行了resolve或者reject肯定要改变status, 所以对实例的status做更新
Future.resolve = function (data) {
  this.status = 'resolve'
  this.data = data
}

Future.reject = function (data) {
  this.status = 'reject'
  this.data = data
}
```



这两个这里的data要在then里用，所以还是得缓存起来，然后将这两个方法传进`func`里，这里对构造函数再做改动

```javascript
function Future(func){
  this.status = null;
  this.data = null;
  
  func(Future.resolve, Future.resolve)
}
```



​	但是这里有一个问题，resolve执行的时候，this并不是指向当前的promise实例的，这时我就想到了`bind`方法。所以必须在初始化的时候把resolve和reject的作用域给绑定好。对构造函数再次做修改。( 还要加上setTimeout , 加入even loop，这个是后加的)

```javascript
function Future(func){
  if(typeOf func !== "function") throw new Errow("Future 的参数必须为函数");
  
  var _this = this;
  this.status = null;
  this.data = null;
  setTimeout(function () {
    func(Future.resolve.bind(_this), Future.resolve.bind(_this))
  })
}
```



### 2.3：实现then和catch

> 回顾一下then的使用方式：传入一个函数，在promise执行resolve后，才会调用，并且函数的参数就是调用resolve的时候传入的值。并且可以return一个值。给下一个then继续调用。

​	所以then函数应该很简单，直接缓存这个函数，resolve的时候再拿出来调用即可。而关于链式调用，一开始想到的就是`return this`

​	所以一开始我先是这么写的

```javascript
function Future(func){
  	//再加一个函数队列数组和一个错误状态的执行函数
  	this.queue = [];
  	this.failCb = null;
 	...其余代码省略
}
```



```javascript
Future.prototype.then = function (callback) {
  	if(typeof callback !== "function") throw new Errow("then必须传入函数");
  
    if(this.status === 'resolve'){
        this.data = callback(this.data);
    }else if(this.status === null){
        this.queue.push(callback);
   }

   return this;
}

Future.prototype.catch = function (callback) {
  	if(typeof callback !== "function") throw new Errow("catch必须传入函数");
  
    if (this.status === 'reject') {
        this.data = callback(this.data);
    }else if(this.status === null){
        this.failCb = callback;
    }
  
    return this;
}
```



### 2.4：实现resolve和reject

​	其他的都好了，接着就是在resolve里去执行队列里的函数。reject里执行错误函数。

```javascript
Future.resolve = function (data) {
    var context = this;
    context.status = 'resolve';
    context.data = data;
  
  	//先把第一个函数拿出来
    var func = context.queue.shift();
    if(func){
        try{
            var d = func(data);
          	//函数可以返回一个值，也可以返回一个promise
            if(d instanceof Future){
                d = d.data;
            }
          	//递归的方式再执行下一个，这里再用call去改变this的指向
            Future.resolve.call(context, d);
        }catch(err){
          	//捕捉报错，执行catch
            Future.reject.call(context, err);
        }
    }
}

Future.reject = function (data) {
    this.status = 'reject';
    this.data = data;
    if(this.failCb){
        this.failCb(data)
    }else{
        throw new Error("promise catch")
    }
}
```

以上。

​	到这里呢，就是那时临时想临时做的第一版。



## 后记

​	当然，后面又大改了一些东西。最主要的是then函数不应该返回this。应该是一个新的promise。如果按照现在这么做，经过多个then之后，初始的data就变成了最后一个值了。我们希望的是要保留最初初始化的时候的那个值。

```javascript
//比如
var a = new Future(function(resolve, reject){
    setTimeout(function(){
        console.log('success')
        resolve(true)
    }, 1000)
})

a.then(function(res){
    console.log(res);
    return "啦拉拉"
})

setTimeout(function(){
    a.then(function(res){
      	//这里就会输出 "啦拉拉"。其实期望的是输出 true
        console.log("settimeout: ", res)
    })
},2000)
```

​	后来为了解决这个，突然陷入了牛角尖。。。花了一天才做完。水平有限，只能做到这样了，最后附上完整代码吧。

[最后的版本](https://github.com/qianzhaoy/do-promise)



## 总结

​	后来去看了看别人实现的方法。大体思路应该也是差不多的。