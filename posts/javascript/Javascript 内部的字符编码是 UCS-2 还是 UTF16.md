## Unicode 和 BMP

Unicode 通过一个确切的名称以及一个整数 (这个整数被叫做该字符的码位 code point) 来标识不同的字符。比如，字符 `©` 的名称是 “版权标识 (copyright sign)”、它的 code point 是 U+00A9 -- `0xA9` (十进制的 `169`)。

Unicode 的编码空间被分离成了 17 个平面，每个平面包含 2^16 (十进制 65,536 即十六进制 0xFFFF) 个码位 (code point)。其中的一些码位尚未被分配到字符，还有一些码位作为私有用途，还有一些永久保留、不存放任何字符 (U+D800到U+DFFF)。每个平面中的码位 (code point) 的取值范围在 `xy0000` ~ `xyFFFF`，`xy` 表示的是该码位所属的平面，上面提到编码空间被分离成了 17 个平面，这里的 `xy` 就是这 17 个平面的编号就的十六进制表示，即 `00` ~ `10`。

第一个平面 (即上面的 `xy` 为 `00`) 被称为 *基本多语言平面 (Basic Multilingual Plane )* 简称 *BMP*，它所包含的码位范围是 U+0000 ~ U+FFFF，这些都是使用频率最高的字符。

剩余的十六个平面 (U+100000 ~ U+10FFFF) 被称为 *补充平面 (supplementary planes or astral planes)*。这里将不继续讨论它们，只要记住字符分为 BMP 字符和 非-BMP (non-BMP) 字符，后者又被称为补充平面。

## UCS-2 和 UTF-16 的不同

> Both UCS-2 and UTF-16 are character encodings for Unicode.

其实上面的文字我感觉并不准确，我们来看 UCS-2 的定义和作用：UCS-2 通用双字节字符集 (2-byte Universal Character Set)，提供了一个定长的 (fixed-length) 格式，即简单的将一个 Unicode 码位表示为一个 16 位的编码单元 (16-bit code unit)。一句话概况说就是，它将 BMP 字符集中的每个字符以其码位的 16 位的形式表示，换句话说，它只能表示 BMP 的字符范围。

我们知道 BMP 的码位范围是 `0x000000~0x00FFFF`，等价的 UCS-2 编码单元的范围就是 `0x0000~0xFFFF`，其实也就是省略了高两位的平面标识位。刚好也就整个涵盖了 BMP，并且我们知道了 BMP 中的字符都是最高频的字符，所以就和 UCS-2 名字描述的一样，它是一个通用字符集，所以它更趋向于字符集合，而不是编码方式。 

UTF-16 就不同了，它的全称是 16 位的 unicode 转换格式 (16-bit Unicode Transformation Format)，它作为 UCS-2 的拓展，可以表示 BMP 之外的字符。它提供了变长的方式 (一个或两个 16 位的编码单元来表示一个码位)。通过这样的方式，可以表示全部的 Unicode 字符。

简单的说就是对于 BMP 字符的码位，UTF-16 使用双字节 (一个编码单元) 来表示它，对于除 BMP 之外的字符的码位，统一使用 4 个字节 (两个编码单元) 来表示它。

比如， 对于 BMP 字符 U+00A9，在 UCS-2 和 UTF-16 中的表现形式都是两个字节，即 `0x00A9`。

## 代理对 (Surrogate pair)

在 UTF-16 编码时，对于 BMP 之外的字符需要使用两个编码单元 (two 16-bit code units) 来表示，比如 *U+1D306 tetragram for centre* `𝌆` 被编码成 `0xD834 0xDF06`。这也被称为是代理对 (surrogate pair)，注意一个代理对只表示一个字符。

代理对中的第一个编码单元的范围总是在 `0xD800` 至 `0xDBFF` 之间，被称为高位代理 (high surrogate) 或者头代理 (lead surrogate)。

代理对中的第二个编码单元的范围总是在 `0xDC00` 至 `0xDFFF` 之间，被称为低位代理 (low surrogate) 或尾代理 (trail surrogate)。

由于 UCS-2 缺乏这种机制 (代理对)，所以对于以 UTF-16 编码的 `𝌆` 在其看到是两个独立的字符。

## 在码位与代理对之间转换

> [Section 3.7 of The Unicode Standard 3.0](http://unicode.org/versions/Unicode3.0.0/ch03.pdf) defines the algorithms for converting to and from surrogate pairs.

对于大于 `0xFFFF` 的码位 `C` 可以表示为代理对 `<H, L>` 的形式，其中：

```js
H = Math.floor((C - 0x10000) / 0x400) + 0xD800
L = (C - 0x10000) % 0x400 + 0xDC00
```

逆算法:

```js
C = (H - 0xD800) * 0x400 + L - 0xDC00 + 0x10000
```

位操作算法

[What’s the algorithm to convert from UTF-16 to character codes?](http://unicode.org/faq/utf_bom.html#utf16-3)

## Javascrpit 中如何

简单的说就是标准中规定了引擎可以选择性的在其内部使用 UCS-2 或者 UTF-16，有一点需要注意的就是，标准中对于字符的定义是：

```
SourceCharacter ::
    any Unicode code unit
```

> JavaScript treats code units as individual characters, while humans generally think in terms of Unicode characters. 

也就是说，JavaScript 内部认为一个编码单元就是一个字符，而通常以人类的角度来说一个字符的指的是 Unicode 中的字符。比如 `'𝌆'.length == 2` 以及 '𝌆' == '\uD834\uDF06'。

> You could argue that it resembles UTF-16, except unmatched surrogate halves are allowed, surrogates in the wrong order are allowed, and surrogate halves are exposed as separate characters. I think you’ll agree that it’s easier to think of this behavior as “UCS-2 with surrogates”.

> Surrogate pairs are only recombined into a single Unicode character when they’re displayed by the browser (during layout). This happens outside of the JavaScript engine. To demonstrate this, you could write out the high surrogate and the low surrogate in separate document.write() calls: document.write('\uD834'); document.write('\uDF06');. This ends up getting rendered as 𝌆 — one glyph.

代理对在整个 JavaScript 内部都被当做是两个 “字符”，之所以们在浏览器中看到 non-BMP 是因为在浏览器渲染部分会对其进行重组。

> ECMAScript 6 will support a new kind of escape sequence in strings, namely Unicode code point escapes e.g. \u{1D306}. Additionally, it will define String.fromCodePoint and String#codePointAt, both of which accept code points rather than code units.

## Nodejs

通过在 Nodejs 中测试，我发现在引擎运行时字符还是以其原有的格式存放的，比如字符是 utf8 格式的，那么在内存中就是 utf8 格式的，不会转换成 ucs-2 或者 utf16 进行存放，但是在需要进行 “字符” 操作时，为了保持统一，这里的 “字符” 还是指代的码元，即 16-bit code unit，所以会进行一次转换，这个步骤我认为发生在具体的函数调用时，比如 `String.prototype.charCodeAt`。

[参考]

* [JavaScript’s internal character encoding: UCS-2 or UTF-16?](https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae)

* [What is Unicode, UTF-8, UTF-16?](https://stackoverflow.com/questions/2241348/what-is-unicode-utf-8-utf-16)