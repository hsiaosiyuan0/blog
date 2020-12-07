# deno native plugin 内部实现机制

## demo

可以使用 [create-deno-plugin](https://github.com/chiefbiiko/create-deno-plugin) 创建一个插件工程，方便对插件有个具象化的感知

## 插件注册

1. 首先是载入 dynamic library 见 [deno/cli/ops/plugin.rs#L59](https://github.com/denoland/deno/blob/master/cli/ops/plugin.rs#L59)，并找到模块中的符号 `deno_plugin_init`，这是 deno 扩展机制和插件开发者约定的入口

2. 然后调用模块中的 `deno_plugin_init` 方法，来注册模块希望暴露给 js 环境的方法，注册的步骤见 [deno/cli/ops/plugin.rs#L71](https://github.com/denoland/deno/blob/master/cli/ops/plugin.rs#L71)

3. 模块中是以何种形式将自己的方法注册的呢，详见 [webview_deno/src/lib.rs#L31](https://github.com/webview/webview_deno/blob/master/src/lib.rs#L31)，挑部分简单看下：

```rust
#[no_mangle] // 很重要，否则第2步就找不到符号了，因为 rust 支持重载之类的特性，所以编译后函数名会有变动
pub fn deno_plugin_init(interface: &mut dyn Interface) {
  interface.register_op("webview_free", webview_free);
}

#[json_op]
fn webview_free(
  json: Value,
  _zero_copy: &mut [ZeroCopyBuf],
) -> Result<Value, AnyError> {
  // ...
}
```

可以看到，就是很语义化的一条注册语句 `register_op`

4. 简单看一下 `register_op` 的实现，详见 [deno/cli/ops/plugin.rs#L103](https://github.com/denoland/deno/blob/master/cli/ops/plugin.rs#L103)

```rust
fn register_op(
  &mut self,
  name: &str,
  dispatch_op_fn: plugin_api::DispatchOpFn,
) -> OpId {
  // ...
  let plugin_op_fn = move |state_rc: Rc<RefCell<OpState>>,
                            mut zero_copy: BufVec| {
    // ...
    let op = dispatch_op_fn(&mut interface, &mut zero_copy);
    // ...
  };
  self
    .state
    .op_table
    .register_op(name, metrics_op(Box::new(plugin_op_fn)))
}
```

`dispatch_op_fn` 是插件注册的方法，比如上文的 `webview_free`，然后包装成另一个函数 `plugin_op_fn` 后注册，目前看来包装的目的应该是做一个出入参的调整，包装好后的函数被注册到了 `state.op_table` 中

如果进入 `metrics_op` 的实现查看的话，会发现它又包了一层 [deno/cli/metrics.rs#L82](https://github.com/denoland/deno/blob/master/cli/metrics.rs#L82) 暂时看不知道原因

注册的步骤就到此为止了，流程可以大致梳理为：

- 从 dylib 中找到插件入口
- 调用插件中的注册方法
- 将方法经过2层包装，放到 `op_table` 中，以注册时 `name` 为键名，比如 `"webview_free"`

## 调用

下面开始看下调用的方式，从 js 的调用开始入手：

```js
Deno.openPlugin(pluginPath);
var { asyncOp: asyncOpId, syncOp: syncOpId } = Deno.core.ops();

export function syncOpWrapper(zeroCopy) {
  return Deno.core.dispatch(syncOpId, zeroCopy);
}
```

`openPlugin` 的定义在 [deno/cli/rt/40_plugins.js#L6](https://github.com/denoland/deno/blob/master/cli/rt/40_plugins.js#L6)

`code.dispatch` 的定义在 [deno/core/core.js#L185](https://github.com/denoland/deno/blob/master/core/core.js#L185)，其内部又是使用的 `send`，而 `send` 和 `recv` 的定义在 [deno/core/bindings.rs#L139](https://github.com/denoland/deno/blob/master/core/bindings.rs#L139)

`send` 的实现在 [deno/bindings.rs#L385](https://github.com/denoland/deno/blob/master/core/bindings.rs#L385)，其中的关键方法就是：

```rust
let op = OpTable::route_op(op_id, state.op_state.clone(), bufs);
```

可以看到和注册部分已经串联起来了，简单说就是注册是将方法添加到 hashmap 中，key 是方法名，value 是方法实现，调用的时候，再去 hashmap 里面根据 key 找实现，然后调用

可以看下 `OpTable::route_op` 的实现 [deno/core/ops.rs#L86](https://github.com/denoland/deno/blob/master/core/ops.rs#L86)，其中关键调用是：

```rust
match op_fn {
  Some(f) => (f)(state, bufs), // 这里
  None => Op::NotFound,
}
```

可以看到是直接的函数调用

另外 js -> rust 的调用时，并没有对参数进行序列化操作，而是使用的 `ZeroCopyBuf`，按照它的注释来看，它并没有做内存拷贝，而是将对应的原本由 v8 的 GC 控制的内存，绑定到 `ZeroCopyBuf` 实例的生命周期中，最坏情况下（rust 方法内没有显式地提前释放），就是这块内存直到相应的 `rust` 方法执行完毕后才会被释放

当然也有序列化的版本 [json_op_sync](https://github.com/denoland/deno/blob/master/core/ops.rs#L180)，这样参数就会经过 JSON 的序列化和反序列化

上面只分析了同步调用的情况，异步调用的情况目前看来，可以将简单看成是将 js 的主线程和 rust 主线程绑定到了一起，剩下的异步操作，依赖了 rust 的 async 实现自动做调度


## 访问 Isolate 信息

最初的学习是希望 native plugin 中可以访问到 `v8::Isolate` 从而拿到运行时的信息做简单的监控，目前看来插件 API 并没有将这块的访问开放出来，可能需要提个 issue 去问一问

目前看来可以通过自己定义调用签名的方式来完成调用，有待验证其他方法，因为 version 是在 read-only 区的，也就是 `'static` lifetime 的，所以成功的结果不太有力：

```rust
extern "C" {
    fn v8__V8__GetVersion() -> *const c_char;
}

pub fn gc_stats(_interface: &mut dyn Interface, _zero_copy: &mut [ZeroCopyBuf]) -> Op {
    unsafe {
        let c_str: &CStr =  CStr::from_ptr(v8__V8__GetVersion());
        println!("{:?}", c_str.to_str());
    }
    Op::Sync(Box::new([]))
}
```
