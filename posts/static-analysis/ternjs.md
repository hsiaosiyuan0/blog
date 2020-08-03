# 使用 Rust 重写 ternjs

[ternjs](https://ternjs.ne) 是一个完全使用 JavaScript 编写的针对 JavaScript 的代码静态分析工具。它是我目前发现的用来入门静态分析最好的项目了：

- 没有复杂的流程分析
- 推导的算法简单清晰
- 相对详实的文档
- 完全使用 JavaScript 实现

静态分析程序的核心的就是其使用的分析算法，传统的对静态语言进行静态分析的算法、有比较固定的格式，即结合数据和控制流程的分析，这样的方式对于动态语言 JavaScript 来说或许不是非常合适。ternjs 作者另辟蹊径，采用一种非常简单精巧的算法，也能达到不错的分析结果，其分析结果虽然不能完全用作 Lint 工具，但是作为类型提示或者代码补全工具却是绰绰有余

另外这还是一个价值 **16,535 欧元**（2013年左右）的算法<sup><a href="https://www.indiegogo.com/projects/tern-intelligent-javascript-editing#/" target="_blank">1</a></sup>，实在没有理由不收入囊中

## 学习方式

因为我们知道这是一个代码静态分析工具，就像我们看程序一般从 `main` 开始尝试梳理脉络一样，我们可以从 [infer](https://ternjs.net/doc/manual.html#infer) 部分开始看。在 infer 的介绍中，作者提到了一些实现细节，比如需要一个 error-tolerant parser 以及 The syntax tree format 是参考的 [Mozilla parser API](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API)

上面这些基本都是轻车熟路了：先得到程序结构的抽象描述，然后基于这个抽象结果做文章。做文章所需的推导算法，作者已经给出了比较详细的[描述](https://marijnhaverbeke.nl/blog/tern.html)，既然有了算法的描述，就不必傻乎乎的直接去看代码了，按照这个算法先撸一版出来，有问题再去看源码，毕竟是重写而不是抄写

假如从头开始撸的话，对于已经是编写 Recursive Descent Parser 的老司机来说未免显得在准备工作上花费了太多时间了，所以解析器的工作，我们直接选用 [swc](https://github.com/swc-project/swc) 了，另外介绍一下从 swc 的 slack 问来的其名字的含义：

> Speedy Web Compiler. It’s fast, and it compiles transpiles (js and ts) code to a web-consumable form.

貌似 swc 没有 error-tolerant parser，不过问题不大，可以在发现无法通过 parsing 时直接停止继续执行，因为原本 error-tolerant parser 的结果也是不置可否，唯一的好处就是不会 break 当前的进程；The syntax tree format 的问题因为使用了 swc 应该也解决了，它的输出结果应该是用的 ESTree



