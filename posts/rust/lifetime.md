# Lifetime

Rust 的绝大部分语法都非常简洁、易于理解，而其为了保证内存安全引入的 lifetime 概念则对大部分人来说是第一次接触

## 变量的作用域

孤零零的「作用域」是不明确的，所以这里的标题是「变量的作用域」，因为作用域的概念，指的就是一个区间、在改区间内，某个变量是可用的。这里「区间」的定义不同，又分为静态作用域或者动态作用域，更多的可以参考 [闭包的作用](../javascript/闭包的作用.md)

Rust 受到 [OCaml](https://ocaml.org/) 这样函数式语言的影响，对变量的 Scope 定义有着一些相似的理解，比如在 OCaml 中通过下面的方式定义变量：

```ocaml
 let add_vect v1 v2 =
    let len = min (Array.length v1) (Array.length v2) in  // ---------+-- s1
      let res = Array.make len 0.0 in                     // ---+- s2 |
        for i = 0 to len - 1 do                           //    |     | 
          res.(i) <- v1.(i) +. v2.(i)                     //    |     |
        done;                                             // ---+-----+
```

上面这段代码，定义了一个名为 `add_vect` 的函数，该函数具有两个形参：`v1` `v2`，`let a in b` 语句表示定义了变量 `a`，它的 lifetime（可用期）在随后的（in 之后）的语句内，换句话说 in 之后出现了一个新的 scope，在这个 scope 中 `a` 是可用的

虽然初次接触这样的语法会感到不习惯，但是相信大家也能体会到这里 `in` 关键字的含义 - `in a new scope`

回到 Rust 中，它虽然没有沿用上面的语法，但是它对作用域的理解和定义，却是和上面相同的，比如手册中的例子：

```rust
{
    let x = 5;              // ----------+-- 'b
                            //           |
    let r = &x;             // --+-- 'a  |
                            //   |       |
    println!("r: {}", r);   //   |       |
                            // --+       |
}                           // ----------+
```

可以想象每个 `let` 语句都有一个隐含的 `in` 关键字

## 作用域标识

```rust
{
    let r;                  // ---------+-- 'a
                            //          |
    {                       //          |
        let x = 5;          // -+-- 'b  |
        r = &x;             //  |       |
    }                       // -+       |
                            //          |
    println!("r: {}", r);   //          |
}                           // ---------+
```

上面这个例子演示的是一个因为错误地在大的作用域中的引用较小作用域中的内容而引发的内存操作错误。显然这个例子在 Rust 中是不能通过编译的

和我们用眼睛区别上面的例子是非法的类似，Rust 中通过 `borrow checker` 来自动地确保变量和它们的作用域是正确的，所以很明显它需要将作用域具象化，否则后续针对作用域的校验都无从谈起

回顾开始的两个例子，为了方便描述不同的作用域，我们使用了 `s1 s2 'a 'b`，它们的取名没有特殊的含义，仅仅是一个标识的作用。`borrow checker` 内部为了做到区别每个作用域，也需要对它们进行标识

## 作用域泛型参数

在程序运行的过程中，每个变量都有其固定的作用域，而且对于静态作用域的语言来说，这个关系在程序运行前就可以确定，这就给 Rust 的 `borrow checker` 静态分析提供了充要条件

虽然静态作用域可以静态分析，但是它始终是一个运行时的概念 - 程序运行阶段，变量才是真正绑定到内存空间的某一块的；而对于函数，它在运行就类似一个模板，等到被调用时才会准备其调用环境（调用栈、参数传递等等），所以对于函数的定义，如果参数是引用类型，该参数的作用域要如何描述呢？

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

<small>例1</small>

像上面的例子这样，引用类型形参的 lifetime 通过 lifetime annotation 来标注。例子中的 `'a` 和下面的 `'a` 有什么联系吗？

```rust
{
    let x = 5;              // ----------+-- 'b
                            //           |
    let r = &x;             // --+-- 'a  |
                            //   |       |
    println!("r: {}", r);   //   |       |
                            // --+       |
}                           // ----------+
```

<small>例2</small>

上面的例子就是前面出现过的，再次放到这里是为了方便对比。这两个例子在不同的位置都出现了 `'a`，有什么联系吗？

例1 中函数 `longest` 签名中的 `'a` 和 例2 中的 `'a` 关系就好比是「形参」和「实参」的关系。更进一步说 例1 中的 `longest<'a>` 是一个泛型参数，比如在 TS 中，我们会这样写一个泛型函数的签名：

```ts
function longest<T>(x: T, y: T): T;
```

因为泛型函数在被处理（编译、类型检查等等）之前，就是一个模板，其中的泛型参数等到被处理时才会替换为实际的类型，比如在编译型的语言中：

```swift
func swapTwoValues<T>(_ a: inout T, _ b: inout T) {
    let temporaryA = a
    a = b
    b = temporaryA
}

var someInt = 3
var anotherInt = 107
swapTwoValues(&someInt, &anotherInt)
```

上面这段 swift 代码，当编译器运行发现调用 `swapTwoValues(&someInt, &anotherInt)` 的时候，才会为 `swapTwoValues<T>` 生成一个针对整型的版本的函数实现 `swapTwoValues<Int>` 

相似的，在 Rust 中，如果形参是引用类型，那么就需要对其作用域进行标注，标注的方式就是给变量的作用域一个标识符，比如例子中的 `'a`，并且这个标识是一个泛型参数 - 因为函数尚未运行，等待函数被调用时，这个泛型参数会被 `borrow checker` 替换成实际变量所属的作用域标识，然后再进行作用域检查

## 理解作用域泛型参数

Rust 函数签名中的作用域泛型参数，除了作为「作用域标识占位符标记」这个作用外，还起到「说明入参的作用域和返回值的作用域、之间的关系」的作用，比如上面的例子中：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str
```

我们看到返回值是一个引用类型，那么它的作用域必然和入参的作用域存在联系（除了 `'static`），因为返回值的作用域一共只有下面的几种情况：

1. 引用类型，和入参相关
2. 引用类型，`'static`
3. 值类型，在函数内实例化，作用域为函数体，不过在返回时 move out 交出所有权

显然只有 情况1 需要特殊对待，那么我们书写函数时，如何标记引用参数的作用域呢？

来看下面的例子，这个例子中 `longest` 签名中只使用了一个作用域参数，但是 `longest` 被调用时，涉及到 3 个不同的作用域：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let a = String::from("a");             // 'a
    {
        let b = String::from("aa");        // 'b
        {
            let c = longest(&a, &b);       // 'c
            println!("{}", c);
        }
    }
}
```

<small>例3 [运行](https://play.rust-lang.org/?version=stable&mode=debug&edition=2018&gist=c7629d6706f280109c23fda451796a32)</small>

这里需要再明确作用域的一个特性 - 作用域之间只有包含关系，没有相交关系：

<img src="https://p5.music.126.net/obj/wo3DlcOGw6DClTvDisK1/3670933222/b0a1/88d2/f3c6/5ea9ddb8104ba884fb81d4b43ba8a224.png" width="250" />

例3 中在调用 `longest(&a, &b)` 时，入参加上返回值涉及到 3 个不同的作用域。所以，虽然 `longest` 签名中只使用了一个作用域参数，但并不表示实际的作用域必须唯一 - 实际的作用域可以为多个，不过这些作用域需要是包含的关系，在调用时会被替换为 3 者间最小范围的作用域。下面我们将代码进行作用域的补全，来演示 `borrow checker` 的工作方式（注意这并不是 Rust 的语法，只是用来演示）：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let a = String::from("a");             // 'a
    {
        let b = String::from("aa");        // 'b
        {
            let c = longest(&'a a as &'c a, &'b b as &'c b);     // 'c
            println!("{}", c);
        }
    }
}
```

我们看到在调用时，`borrow checker` 会做作用域的转换 `as`，比如 `&'a a as &'c a`。我们知道这样的转换是能成功的，因为作用域 `'a` 包含了作用域 `'c`。知道了这个转换过程后，下面的错误例子应该就变得很好理解了：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let c;                                 // 'c
    let a = String::from("a");             // 'a
    {
        let b = String::from("aa");        // 'b
        {
            c = longest(&'a a as &'d a, &'b b as &'d b);     // 'd
        }
    }
    // c 此时绑定的引用其作用域是 'd，于是在做作用域转换的时候就会发生错误，转化的过程如下：
    // 1. 先直接转换 &'d c as &'c c，显然不能成功，因为 'd 的范围小于 'c
    // 2. 查看 &'d c 是否是向下转换而来，取符合条件的外部作用域的范围最小的一个，所以转换变为
    // 3. &'b c as &'c c，此时因为依然不能转换，则无法通过作用域校验
    println!("{}", &'d c as &'c c);
}
```

作为对比，我们可以看下面这个稍微修改后的例子：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let c;                              // 'c
    let a = String::from("a");          // 'a      
    {
        let b = String::from("aa");     // 'b    
        {
            c = longest(&a, &b);        // 'd
        }
        // c 此时绑定的引用其作用域是 'd，转化的过程如下：
        // 1. 先直接转换 &'d c as &'c c，显然不能成功，因为 'd 的范围小于 'c
        // 2. 查看 &'d c 是否是向下转换而来，取符合条件的外部作用域的范围最小的一个，所以转换变为
        // 3. &'b c as &'b c，转换成功，因此通过作用域检查
        println!("{}", &'d c as &'b c);
    }
}
```

## 使用作用域泛型参数

在上一节中，我们通过补全每一步的作用域以及作用域之间的相互转换来理解 `borrow checker` 的工作方式，在平时的编码过程中，我们完全不必自己对作用域做面面俱到的检查，也没有必要对自己做这方面的训练，交给 `borrow checker` 来完成就可以了，我们只需要根据 `borrow checker` 的提示、结合自己的代码需求调整相关代码就可以了

之所以这么说，是希望大家在使用作用域泛型参数时不要有太大的心里负担。因为很可能大家想一次性书写出通过 `borrow checker` 校验的代码，当面对频繁的错误提示时产生挫败感

对于作用域泛型参数，在书写的时候，只要考虑通过作用域泛型参数来描述**各个引用之间的作用域关系**（比如 入参和返回值）即可，就像我们已经熟练使用的类型泛型参数一样，后续的工作（作用域校验，类型校验）统统交给编译工具链来确保代码的正确性即可

[struct 演示](https://play.rust-lang.org/?version=stable&mode=debug&edition=2018&gist=1b919d280f9d049ebc39bc1269ff5e41)

## References

- https://doc.rust-lang.org/1.9.0/book/lifetimes.html
- https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
- https://stackoverflow.com/questions/29861388/when-is-it-useful-to-define-multiple-lifetimes-in-a-struct