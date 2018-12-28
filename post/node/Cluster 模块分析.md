# Cluster 模块分析

## 预备工作

分析的是从 node 源码的角度进行的，所以需要先配置源码的调试环境。

需要准备的内容为:

1. node 源码
2. [CLion](https://www.jetbrains.com/clion/)

node 源码的获取，通过以下命令行: 

```bash
git clone https://github.com/nodejs/node.git
# 本文针对的版本
git checkout tags/v11.6.0
```

获取了 node 源码之后，需要在 CLion 中导入项目，详细可以参考此文 [使用 cLion 调试 node.js 源码](http://hiihl.com/articles/2018/1/15/learnnode1.md)。

上文中提到的源码编译指令为:

```bash
make -C out BUILDTYPE=Debug -j 4
```

`-j 4` 的意义是同时执行的任务数，一般设定为 CPU 核数，可以通过下面指令获得 CPU 核数:

```bash
[ $(uname) = 'Darwin' ] && sysctl -n hw.logicalcpu_max || lscpu -p | egrep -v '^#' | wc -l
```

如果希望加快 node 源码的编译速度的话，可以先尝试获取核数，然后调整 `-j` 的值。

node 中的 js 实现都在 lib 目录下，需要注意的是，当 node 编译完成之后，这些 js 文件是都会被打包到编译结果中的。当 node 在运行中要引入 lib 下的 js 文件时，并不会从我们的源码目录中读取了，而是采用的编译时打包进去的 js 内容。所以在修改了 lib 目录下的 js 文件后，需要重新对 node 进行编译。

## 发现问题

为了测试 Cluster 的运行，需要准备一小段测试代码，保存到 `./test-cluster.js`:

> 如果没有特别说明，接下来文件路径中的 `.` 都表示的是 node 源码目录

```js
const cluster = require('cluster');
const http = require('http');
// 下面的代码会依据 numCPUs 的值来创建对应数量的子进程，
// 由于目前硬件核数都会比较多，为了使调试时的输出内容尽可能的清晰，所以设定为 2
// const numCPUs = require('os').cpus().length;
const numCPUs = 2;

if (cluster.isMaster) {
    // 如果是 master 进程:
    // 1. 打印进程号
    // 2. 根据 numCPUs 的值来创建对应数量的子进程
    console.log("master pid: " + process.pid);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    // 如果是子进程:
    // 1. 打印进程号
    // 2. 创建 http server 实例
    // 3. 并调用上一步创建的实例的 listen 方法
    console.log("isMaster: " + cluster.isMaster + " pid: " + process.pid);

    const srv = http.createServer(function (req, res) {
        res.writeHead(200);
        res.end("hello world\n" + process.pid);
    });

    srv.listen(8000);
}
```

接下来需要使用在 [预备工作](#预备工作) 中编译好的 node 来运行上述代码:

```bash
./out/Debug/node test-cluster.js
```

会得到如下的输出:

```
master pid: 30094
isMaster: false pid: 30095
isMaster: false pid: 30096
```

通过对比输出内容，代码执行的过程类似:

1. master 开始运行，即条件分支中的 `cluster.isMaster` 分支被执行，创建了 2 个子进程
2. 在 2 个子进程中 `else` 分支被执行

这里有几个值得思考的问题:

1. cluster 模块是如何区别 master 和 work 进程的；换言之，work 进程是如何被创建的
2. 多个 work 进程中，都执行了 `listen` 方法，为什么没有报错 `ERR_SERVER_ALREADY_LISTEN`
3. 为什么 master 进程在完成了创建进程的任务后没有退出
4. 请求是如何传递到 work 进程中并被处理的

对于问题3，准备下面两个文件

`./test-fork-exit.js`:

```js
const numCPUs = 2;
const {fork} = require('child_process');

console.log("master pid: " + process.pid);

for (let i = 0; i < numCPUs; i++) {
    fork("./test-fork-sub.js")
}
```

`./test-fork-sub.js`:

```js
console.log("sub: " + process.pid);
```

运行 `./out/Debug/node test-fork-exit.js` 后，会发现 master 进程在创建了两个进程后退出了。

接下来将对上述几个问题进行分析。

## 问题1. work 进程的创建

在运行了 `./out/Debug/node test-cluster.js` 命令之后，master 进程即被启动，在该进程中，运行 `test-cluster.js` 中的代码。

首先执行的就是 `const cluster = require('cluster');`。打开 cluster 模块的源码 `./lib/child_process.js`:

```js
const childOrMaster = 'NODE_UNIQUE_ID' in process.env ? 'child' : 'master';
module.exports = require(`internal/cluster/${childOrMaster}`);
```

可以看到，代码会根据 `childOrMaster` 的值来决定引入的是 `internal/cluster/child` 还是 `internal/cluster/master` 模块。而 `childOrMaster` 的值取决于环境变量中是否设定了 `NODE_UNIQUE_ID`，如果设定了，那么加载对应的 `child` 模块，否则加载对应的 `master` 模块。

显然，默认环境变量中是没有对 `NODE_UNIQUE_ID` 标识进行设定的，于是引入的就是 `./internal/cluster/master.js`

注意下面的代码片段:

```js
cluster.isMaster = true;
```

于是，在接下来的条件判断 `cluster.isMaster` 为 `true`，进而会执行子进程的创建，也就是调用 master 模块中的 `fork` 方法。

注意 fork 方法中的片段:

```js
cluster.setupMaster();
const id = ++ids;
const workerProcess = createWorkerProcess(id, env);
```

只需要注意自增的 id，接下来看下 `createWorkerProcess` 的代码片段:

```js
workerEnv.NODE_UNIQUE_ID = '' + id;

return fork(cluster.settings.exec, cluster.settings.args, {
  cwd: cluster.settings.cwd,
  env: workerEnv,
  silent: cluster.settings.silent,
  windowsHide: cluster.settings.windowsHide,
  execArgv: execArgv,
  stdio: cluster.settings.stdio,
  gid: cluster.settings.gid,
  uid: cluster.settings.uid
});
```

于是发现其实是调用的 `child_process` 模块中的 `fork` 方法，并设置了环境变量 `NODE_UNIQUE_ID`，上文提到 `cluster` 模块被引入的时候，会根据环境变量是否存在 `NODE_UNIQUE_ID` 标识而决定引入 `child` 还是 `master`。

另外，[child_process.fork](https://nodejs.org/api/child_process.html#child_process_child_process_fork_modulepath_args_options) 方法第一个参数为 `modulePath`，也就是需要在子进程中执行的 js 文件路径，对应上述代码中 `cluster.settings.exec` 的值，对该变量的设定代码在 `setupMaster` 方法中:

```js
var settings = {
  args: process.argv.slice(2),
  exec: process.argv[1],
  execArgv: process.execArgv,
  silent: false
};
```

`process.argv[1]` 为当前进程的入口文件，对于这个例子中的主进程而言，即为: `./test-cluster.js`（实际值为对应的绝对路径）

于是 cluster 模块作用下的 master 进程中的 fork 方法执行的内容可以简单部分归纳为:

1. 设置环境变量 `NODE_UNIQUE_ID`
2. 执行 `child_process.fork`，参数 `modulePath` 为主进程入口文件

接下来就是子进程中执行的过程。

子进程进来执行的还是与主进程相同的文件，之所以执行了 `cluster.isMaster` 为 `false` 的分支，是因为 `./internal/cluster/child.js` 的代码片段:

```js
cluster.isMaster = false;
```

## 问题2. listen 方法

子进程中都执行了 `listen` 方法，但是却没有报错，于是尝试分析 `listen` 的执行细节。

`http` 模块中的 `Server` 是继承于 `net.Server`，见 `./lib/_http_server.js` 中:

```js
function Server(options, requestListener) {
 // ...
 net.Server.call(this, { allowHalfOpen: true });
 // ...
}
```

而 listen 方法存在于 `net.Server` 上。查看 `net.Server.listen` 中主要的动作都是对参数的 normalization，然后调用 `net.Server::listenInCluster` 方法:


```js
if (cluster.isMaster || exclusive) {
  // Will create a new handle
  // _listen2 sets up the listened handle, it is still named like this
  // to avoid breaking code that wraps this method
  server._listen2(address, port, addressType, backlog, fd, flags);
  return;
}

cluster._getServer(server, serverQuery, listenOnMasterHandle);
```

这里需要注意的是，listen 方法都是在子进程中执行的，所以 `cluster.isMaster` 为 `false`，而 `exclusive` 是未设定的，故也为 `false`。于是，子进程中的 listen 实际执行的是 `cluster._getServer` 方法，并且这里的 `cluster` 模块实际是引入的 `./lib/internal/cluster/child.js`，于是查看该文件中的 `_getServer` 方法片段:

```js
const message = util._extend({
  act: 'queryServer',
  index,
  data: null
}, options);

send(message, (reply, handle) => {
  if (typeof obj._setServerData === 'function')
    obj._setServerData(reply.data);

  if (handle)
    shared(reply, handle, indexesKey, cb);  // Shared listen socket.
  else
    rr(reply, indexesKey, cb);              // Round-robin.
});
```

`send` 方法最终会调用 `./lib/internal/cluster/utils.js` 中的 `sendHelper` 方法，而该方法会向父进程发送 `{ cmd: 'NODE_CLUSTER' }` 消息，根据文档的 [描述](https://nodejs.org/api/child_process.html#child_process_subprocess_send_message_sendhandle_options_callback)，`NODE_` 起头的 `cmd` 为 内部消息(`internalMessage`)，需要通过 `.on('internalMessage', lister)` 来监听它。

由于这个消息是从子进程发往父进程的、即主进程的，于是在 `./lib/internal/cluster/master.js` 中找到了相关的监听代码片段:

```js
worker.process.on('internalMessage', internal(worker, onmessage));
```

接着通过 `onmessage` 方法定位到 `queryServer` 方法中的代码片段:

```js
const key = `${message.address}:${message.port}:${message.addressType}:` +
            `${message.fd}:${message.index}`;
var handle = handles.get(key);

if (handle === undefined) {
  let address = message.address;

  // Find shortest path for unix sockets because of the ~100 byte limit
  if (message.port < 0 && typeof address === 'string' &&
      process.platform !== 'win32') {

    address = path.relative(process.cwd(), address);

    if (message.address.length < address.length)
      address = message.address;
  }

  var constructor = RoundRobinHandle;
  // UDP is exempt from round-robin connection balancing for what should
  // be obvious reasons: it's connectionless. There is nothing to send to
  // the workers except raw datagrams and that's pointless.
  if (schedulingPolicy !== SCHED_RR ||
      message.addressType === 'udp4' ||
      message.addressType === 'udp6') {
    constructor = SharedHandle;
  }

  handle = new constructor(key,
                           address,
                           message.port,
                           message.addressType,
                           message.fd,
                           message.flags);
  handles.set(key, handle);
}
```

当这段代码首次被运行时，会创建一个 handle，并将其和 key 关联起来。对于 TCP 链路，在没有特别指定 `schedulingPolicy` 的情况下，handle 均为 `RoundRobinHandle` 的实例。而查看 `./lib/internal/cluster/round_robin_handle.js` 文件中的 `RoundRobinHandle` 构造函数细节，则发现具体的 listen 绑定动作:

```js
if (fd >= 0)
  this.server.listen({ fd });
else if (port >= 0) {
  this.server.listen({
    port,
    host: address,
    // Currently, net module only supports `ipv6Only` option in `flags`.
    ipv6Only: Boolean(flags & constants.UV_TCP_IPV6ONLY),
  });
} else
  this.server.listen(address);  // UNIX socket path.
```

由于两个子进程都在先后顺序不确定的情况下向 master 发送 queryServer 内部消息，所以上面的代码会被执行两次。如果两次的 key 不一样，就会导致 `handle === undefined` 的条件判断为 `true`，进而 listen 两次，最终发生 `ERR_SERVER_ALREADY_LISTEN` 错误。但是在上面的运行过程中，并没有报错，说明了两次的 key 是相同的。

来看下 key 的内容:

```js
const key = `${message.address}:${message.port}:${message.addressType}:` +
            `${message.fd}:${message.index}`;
```

很显然，对于分别来自两个子进程的消息而言，除了 `message.index` 之外，其余项的内容都是相同的，那么 `message.index` 的生成过程在 `./lib/internal/cluster/child.js` 中的代码片段:

```js
const indexesKey = [address,
                    options.port,
                    options.addressType,
                    options.fd ].join(':');

let index = indexes.get(indexesKey);

if (index === undefined)
  index = 0;
else
  index++;
```

可见，两个子进程在分别执行这段代码的时候，`index` 首次都将为 `0`，从而印证了上面的 key 是相同的假设。

之所以子进程中都会执行 listen 方法，而不报错的原因小结如下:

1. 子进程中并没有执行实际的 listen 动作，取而代之的是通过发送消息，请求父进程来执行 listen
2. 父进程中的 listen 由于相同的 key 使得多次动作被合并，最终只 listen 了一次

## 问题3. 不退出

答案现阶段只能先从文档中寻找答案，详细见 [options.stdio](https://nodejs.org/api/child_process.html#child_process_options_stdio)，以下为节选:

> It is worth noting that when an IPC channel is established between the parent and child processes, and the child is a Node.js process, the child is launched with the IPC channel unreferenced (using unref()) until the child registers an event handler for the 'disconnect' event or the 'message' event. This allows the child to exit normally without the process being held open by the open IPC channel.

简单的说，如果子进程中没有对事件 `disconnect` 和 `message` 进行监听的话，那么主进程在等待子进程执行完毕之后，会正常的退出。后半句的「主进程会等待...」见 [options.detached](https://nodejs.org/api/child_process.html#child_process_options_detached)，以下为节选:

> By default, the parent will wait for the detached child to exit. 

为了印证，可以先将 `./test-fork-sub.js` 代码改为:

```js
const {execSync} = require('child_process');

execSync("sleep 3");
```

执行 `./out/Debug/node test-fork-exit.js` 会发现，在大约等待了几秒之后，也就是子进程执行完毕之后，主进程进行了退出。

再次将 `./test-fork-sub.js` 代码改为:

```js
const {execSync} = require('child_process');

execSync("sleep 3");

console.log(`child: ${process.pid} resumed`);
process.on("message", () => {});
```

可以发现，由于子进程监听了 `message` 事件，使得主进程和子进程之间的 IPC channel 阻止了主进程的退出。

在 `./lib/internal/cluster/child.js` 中的 `_setupWorker` 方法中的片段:

```js
process.once('disconnect', () => {
  // ...
});
```

也印证了这一点。

## 问题4. 处理请求

回到 `./lib/internal/cluster/round_robin_handle.js` 文件，注意构造函数 `RoundRobinHandle` 中的代码片段，注意该代码是在主进程中调用的:

```js
// ...
this.server = net.createServer(assert.fail);
// ...
this.server.once('listening', () => {
  this.handle = this.server._handle;
  this.handle.onconnection = (err, handle) => this.distribute(err, handle);
  this.server._handle = null;
  this.server = null;
});
```

`net.createServer` 的参数如果是函数的话，那么该函数的作用实际是用来处理 `connection` 的回调函数。之所以会达到回调的效果，是因为在 `./lib/net.js` 中的 `Server` 构造函数的片段:

```js
if (typeof options === 'function') {
  connectionListener = options;
  options = {};
  this.on('connection', connectionListener);
} else if (options == null || typeof options === 'object') {
  // ...
} else {
  // ...
}
```

那么上面传递的是 `assert.fail`，也就是说，如果该方法成功地被回调了的话，那么进程应该报错。
既然没有报错，那么说明在新的 `connection` 进来之后，没有触发 `connection` 事件。要搞清楚这点，就要看看 `net.Server` 上的 `connection` 事件是如何被触发的。

`net.Server` 上的 `connection` 事件是在该文件内的 `onconnection` 方法中被触发的:

```js
self.emit('connection', socket);
```

而 `onconnection` 顾名思义也是一个 event listener，它是在相同文件内的 `setupListenHandle` 中被引用的:

```js
this._handle.onconnection = onconnection;
```

而 `setupListenHandle` 函数是在调用 `net.Server` 上的 listen 方法被逐步调用到的:

1. RoundRobinHandle 构造函数内部的 listen
2. net.Server 上的 listen
3. net.Server 上的 listenInCluster
4. net.Server 上的 _listen2
5. net.Server 内的 setupListenHandle

最终在 `setupListenHandle` 的代码片段中发现:

```js
this._handle.onconnection = onconnection;
```

回到上面列出的 `RoundRobinHandle` 中的代码:

```js
this.server.once('listening', () => {
  // 这里的 this.server._handle 是对 listen fd 的 wrapper
  this.handle = this.server._handle;
  // 回调中的 handle 是对 connection fd 的 wrapper
  this.handle.onconnection = (err, handle) => this.distribute(err, handle);
  this.server._handle = null;
  this.server = null;
});
```

可以看出，在真正的 listen 动作执行成功之后，`listening` 事件被触发，进入到上面的代码中，然后上面的代码复写了 handle 对象上的 `onconnection` 属性的值，在此之前，该属性的值即为 `assert.fail`。handle 对象此时还是一个 TCP_Wrapper 对象 (对 CPP 层面对象的包裹的一个对象)。

由于 master 环境下 `RoundRobinHandle` 构造 `net.Server` 对象的目的仅仅是希望获得其内部的 listen fd handle 对象，因为 master 只需要将接下来的 connection fd handle 派发给 works 即可，所以上面的回调中在获得了该对象之后，取消了对 `net.Server` 对象的引用。


跟进上述代码中的 `distribute` 方法，发现其会调用 `handoff` 方法，向 work 发送 connection fd handle。也就是说，当 master 进程接收到新连接之后，会将其派发给 work。接下来需要在 `./lib/internal/cluster/child.js` 文件中找到事件监听函数:

```js
function onmessage(message, handle) {
  if (message.act === 'newconn')
    onconnection(message, handle);
  else if (message.act === 'disconnect')
    _disconnect.call(worker, true);
}
```

进一步发现 `onconnection` 方法中:

```js
const server = handles.get(key);
// ...
server.onconnection(0, handle);
```

接来下先搞清楚 `server` 是什么时候被添加进 `handles` 中的，然后再看看 `server.onconnection` 做了什么。

回顾下子进程中所做的事情，可以结合上面的章节。另外，为了方便结合代码进行理解，故同时给出具体的代码位置:

1. work 进程调用 httpServer 上的 listen 方法，该方法继承自父类 `net.Server` [code](https://github.com/nodejs/node/blob/v11.6.0/lib/_http_server.js#L289)
2. work 进程调用 `net.Server` 上的 listen 方法 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/net.js#L1335)
3. work 进程调用 `net.Server::listenInCluster` [code](https://github.com/nodejs/node/blob/v11.6.0/lib/net.js#L1293)
4. work 进程调用 cluster child 模块上的 `_getServer`，并期望被回调 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/net.js#L1316)
5. work 向 master 进程发送 `queryServer` 消息，并期望被回调 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/internal/cluster/child.js#L86)
6. master 构造 `RoundRobinHandle` 实例，并将发来 `queryServer` 消息的 work 注册到其中，并期望被回调。在回调中，会向 work 发送消息，触发第 5 步中 work 期望的回调 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/internal/cluster/master.js#L317)
7. 第 6 步中的回调参数 handle 都将是 false 值 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/internal/cluster/round_robin_handle.js#L42)
8. 从而当回调到第 5 步时，work 进程将执行 `rr` 方法，该方法会伪造一个 handle 对象，加入到 handles 中，并以该对象回调第 4 步 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/internal/cluster/child.js#L171)
9. work 进程中开始执行第 4 步的回调函数 `listenOnMasterHandle`，该函数中设定了 `server._handle = handle`，注意这里的 handle 即为上一步产生的 handle；并调用了 `listen2` [code](https://github.com/nodejs/node/blob/v11.6.0/lib/net.js#L1327)
10. `listen2` 即为 `setupListenHandle`，而 `setupListenHandle` 内部设定了 handle 对象的 `onconnection` 属性 [code](https://github.com/nodejs/node/blob/v11.6.0/lib/net.js#L1246)

接下来 work 进程中处理请求的逻辑就都与不使用 clsuter 模块时的请求处理逻辑一致了，因为是使用的同样的[处理函数](https://github.com/nodejs/node/blob/v11.6.0/lib/net.js#L1471)，只不过是在 work 进程中执行。

请求的处理逻辑可以小结为:

1. master 进程进行实际的 listen 动作，并等待客户端连接
2. 客户端连接由 master 进程，通过消息派发给 work 进程
3. work 进程中复用一般情况下的请求处理代码、对请求进行处理

最后看下 RoundRobinHandle 中的派发机制:

```js
function RoundRobinHandle(key, address, port, addressType, fd, flags) {
  this.key = key;
  this.all = new Map();
  this.free = [];
  this.handles = [];

  // ...

  this.server.once('listening', () => {
    // ...
    
    // 1. 当接收到新的客户端连接后，调用 this.distribute 方法
    this.handle.onconnection = (err, handle) => this.distribute(err, handle);
    
    // ...
  });
}

// master 进程接收到 work 进程的 `queryServer` 消息后，会调用该方法。
// 1. 先将 work 记录到 this.all 这个 map 中
// 2. 调用 this.handoff 方法，该方法导致两个结果:
//   2.1 如果此时有 pending handle 的话，那么即刻使用 work 处理
//   2.2 否则，则将 work 加入到 this.free 这个 map 中
RoundRobinHandle.prototype.add = function(worker, send) {
  //...
  
  this.all.set(worker.id, worker);
  
  const done = () => {
    if (this.handle.getsockname) {
      const out = {};
      this.handle.getsockname(out);
      // TODO(bnoordhuis) Check err.
      send(null, { sockname: out }, null);
    } else {
      send(null, null, null);  // UNIX socket.
    }

    this.handoff(worker);  // In case there are connections pending.
  };

  // ...
};

// 该方法的作用就是讲 connection handle 进行派发
// 1. 先将 handle 加入到 pending 队列中
// 2. 尝试使用 this.free 的第一个 work 处理 pending 队列。如果存在 free work 的话，
//    该 work 还将会被移出 this.free 
RoundRobinHandle.prototype.distribute = function(err, handle) {
  this.handles.push(handle);
  const worker = this.free.shift();

  if (worker)
    this.handoff(worker);
};

// 该方法包含了具体的派发动作
// 1. 从 pending handle 队列取出第一个项目，如果队列为空，则将 work 加入到
//    this.free map 中，否则进行派发动作
// 2. 派发是通过将 handle 经由消息发送给 work 进程的，即 sendHelper 部分
RoundRobinHandle.prototype.handoff = function(worker) {
  if (this.all.has(worker.id) === false) {
    return;  // Worker is closing (or has closed) the server.
  }

  const handle = this.handles.shift();

  if (handle === undefined) {
    this.free.push(worker);  // Add to ready queue again.
    return;
  }

  const message = { act: 'newconn', key: this.key };

  sendHelper(worker.process, message, handle, (reply) => {
    // 该回调由 ./lib/internal/cluster/child.js#L180 触发
    if (reply.accepted)
      // work 进程表示它可以处理该 handle，handle 发送到 work 进程中时应该是
      // 使用的副本的形式。所以主进程则可以关闭属于其上下文的 handle。handle 内部的
      // fd 被加入到 work 进程的 event loop 中
      handle.close();
    else
      // 如注释所描述的，重新调用一次 this.distribute，尝试其他的 work
      this.distribute(0, handle);  // Worker is shutting down. Send to another.

    // 再次调用 this.handoff
    // 如果还有 pending handle，则处理之，否则将 work 重新加入到 this.free 中
    this.handoff(worker);
  });
};
```

调度的机制可以简单理解为:

1. 连接 conn 到来之后，如果有空闲的 work，则告知其处理 conn
2. 否则将 conn 加入 pending 队列
3. 由于 work 的激活是由 connection 事件触发的，所以在 work 处理完 conn 之后，需要主动的再次消化 pending 队列中的内容，该过程连续进行，直到当发现队列为空时，将自身重新标记为 free，等待下一次的 connection 事件对其进行激活

另外需要注意的是，cluster 模块中对 works 进程没有重启的机制，work 进程如果遇到没有主动处理的异常就会退出，master 进程不会自动的补齐 works 数量，当所有的 works 都退出后，即不存在任一个 IPC channel 了，master 进程也将退出。