# v8 常见数据类型

在编写 node-addon 的时候，了解 v8 的常用数据类型非常重要，否则就会淹没在各种莫名的类型转换中，另外通过 v8 的类型，也可以对 v8 的内部实现加以了解

所以既是作为常见类型的速查手册，也是对实现的简单了解，同时补充一下 cpp 知识，因此不会停留在表面的 API 传译

## Maybe

[Maybe<T>](https://github.com/v8/v8/blob/master/include/v8.h#L10085) 就是 tagged union 的实现，表示 T「存在」或者「不存在」两种情况

`IsNothing` 成员方法表示不存在

`IsJust` 成员方法表示存在

`Check` 判断 T 是否存在，如果不存在则报错并终止程序

`ToChecked` 和 `FromJust` 完全一样，存在则返回 T 值，否则报错并终止程序

`To(T* out)` 用于访问 Maybe 内部的 T 值，如果 T 存在，则将其地址赋值给 `out`、并返回 `true`，否则仅返回 `false`

`Maybe<T>` 的作用是：

- 用于表示某些返回值类型为 T 的 subroutine 的返回值，因为这些 subroutine 内部可能因为某种操作失败导致无法正确返回 T，因此通过返回「不存在」的 `Maybe<T>` 表示内部操作失败
- 提供安全的访问可能不存在的 T 值的方式（可以从上面的成员方法看出），基本上都需要开发者主动思考 T 不存在的情况

## Local

[Local<T>](https://github.com/v8/v8/blob/master/include/v8.h#L197) 表示的是被 GC 管理的对象

> It is safe to extract the object stored in the handle by
> dereferencing the handle (for instance, to extract the Object* from
> a `Local<Object>`); the value will still be governed by a handle
> behind the scenes and the same rules apply to these values as to
> their handles.

可以安全的使用 dereferencing 来访问 Local 内部的对象，该对象依然会被 GC 妥善处理

> Local handles are light-weight and transient and typically used in
> local operations.  They are managed by HandleScopes. That means that a
> HandleScope must exist on the stack when they are created and that they are
> only valid inside of the HandleScope active during their creation.
> For passing a local handle to an outer HandleScope, an EscapableHandleScope
> and its Escape() method must be used.

使用 Local 或者其内部的对象时，需要注意它的生命周期属于其之前外部声明的 `HandleScope`，当其所属的 `HandleScope` 因为离开作用域而销毁时，会连同该对象一起销毁

当需要在不同的 `HandleScope` 之间传递对象时，就需要借助 `EscapableHandleScope` 和 `Escape` 方法

## MaybeLocal

[MaybeLocal](https://github.com/v8/v8/blob/master/include/v8.h#L369) 是针对 `Local<>` 的 `Maybe<>`，所以就很好理解了

主要的疑点在于：

```cpp
template <class T>
class MaybeLocal {
 public:
  V8_INLINE MaybeLocal() : val_(nullptr) {}
  template <class S>
  V8_INLINE MaybeLocal(Local<S> that)
      : val_(reinterpret_cast<T*>(*that)) {
    static_assert(std::is_base_of<T, S>::value, "type check");
  }
 private:
  T* val_;
}
```

`reinterpret_cast` 和 `static_cast` 的区别：

- 使用 static_cast 时，类型系统会在需要转换的 from 和 to 之间做静态类型校验，确保它们之间是可以进行转换的（语义上、数据类型等维度）
  
  比如 `void*` 是可以 static_casting 到 `int*` 的，而 `int*` 是不可以 static_casting 到 `double*` 的

- 使用 `reinterpret_cast` 则是强制类型系统进行转换，由开发者自己确保转换的正确性

考虑下面的表达式：

```cpp
auto str = MaybeLocal<String>(pattern);
```

`T` 就是 `MaybeLocal<String>` 中的 `String`，而 `S` 则是 `pattern` 在静态分析阶段推导出的类型，如果 S 和 T 之间没有显式地确定转换规则，使用 static_cast 就会报错，比如这里如果 pattern 的类型是 `Function`

由于没有 `Function -> String` 的规则，所以无法完成 static_cast，于是这里使用了 `reinterpret_cast`，但是这样又会导致 `pattern` 可以传任意的值，于是加上一个 `is_base_of` 的静态校验，校验 S 必须是 T 的派生类型

这样就不必为形如 `Local<String> -> Local<Object>` 编写显式地拷贝构造函数了 - 简单确认下 String 是 Object 的派生类型就可以符合业务场景了


参考来源：

- [v8](https://github.com/v8)
- [Learning Google V8](https://github.com/danbev/learning-v8)
