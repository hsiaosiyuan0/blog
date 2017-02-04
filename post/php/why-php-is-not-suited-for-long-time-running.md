<!--
{
  "title": "为什么 PHP 不适合长时间运行"
}
-->
# 为什么 PHP 不适合长时间运行

首先需要先看下这篇 [Reference Counting Basics][link1] 文章，该文章描述了引用计数的基本概念以及它是如何应用在 PHP 引擎中的。

通过阅读上文我们就知道，基于引用计数这种内存管理方式的语言在编写代码的时候，都有一个需要程序员来解决的问题，那就是避免循环引用 (circular reference)。

但是对于上了一定规模的程序而言，靠人脑是很难避免循环引用的。同样使用引用计数的语言比如 Objc，它是通过提供一些编程规范，比如 [Advanced Memory Management Programming Guide][link2]，然后配以工具进行静态分析，帮助程序员来在程序运行前就发现可能的循环引用。

PHP 作为动态类型的语言，我想应该很难复用静态类型语言中的分析技术 (比如 Objc 中的)，来给程序员提供一个分析工具以发现潜在的循环引用。但是我想 PHP 团队之所以没有提供静态分析工具的另外一个主要原因就是 [Reference Counting Basics][link1] 所说的：

> Fortunately, PHP will clean up this data structure at the end of the request, but before then, this is taking up valuable space in memory.

PHP 作为一个 WEB 专门的语言，最常用的方式就是嵌入到 cgi 程序中，在请求结束时，会一次性的释放当次请求所占用的内存，以此避免存泄漏。
当然 [Reference Counting Basics][link1] 也说了：

> This is especially problematic in long running scripts, such as daemons where the request basically never ends, or in large sets of unit tests

显然 PHP 团队意识到了这个问题，并且也试图去解决它，他们引入了 GC [Collecting Cycles][link3]，但是很明显，这个 GC 功能更像是一个实验性的功能，比如限制了 possible roots 的数量，并且修改这个值需要重新编译 PHP 源码：

> The root buffer has a fixed size of 10,000 possible roots (although you can alter this by changing the GC_ROOT_BUFFER_MAX_ENTRIES constant in Zend/zend_gc.c in the PHP source code

不被记录的 root 如果发生了循环引用将永远不能被 GC 检测到:

> If the root buffer becomes full with possible roots while the garbage collection mechanism is turned off, further possible roots will simply not be recorded. Those possible roots that are not recorded will never be analyzed by the algorithm. If they were part of a circular reference cycle, they would never be cleaned up and would create a memory leak

所以目前的 GC 功能只能说是可以稍微缓解下循环引用导致的内存泄露，可以稍微延长一下 PHP 持续运行的时间，但是由于缺乏静态分析工具和更有效的 GC，目前 PHP 仍然不适合长时间运行。

[link1]: http://php.net/manual/en/features.gc.refcounting-basics.php
[link2]: https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/mmPractical.html
[link3]: http://php.net/manual/en/features.gc.collecting-cycles.php
