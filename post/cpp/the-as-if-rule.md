# The as-if rule

之前了解过 CPP 编译器会有返回值优化「RVO, Return Value Optimization」功能。所以搜索了一下 C 编译器是否也具有该功能。

所谓 RVO，考虑下面的代码：

```cpp
#include <iostream>

struct C {
  C() {}
  C(const C&) { std::cout << "A copy was made.\n"; }
};

C f() {
  return C();
}

int main() {
  std::cout << "Hello World!\n";
  C obj = f();
  return 0;
}
```

在函数 `f` 中，直接返回了栈上创建的 `C` 的实例。在未做优化的情况下，目标代码会将栈上的返回值数据拷贝给 caller；而在有了 RVO 的情况下，该拷贝操作可以被优化掉，即原本在 `f` 调用栈上创建的返回值，直接创建在 caller 的调用栈上，这样在 `f` 调用结束后，caller 可以直接使用返回值而不需要拷贝。

而 C/CPP 中的这些优化(包括 RVO)，都遵循了 `as-if` 原则，规则的细节可以参考 [The as-if rule](https://en.cppreference.com/w/cpp/language/as_if).简单地总结一下，就是在不改变程序本身的执行结果的前提下，编译器可以做任意的优化，而对「不改变程序本身的执行结果」的定义、就是 `as-if` 原则的用途。