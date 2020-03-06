## 为什么需要检查 UTF-8 编码

根据 WebSocket 协议的要求 [5.6 数据帧](https://juejin.im/post/5c3ff7b5518825254c31a9a3#heading-9)，如果 Frame 的 Opcode 是 `0x1` 的话，则表示这是一个文本帧，即其 “Application Data” 是使用 UTF-8 编码的字符串。不过由于消息也可以使用多个 Frame 进行分片传输，所以在验证文本消息的编码时，需要收集到消息的所有 Frames 后，提取所有的 Frame 中的 “Application Data” 组成一个大的  “Application Data”，然后验证这个大的  “Application Data” 中的字节是不是合法的 UTF-8 编码。

既然协议中要求了文本消息必须使用 UTF-8 编码，那么反过来，验证编码是否是 UTF-8就可以一定程度上确定消息的完整性。

## [Unicode](https://zh.wikipedia.org/wiki/Unicode)
简单的说 Unicode 就是一种字符的编码方式，此编码方式一般使用两个字节（[UCS-2](https://en.wikipedia.org/wiki/Universal_Coded_Character_Set)）去表示一个字符，比如“汉”这个中文字符，其 unicode 编码的十六进制表示就是 `0x6c49`。

## [UTF-8](https://zh.wikipedia.org/wiki/UTF-8)
UTF-8 的全称是 **8-bit Unicode Transformation Format** 中文就是 “8 位的 unicode 转换格式”。UTF-8 是具体的 Unicode 实现方式中的一种，套用 wiki 上的一段话：

>但是在实际传输过程中，由于不同[系统平台](https://zh.wikipedia.org/wiki/%E7%B3%BB%E7%BB%9F%E5%B9%B3%E5%8F%B0)的设计不一定一致，以及出于节省空间的目的，对Unicode编码的实现方式有所不同。Unicode的实现方式称为**Unicode转换格式**（Unicode Transformation Format，简称为UTF）

## UTF-8 的编码方式

>UTF-8使用一至六个字节为每个字符编码（尽管如此，2003年11月UTF-8被[RFC 3629](https://tools.ietf.org/html/rfc3629)重新规范，只能使用原来Unicode定义的区域，U+0000到U+10FFFF，也就是说最多四个字节）

```
   Char. number range  |        UTF-8 octet sequence
      (hexadecimal)    |              (binary)
   --------------------+---------------------------------------------
   0000 0000-0000 007F | 0xxxxxxx
   0000 0080-0000 07FF | 110xxxxx 10xxxxxx
   0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
   0001 0000-0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
```

* 对于 UTF-8 编码中的任意字节B，如果B的第一位为0，则B为ASCII码，并且B独立的表示一个字符；
* 如果B的第一位为1，第二位为0，则B为一个非ASCII字符（该字符由多个字节表示）中的一个字节，并且不是字符的第一个字节编码；
* 如果B的前两位为1，第三位为0，则B为一个非ASCII字符（该字符由多个字节表示）中的第一个字节，并且该字符由两个字节表示；
* 如果B的前三位为1，第四位为0，则B为一个非ASCII字符（该字符由多个字节表示）中的第一个字节，并且该字符由三个字节表示；
* 如果B的前四位为1，第五位为0，则B为一个非ASCII字符（该字符由多个字节表示）中的第一个字节，并且该字符由四个字节表示；

所以我们只需要兼容最新的标准即可。如果你还没有明白 UTF-8 编码的含义，我们可以看一个具体的例子，比如中文的 “汉”，其 Unicode 编码的十六进制表示是 `0x6c49`，那么很明显，它必然落在 `0x00000800 – 0x0000FFFF` 这个区间内，而这个区间的字符必须使用 3 个字节的 UTF-8 编码，表示成 `1110xxxx 10xxxxxx 10xxxxxx` 的形式。

所以对于 `0x6c49` 要转成 UTF-8 编码：
1. 将 `0x6c49` 右移 12 位，取出最高的 4 位，然后或上 `11100000`（即 `0xE0`），得到第一个字节 `0xE6`
2. 将 `0x6c49` 与上 `0000111111000000`（即 `0xFC0`） 后、右移 6 位，这样得到中间的 6 位，然后或上 `10000000`（即 `0x80`） 得到第二个字节 `0xB1`
3. 将 `0x6c49` 与上 `0000000000111111`（即 `0x3F`） 后，或上 `10000000`（即 `0x80`） 得到第三个字节 `0x89`

于是中文字符 “汉” 的 UTF-8 编码就是 `0xE6 0xB1 0x89`，是不是 so easy。

现在，假设现在我们得到一串数据，它包含 3 个字节，其内容是 `0xE6 0xB1 0x89`，并且我们知道这串数据采用的是 UTF-8 编码，我们怎么得知其对应的 unicode 编码是什么呢？一种一种的情况试啊！

1. 取出第一个字节，检查其最高位是不是 0，如果是0，那么当前字节即表示一个字符，如果不是，进行下一步
2. 检查最高 3 位是不是 `110`，如果是的话，那么接下来的一个字节和当前字节合起来表示一个字符，如果不是，进行下一步
3. 检查最高 4 位是不是 `1110`，如果是的话，那么接下来的两个字节和当前字节合起来表示一个字符，如果不是，进行下一步
4. 检查最高 5 位是不是 `11110`，如果是的话，那么接下来的三个字节和当前字节合起来表示一个字符，如果不是，进行下一步
5. 根据最新的标准，UTF-8 编码最多只使用四个字节去表示一个字符，所以到了这一步就说明编码错误了
6. 另外除了表示剩余字节数的那个字节外，其余字节的最高两位都必须是 `10`
7. `U+0000` 不可以使用两个字节进行编码
8. `U+D800~U+DFFF` （左右边界不可取）是保留段，不可以使用

那么看看刚才的例子，我们取出第一个字节 `0xE6`（即 `1110 0110`），我要逐一的尝试每一种情况，最后我们发现它的最高 4 位是 `1110` 那么它之后的两个字节和它一起表示一个字符。

1. 首先我们先将第一个字节与上 `0xF`，这样可以得到实际的 4 位
2. 取出紧随的第二个字节，将其与上 `0x3F`，这样可以得到实际的 6 位
3. 取出紧随的第三个字节，将其与上 `0x3F`，这样可以得到实际的 6 位

最后将这 16 个数位按照取出的顺序从左往右放存放到三个字节中。

## 代码
先放 javascript 的，注意这里使用了 ES6 中的 `String.prototype.codePointAt` 方法，因为在 ES5 中对于超过了 `0xFFFF` 的字符使用 `String.prototype.charCodeAt` 并不能正确的获取其 unicode 编码:

```js
"use strict";

console.assert(typeof String.prototype.codePointAt == 'function', "Current env doesn't support ECMAScript 6!");

Array.prototype.equal = function (b) {
    return this.every(function (e, i) {
        return e === b[i];
    });
};

var unicode2utf8 = function (unicode) {
    unicode = typeof unicode == 'string' ? unicode.codePointAt(0) : unicode;

    if (unicode <= 0x7F) {
        return [unicode]
    } else if (unicode >= 0x80 && unicode <= 0x7FF) {
        return [
            unicode >> 6 | 0xC0,
            unicode & 0x3F | 0x80
        ];
    } else if (unicode >= 0x800 && unicode <= 0xFFFF) {
        return [
            unicode >> 12 | 0xE0,
            (unicode & 0xFC0) >> 6 | 0x80,
            unicode & 0x3F | 0x80
        ];
    } else if (unicode >= 0x10000 && unicode <= 0x10FFFF) {
        return [
            unicode >> 18 | 0xF0,
            (unicode & 0x3F000) >> 12 | 0x80,
            (unicode & 0xFC0) >> 6 | 0x80,
            unicode & 0x3F | 0x80
        ];
    } else {
        throw new Error('deformed unicode: ' + unicode);
    }
};

console.assert(unicode2utf8('u').equal([0x75]), "unicode2utf8 not pass 'u'");
console.assert(unicode2utf8('©').equal([0xC2, 0xA9]), "unicode2utf8 not pass '©'");
console.assert(unicode2utf8('汉').equal([0xE6, 0xB1, 0x89]), "unicode2utf8 not pass '汉'");
console.assert(unicode2utf8('😄').equal([0xF0, 0x9F, 0x98, 0x84]), "unicode2utf8 not pass '😄'");

var utf82unicode = function (utf8) {
    var ul = utf8.length, byte = utf8[0];

    if (ul == 0) {
        throw new Error('empty utf8');
    }

    if (byte <= 127) {
        return byte;
    } else if (byte >> 5 == 0x6 && ul == 2) {
        return ((byte & 0x1F) << 6) |
                utf8[1] & 0x3F;
    } else if (byte >> 4 == 0xE && ul == 3) {
        return ((byte & 0xF) << 12) |
                ((utf8[1] & 0x3F) << 6) |
                (utf8[2] & 0x3F)
    } else if (byte >> 3 == 0x1E && ul == 4) {
        return ((byte & 0x7) << 18) |
                ((utf8[1] & 0x3F) << 12) |
                ((utf8[2] & 0x3F) << 6) |
                (utf8[3] & 0x3F)
    } else {
        throw new Error('deformed utf8: ' + utf8);
    }
};

console.assert(utf82unicode([0x75]) == 'u'.codePointAt(0), "utf82unicode not pass 'u'");
console.assert(utf82unicode([0xC2, 0xA9]) == '©'.codePointAt(0), "utf82unicode not pass '©'");
console.assert(utf82unicode([0xE6, 0xB1, 0x89]) == '汉'.codePointAt(0), "utf82unicode not pass '汉'");
console.assert(utf82unicode([0xF0, 0x9F, 0x98, 0x84]) == '😄'.codePointAt(0), "utf82unicode not pass '😄'");
```

接下来是 golang 的，其中的 `IsIntactUtf8` 函数就是本文讨论的主题 - 检查UTF-8编码的完整性：

```go
func Unicode2utf8(u uint32) (u8 []byte, err error) {
	if u <= 0x7F {
		return []byte{byte(u)}, nil
	} else if u >= 0x80 && u <= 0x7FF {
		return []byte{
			byte(u>>6 | 0xC0),
			byte(u&0x3F | 0x80),
		}, nil
	} else if u >= 0x800 && u <= 0xFFFF {
		return []byte{
			byte(u>>12 | 0xE0),
			byte((u&0xFC0)>>6 | 0x80),
			byte(u&0x3F | 0x80),
		}, nil
	} else if u >= 0x10000 && u <= 0x10FFFF {
		return []byte{
			byte(u>>18 | 0xF0),
			byte((u&0x3F000)>>12 | 0x80),
			byte((u&0xFC0)>>6 | 0x80),
			byte(u&0x3F | 0x80),
		}, nil
	}

	return nil, errors.New(fmt.Sprintf("deformed unicode: %d", u))
}

func TestUnicode2utf8(t *testing.T) {
	u8, _ := Unicode2utf8(0x75)
	if !reflect.DeepEqual(u8, []byte{0x75}) {
		t.Fatal("not pass 'u'")
	}

	u8, _ = Unicode2utf8(0xA9)
	if !reflect.DeepEqual(u8, []byte{0xC2, 0xA9}) {
		t.Fatal("not pass '©'")
	}

	u8, _ = Unicode2utf8(0x6C49)
	if !reflect.DeepEqual(u8, []byte{0xE6, 0xB1, 0x89}) {
		t.Fatal("not pass '汉'")
	}

	u8, _ = Unicode2utf8(0x1F604)
	if !reflect.DeepEqual(u8, []byte{0xF0, 0x9F, 0x98, 0x84}) {
		t.Fatal("not pass '😄'")
	}
}

func Utf82unicode(u8 []byte) (u uint32, err error) {
	u8l := len(u8)

	if u8l == 0 {
		return 0, errors.New("empty utf8")
	}

	b1 := u8[0]
	if b1 <= 0x7F {
		return uint32(b1), nil
	} else if b1>>5 == 0x6 && u8l == 2 {
		return uint32(b1&0x1F)<<6 |
			uint32(u8[1]&0x3F), nil
	} else if b1>>4 == 0xE && u8l == 3 {
		return uint32(b1&0xF)<<12 |
			uint32(u8[1]&0x3F)<<6 |
			uint32(u8[2]&0x3F), nil

	} else if b1>>3 == 0x1E && u8l == 4 {
		return uint32(b1&0x7)<<18 |
			uint32(u8[1]&0x3F)<<12 |
			uint32(u8[2]&0x3F)<<6 |
			uint32(u8[3]&0x3F), nil
	}

	return 0, errors.New(fmt.Sprintf("deformed utf8: %d", u8))
}

func TestUtf82unicode(t *testing.T) {
	u, _ := Utf82unicode([]byte{0x75})
	if u != 0x75 {
		t.Fatal("not pass 'u'")
	}

	u, _ = Utf82unicode([]byte{0xC2, 0xA9})
	if u != 0xA9 {
		t.Fatal("not pass '©'")
	}

	u, _ = Utf82unicode([]byte{0xE6, 0xB1, 0x89})
	if u != 0x6C49 {
		t.Fatalf("not pass '汉': %x", u)
	}

	u, _ = Utf82unicode([]byte{0xF0, 0x9F, 0x98, 0x84})
	if u != 0x1F604 {
		t.Fatal("not pass '😄'")
	}
}

func IsIntactUtf8(u8 []byte) bool {
	i := 0
	u8l := len(u8)

	for {
		if i == u8l {
			break
		}

		b1 := u8[i]
		var tu uint32

		switch {
		case b1 <= 0x7F:
		case b1>>5 == 0x6:
			if u8l-i >= 2 &&
				u8[i+1]&0xC0 == 0x80 &&
				// U+0000 encoded in two bytes: incorrect
				(u8[i] > 0xC0 || u8[i+1] > 0x80) {
				i++
			} else {
				return false
			}
		case b1>>4 == 0xE:
			if u8l-i >= 3 {
				tu = uint32(b1&0xF)<<12 |
					uint32(u8[i+1]&0x3F)<<6 |
					uint32(u8[i+2]&0x3F)

				// UTF-8 prohibits encoding character numbers between U+D800 and U+DFFF
				if tu >= 0x800 && tu <= 0xFFFF && !(tu >= 0xD800 && tu <= 0xDFFF) {
					i += 2
				} else {
					return false
				}
			} else {
				return false
			}
		case b1>>3 == 0x1E:
			if u8l-i >= 4 &&
				u8[i]&0x7 <= 0x4 &&
				u8[i+1]&0xC0 == 0x80 && u8[i+1]&0x3F <= 0xF &&
				u8[i+2]&0xC0 == 0x80 &&
				u8[i+3]&0xC0 == 0x80 {
				i += 3
			} else {
				return false
			}
		default:
			return false
		}
		i++
	}

	return i == u8l
}

type ValidTest struct {
	in  string
	out bool
}

var validTests = []ValidTest{
	{"", true},
	{"a", true},
	{"abc", true},
	{"Ж", true},
	{"ЖЖ", true},
	{"брэд-ЛГТМ", true},
	{"☺☻☹", true},
	{string([]byte{66, 250}), false},
	{string([]byte{66, 250, 67}), false},
	{"a\uFFFDb", true},
	{string("\xF4\x8F\xBF\xBF"), true},      // U+10FFFF
	{string("\xF4\x90\x80\x80"), false},     // U+10FFFF+1; out of range
	{string("\xF7\xBF\xBF\xBF"), false},     // 0x1FFFFF; out of range
	{string("\xFB\xBF\xBF\xBF\xBF"), false}, // 0x3FFFFFF; out of range
	{string("\xc0\x80"), false},             // U+0000 encoded in two bytes: incorrect
	{string("\xed\xa0\x80"), false},         // U+D800 high surrogate (sic)
	{string("\xed\xbf\xbf"), false},         // U+DFFF low surrogate (sic)
}

func TestIsIntactUtf8(t *testing.T) {
	for i, tt := range validTests {
		if IsIntactUtf8([]byte(tt.in)) != tt.out {
			t.Fatalf("[CASE %d] IsIntactUtf8(%q) = %v; want %v", i, tt.in, !tt.out, tt.out)
		}
	}
}
```

原理以及代码都给出来了，应该会对 UTF-8 以及 UTF-8 与 Unicode 之间的关系不明了的同学有些帮助吧。
