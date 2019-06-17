此文仅作为 [RFC6455](https://tools.ietf.org/html/rfc6455) 的学习笔记。篇幅太长超过了简书的单篇最大长度，故分为两篇，此篇记录 1~4 节，其余见 [WebSocket 协议 5~10 节](WebSocket%20%E5%8D%8F%E8%AE%AE%205~10%20%E8%8A%82.md);

## 1.1 背景知识
由于历史原因，在创建一个具有双向通信机制的 web 应用程序时，需要利用到 HTTP 轮询的方式。围绕轮询产生了 “短轮询” 和 “长轮询”。

### 短轮询
浏览器赋予了脚本网络通信的编程接口 `XMLHttpRequest `，以及定时器接口 `setTimeout `。因此，客户端脚本可以每隔一段时间就主动的向服务器发起请求，询问是否有新的信息产生：

1. 客户端向服务器发起一个请求，询问 “有新信息了吗”
2. 服务端接收到客户端的请求，但是此时没有新的信息产生，于是直接回复 “没有”，并关闭链接
3. 客户端知道了没有新的信息产生，那么就暂时什么都不做
4. 间隔 5 秒钟之后，再次从步骤 1 开始循环执行

### 长轮询
使用短轮询的方式有一个缺点，由于客户端并不知道服务器端何时会产生新的消息，因此它只有每隔一段时间不停的向服务器询问 “有新信息了吗”。而长轮询的工作方式可以是这样：

1. 客户端向服务器发起一个请求，询问 “有新信息了吗”
2. 服务器接收到客户端的请求，此时并没有新的信息产生，不过服务器保持这个链接，像是告诉客户端 “稍等”。于是直到有了新的信息产生，服务端将新的信息返回给客户端。
3. 客户端接收到消息之后显示出来，并再次由步骤 1 开始循环执行

可以看到 “长轮询” 相较于 “短轮询” 可以减少大量无用的请求，并且客户端接收到新消息的时机将会有可能提前。

### 继续改进
我们知道 HTTP 协议在开发的时候，并不是为了双向通信程序准备的，起初的 web 的工作方式只是 “请求-返回” 就够了。

但是由于人们需要提高 web 应用程序的用户体验，以及 web 技术本身的便捷性 - 不需要另外的安装软件，使得浏览器也需要为脚本提供一个双向通信的功能，比如在浏览器中做一个 IM（Instant Message）应用或者游戏。

通过 “长、短轮询” 模拟的双向通信，有几个显而易见的缺点：

1. 每次的请求，都有大量的重复信息，比如大量重复的 HTTP 头。
2. 即使 “长轮询” 相较 “短轮询” 而言使得新信息到达客户端的及时性可能会有所提高，但是仍有很大的延迟，因为一条长连接结束之后，服务器端积累的新信息要等到下一次客户端和其建立链接时才能传递出去。
3. 对于开发人员而言，这种模拟的方式是难于调试的

于是，需要一种可以在 “浏览器-服务器” 模型中，提供简单易用的双向通信机制的技术，而肩负这个任务的，就是 `WebSocket`

## 1.2 协议概览
协议分为两部分：“握手” 和 “数据传输”。

客户端发出的握手信息类似：

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Version: 13
```

服务端回应的握手信息类式：

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
```

客户端的握手请求由 请求行(Request-Line) 开始。客户端的回应由 状态行(Status-Line) 开始。请求行和状态行的生产式见 [RFC2616](https://tools.ietf.org/html/rfc2616)。

首行之后的部分，都是没有顺序要求的 HTTP Headers。其中的一些 HTTP头 的意思稍后将会介绍，不过也可包括例子中没有提及的头信息，比如 Cookies 信息，见 [RFC6265](https://tools.ietf.org/html/rfc6265)。HTTP头的格式以及解析方式见 [RFC2616](https://tools.ietf.org/html/rfc2616)

一旦客户端和服务端都发送了它们的握手信息，握手过程就完成了，随后就开始数据传输部分。因为这是一个双向的通信，所以客户端和服务端都可以首先发出信息。

在数据传输时，客户端和服务器都使用 “消息 Message” 的概念去表示一个个数据单元，而消息又由一个个 “帧 frame” 组成。这里的帧并不是对应到具体的网络层上的帧。

一个帧有一个与之相关的类型。属于同一个消息的每个帧都有相同的数据类型。粗略的说，有文本类型（以 UTF-8 编码 [RFC3629](https://tools.ietf.org/html/rfc3629)）和二进制类型（可以表示图片或者其他应用程序所需的类型），控制帧（不是传递具体的应用程序数据，而是表示一个协议级别的指令或者信号）。协议中定义了 6 中帧类型，并且保留了 10 种类型为了以后的使用。

## 1.3 开始握手
握手部分的设计目的就是兼容现有的基于 HTTP 的服务端组件（web 服务器软件）或者中间件（代理服务器软件）。这样一个端口就可以同时接受普通的 HTTP 请求或则 WebSocket 请求了。为了这个目的，WebSocket 客户端的握手是一个 HTTP 升级版的请求（HTTP Upgrade request）：

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Version: 13
```

为了遵循协议 [RFC2616](https://tools.ietf.org/html/rfc2616)，握手中的头字段是没有顺序要求的。

跟在 GET 方法后面的 “请求标识符 Request-URI” 是用于区别 WebSocket 链接到的不同终节点。一个 IP 可以对应服务于多个域名，这样一台机器上就可以跑多个站点，然后通过 “请求标识符”，单个站点中又可以含有多个 WebSocket 终节点。

Host 头中的服务器名称可以让客户端标识出哪个站点是其需要访问的，也使得服务器得知哪个站点是客户端需要请求的。

其余的头信息是用于配置 WebSocket 协议的选项。典型的一些选项就是，子协议选项 `Sec-WebSocket-Protocol`、列出客户端支出的扩展 `Sec-WebSocket-Extensions`、源标识 `Origin` 等。`Sec-WebSocket-Protocol` 子协议选项，是用于标识客户端想和服务端使用哪一种子协议（都是应用层的协议，比如 chat 表示采用 “聊天” 这个应用层协议）。客户端可以在 `Sec-WebSocket-Protocol` 提供几个供服务端选择的子协议，这样服务端从中选取一个（或者一个都不选），并在返回的握手信息中指明，比如：

```
Sec-WebSocket-Protocol: chat
```

`Origin`可以预防在浏览器中运行的脚本，在未经 WebSocket 服务器允许的情况下，对其发送跨域的请求。浏览器脚本在使用浏览器提供的 WebSocket 接口对一个 WebSocket 服务发起连接请求时，浏览器会在请求的 `Origin` 中标识出发出请求的脚本所属的[源](http://www.jianshu.com/p/09d4cc6e1b45)，然后 WebSocket 在接受到浏览器的连接请求之后，就可以根据其中的源去选择是否接受当前的请求。

比如我们有一个 WebSocket 服务运行在 `http://websocket.example.com`，然后你打开一个网页 `http://another.example.com`，在个 another 的页面中，有一段脚本试图向我们的 WebSocket 服务发起链接，那么浏览器在其请求的头中，就会标注请求的源为 `http://another.example.com`，这样我们就可以在自己的服务中选择接收或者拒绝该请求。

服务端为了告知客户端它已经接收到了客户端的握手请求，服务端需要返回一个握手响应。在服务端的握手响应中，需要包含两部分的信息。第一部分的信息来自于客户端的握手请求中的 `Sec-WebSocket-Key` 头字段：

```
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

客户端握手请求中的 `Sec-WebSocket-Key` 头字段中的内容是采用的 base64 编码 [RFC4648](https://tools.ietf.org/html/rfc4648) 的。服务端并不需要将这个值进行反编码，只需要将客户端传来的这个值首先去除首尾的空白，然后和一段固定的 GUID [RFC4122](https://tools.ietf.org/html/rfc4122) 字符串进行连接，固定的 GUID 字符串为 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`。连接后的结果使用 SHA-1（160数位）[FIPS.180-3](https://tools.ietf.org/html/rfc6455#ref-FIPS.180-3) 进行一个哈希操作，对哈希操作的结果，采用 base64 进行编码，然后作为服务端响应握手的一部分返回给浏览器。

比如一个具体的例子：

1. 客户端握手请求中的 `Sec-WebSocket-Key` 头字段的值为 `dGhlIHNhbXBsZSBub25jZQ==`
2. 服务端在解析了握手请求的头字段之后，得到 `Sec-WebSocket-Key` 字段的内容为 `dGhlIHNhbXBsZSBub25jZQ==`，注意前后没有空白
3. 将 `dGhlIHNhbXBsZSBub25jZQ==` 和一段固定的 GUID 字符串进行连接，新的字符串为 `dGhlIHNhbXBsZSBub25jZQ==258EAFA5-E914-47DA-95CA-C5AB0DC85B11`。
4. 使用 SHA-1 哈希算法对上一步中新的字符串进行哈希。得到哈希后的内容为（使用 16 进制的数表示每一个字节中内容）：`0xb3 0x7a 0x4f 0x2c 0xc0 0x62 0x4f 0x16 0x90 0xf6 0x46 0x06 0xcf 0x38 0x59 0x45 0xb2 0xbe 0xc4 0xea`
5. 对上一步得到的哈希后的字节，使用 base64 编码，得到最后的字符串`s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`
6. 最后得到的字符串，需要放到服务端响应客户端握手的头字段 `Sec-WebSocket-Accept` 中。

服务端的握手响应和客户端的握手请求非常的类似。第一行是 HTTP状态行，状态码是 `101`：

```
HTTP/1.1 101 Switching Protocols
```

任何其他的非 `101` 表示 WebSocket 握手还没有结束，客户端需要使用原有的 HTTP 的方式去响应那些状态码。状态行之后，就是头字段。

`Connection` 和 `Upgrade` 头字段完成了对 HTTP 的升级。`Sec-WebSocket-Accept` 中的值表示了服务端是否接受了客户端的请求。如果它不为空，那么它的值包含了客户端在其握手请求中 `Sec-WebSocket-Key` 头字段所带的值、以及一段预定义的 GUID 字符串（上面已经介绍过怎么由二者合成新字符串的）。任何其他的值都被认为服务器拒绝了请求。服务端的握手响应类似：

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

这些字符需要被 WebSocket 的客户端（一般就是浏览器）检查核对之后，才能决定是否继续执行相应的客户端脚本，或者其他接下来的动作。

可选的头字段也可以被包含在服务端的握手响应中。在这个版本的协议中，主要的可选头字段就是 `Sec-WebSocket-Protocol`，它可以指出服务端选择哪一个子协议。客户端需要验证服务端选择的子协议，是否是其当初的握手请求中的 `Sec-WebSocket-Protocol` 中的一个。作为服务端，必须确保选的是客户端握手请求中的几个子协议中的一个:

```
Sec-WebSocket-Protocol: chat
```

服务端也可以设置 cookie 见[RFC6265](https://tools.ietf.org/html/rfc6265)，但是这不是必须的。

## 1.4 关闭握手
关闭握手的操作也很简单。

任意一端都可以选择关闭握手过程。需要关闭握手的一方通过发送一个特定的控制序列（第 5 节会描述）去开始一个关闭握手的过程。一端一旦接受到了来自另一端的请求关闭控制帧后，接收到关闭请求的一端如果还没有返回一个作为响应的关闭帧的话，那么它需要先发送一个关闭帧。在接受到了对方响应的关闭帧之后，发起关闭请求的那一端就可以关闭连接了。

在发送了请求关闭控制序列之后，发送请求的一端将不可以再发送其他的数据内容；同样的，一但接收到了一端的请求关闭控制序列之后，来自那一端的其他数据内容将被忽略。注意这里的说的是数据内容，控制帧还是可以响应的。否则就下面一句就没有意义了。

两边同时发起关闭请求也是可以的。

之所以需要这样做，是因为客户端和服务器之间可能还存在其他的中间件。一段关闭之后，也需要通知另一端也和中间件断开连接。

## 1.5 设计理念
WebSocket 协议的设计理念就是提供极小的帧结构（帧结构存在的目的就是使得协议是基于帧的，而不是基于流的，同时帧可以区分 Unicode 文本和二进制的数据）。它期望可以在应用层中使得元数据可以被放置到 WebSocket 层上，也就是说，给应用层提供一个将数据直接放在 TCP 层上的机会，再简单的说就可以给浏览器脚本提供一个使用受限的 Raw TCP 的机会。

从概念上来说，WebSocket 只是一个建立于 TCP 之上的层，它提供了下面的功能：

* 给浏览器提供了一个基于源的安全模型（origin-based security model）
* 给协议提供了一个选址的机制，使得在同一个端口上可以创立多个服务，并且将多个域名关联到同一个 IP
* 在 TCP 层之上提供了一个类似 TCP 中的帧的机制，但是没有长度的限制
* 提供了关闭握手的方式，以适应存在中间件的情况

从概念上将，就只有上述的几个用处。不过 WebSocket 可以很好的和 HTTP 协议一同协作，并且可以充分的利用现有的 web 基础设施，比如代理。WebSocket 的目的就是让简单的事情变得更加的简单。

协议被设计成可扩展的，将来的版本中将很可能会添加关于多路复用的概念。

## 1.6 安全模型
WebSocket 协议使用源模型（origin model），这样浏览器中的一个页面中的脚本需要访问其他源的资源时将会有所限制。如果是在一个 WebSocket 客户端中直接使用了 WebSocet（而不是在浏览器中），源模型就没有什么作用，因为客户端可以设置其为任意的值。

并且协议的设计目的也是不希望干扰到其他协议的工作，因为只有通过特定的握手步骤才能建立 WebSocket 连接。另外由于握手的步骤，其他已经存在的协议也不会干扰到 WebSocket 协议的工作。比如在一个 HTTP 表单中，如果表单的地址是一个 WebSocket 服务的话，将不会建立连接，因为到目前本文成文为止，在浏览器中是不可以通过 HTML 和 Javascript APIs 去设置 `Sec-` 头的。

## 1.7 和 TCP 以及 HTTP 之间的关系
WebSocket 是一个独立的基于 TCP 的协议，它与 HTTP 之间的唯一关系就是它的握手请求可以作为一个升级请求（Upgrade request）经由 HTTP 服务器解释（也就是可以使用 Nginx 反向代理一个 WebSocket）。

默认情况下，WebSocket 协议使用 80 端口作为一般请求的端口，端口 443 作为基于传输加密层连（TLS）[RFC2818](https://tools.ietf.org/html/rfc2818) 接的端口

## 1.8 建立一个连接
因为 WebSocket 服务通常使用 80 和 443 端口，而 HTTP 服务通常也是这两个端口，那么为了将 WebSocket 服务和 HTTP 服务部署到同一个 IP 上，可以限定流量从同一个入口处进入，然后在入口处对流量进行管理，概况的说就是使用反向代理或者是负载均衡。

## 1.9 WebSocket 协议的子协议
在使用 WebSocket 协议连接到一个 WebSocket 服务器时，客户端可以指定其 `Sec-WebSocket-Protocol` 为其所期望采用的子协议集合，而服务端则可以在此集合中选取一个并返回给客户端。

这个子协议的名称应该遵循第 11 节中的内容。为了防止潜在的冲突问题，应该在域名的基础上加上服务组织者的名称（或者服务名称）以及协议的版本。比如 `v2.bookings.example.net` 对应的就是 `版本号-服务组织（或服务名）-域名`

## 2 一致性的要求
见原文 [section-2](https://tools.ietf.org/html/rfc6455#section-2)

## 3 WebSocket URIs
在这份技术说明中，定义了两种 URI 方案，使用 ABNF 语法 [RFC 5234](https://tools.ietf.org/html/rfc5234)，以及 URI 技术说明 [RFC3986](https://tools.ietf.org/html/rfc3986) 中的生产式。

```
ws-URI = "ws:" "//" host [ ":" port ] path [ "?" query ]
wss-URI = "wss:" "//" host [ ":" port ] path [ "?" query ]

host = <host, defined in [RFC3986], Section 3.2.2>
port = <port, defined in [RFC3986], Section 3.2.3>
path = <path-abempty, defined in [RFC3986], Section 3.3>
query = <query, defined in [RFC3986], Section 3.4>
```

端口部分是可选的；“ws” 默认使用的端口是 80，“wss” 默认使用的端口是 443。

如果资源标识符（URI）的方案（scheme）部分使用的是大小写不敏感的 “wss” 的话，那么就说这个 URI 是 “可靠的 secure”，并且说明 “可靠标记（secure flag）已经被设置”。

“资源名称 resource-name” 也就是 4.1 节中的 `/resource name/`，可以按下面的部分（顺序）连接：

* 如果不用路径不为空，加上 “/”
* 紧接着就是路径部分
* 如果查询组件不为空 ，加上 “?“
* 紧接着就是查询部分

片段标识符（fragment identifier） “#” 在 WebSocket URIs 的上下文是没有意义的，不能出现在 URIs 中。在 WebSocket 的 URI 中，如果出现了字符 “#” 需要使用 %23 进行转义。

## 4.1 客户端要求
为了建立一个 WebSocket 连接，由客户端打开一个连接然后发送这一节中定义的握手信息。连接初始的初始状态被定义为 “连接中 `CONNECTING`”。客户端需要提供 /host/，/port/，/resource name/ 和 /secure/ 标记，这些都是上一节中的 WebSocket URI 中的组件，如果有的话，还需要加上使用的 /protocols/ 和 /extensions/。另外，如果客户端是浏览器，它还需要提供 /origin/。

连接开始前需要的设定信息为（/host/, /port/, /resource name/ 和 /secure/）以及需要使用的 /protocols/ 和 /extensions/，如果在浏览器下还有 /origin/。这些设定信息选定好了之后，就必须打开一个网络连接，发送握手信息，然后读取服务端返回的握手信息。具体的网络连接应该如何被打开，如何发送握手信息，如何解释服务端的握手响应，这些将在接下来的部分讨论。我们接下来的文字中，将使用第 3 节中定义的项目名称，比如 “/host/” 和 “/secure/”。

1. 在解析 WebSocket URI 的时候，需要使用第 3 节中提到的技术说明去验证其中的组件。如果包含了任何无效的 URI 组件，客户端必须将连接操作标记为失败，并停止接下来的步骤
2. 可以通过 /host/ 和 /port/ 这一对 URI 组件去标识一个 WebSocket 连接。这一部分的意思就是，如果可以确定服务端的 IP，那么就使用 “服务端 IP + port” 去标识一个连接。这样的话，如果已经存在一个连接是 “连接中 `CONNECTING`” 的状态，那么其他具有相同标识的连接必须等待那个正在连接中的连接完成握手后，或是握手失败后关闭了连接后，才可以尝试和服务器建立连接。任何时候只能有一个具有相同的标识的连接是 “正在连接中” 的状态。

  但是如果客户端无法知道服务器的IP（比如，所有的连接都是通过代理服务器完成的，而 DNS 解析部分是交由代理服务器去完成），那么客户端就必须假设每一个主机名称对应到了一个独立服务器，并且客户端必须对同时等待连接的的连接数进行控制（比如，在无法获知服务器 IP 的情况下，可以认为 `a.example.com` 和 `b.example.com ` 是两台不同的服务器，但是如果每台服务器都有三十个需要同时发生的连接的话，可能就应该不被允许）
  
  注意：这就使得脚本想要执行 “拒绝服务攻击 denial-of-service attack” 变得困难，不然的话脚本只需要简单的对一个 WebSocket 服务器打开很多的连接就可以了。服务端也可以进一步的有一个队列的概念，这样将暂时无法处理的连接放到队列中暂停，而不是将它们立刻关闭，这样就可以减少客户端重连的比率。
  
  注意：对于客户端和服务器之间的连接数是没有限制的。在一个客户端请数目（根据 IP）达到了服务端的限定值或者服务端资源紧缺的时候，服务端可以拒绝或者关闭客户端连接。
  
3. 使用代理：如果客户端希望在使用 WebSocket 的时候使用代理的话，客户端需要连接到代理服务器并要求代理服务器根据其指定的 /host/，/port/ 对远程服务器打开一个 TCP 连接，有兴趣的可以看 [Tunneling TCP based protocols through Web proxy servers](http://www.ietf.org/archive/id/draft-luotonen-web-proxy-tunneling-01.txt)。
    
  如果可能的话，客户端可以首选适用于 HTTPS 的代理设置。
  
  如果希望使用 [PAC](https://en.wikipedia.org/wiki/Proxy_auto-config) 脚本的话，WebSocket URIs 必须根据第 3 节说的规则。
  
  注意：在使用 PAC 的时候，WebSocket 协议是可以特别标注出来的，使用 “ws” 和 “wss”。
  
4. 如果网络连接无法打开，无论是因为代理的原因还是直连的网络问题，客户端必须将连接动作标记为失败，并终止接下来的行为。

5. 如果设置了 /secure/，那么客户端在和服务端建立了连接之后，必须要先进行 TLS 握手，TLS 握手成功后，才可以进行 WebSocket 握手。如果 TLS 握手失败（比如服务端证书不能通过验证），那么客户端必须关闭连接，终止其后的 WebSocket 握手。在 TLS 握手成功后，所有和服务的数据交换（包括 WebSocket 握手），都必须建立在 TLS 的加密隧道上。   

  客户端在使用 TLS 时必须使用 “服务器名称标记扩展 Server Name Indication extension” [RFC6066](https://tools.ietf.org/html/rfc6066)
  
一旦客户端和服务端的连接建立好（包括经由代理或者通过 TLS 加密隧道），客户端必须向服务端发送 WebSocket 握手信息。握手内容包括了 HTTP 升级请求和一些必选以及可选的头字段。握手的细节如下：

1. 握手必须是一个有效的 HTTP 请求，有效的 HTTP 请求的定义见 [RFC2616](https://tools.ietf.org/html/rfc2616)

2. 请求的方法必须是 `GET`，并且 HTTP 的版本必须至少是 1.1
   
   比如，如果 WebSocket 的 URI 是 `ws://example.com/chat`，那么请求的第一行必须是 `GET /chat HTTP/1.1`。
   
3. 请求的 `Request-URI` 部分必须遵循第 3 节中定义的 /resource name/ 的定义。可以使相对路径或者绝对路径，比如：

 相对路径：`GET /chat HTTP/1.1` 中间的 `/chat` 就是请求的 `Request-URI`，也是 /resource name/
 绝对路径：`GET http://www.w3.org/pub/WWW/TheProject.html HTTP/1.1`，其中的 /resource name/ 就是 `/pub/WWW/TheProject.html` 感谢 @forl 的指正
 
 绝对路径解析之后会有 /resource name/，/host/ 或者可能会有 /port/。/resource name/ 可能会有查询参数的，只不过例子中没有。
 
4. 请求必须有一个 |Host| 头字段，它的值是 /host/ 主机名称加上 /port/ 端口名称（当不是使用的默认端口时必须显式的指明）

5. 请求必须有一个 |Upgrade| 头字段，它的值必须是 `websocket` 这个关键字（keyword）

6. 请求必须有一个 |Connection| 头字段，它的值必须是 `Upgrade` 这个标记（token）

7. 请求必须有一个 |Sec-WebSocket-Key| 头字段，它的值必须是一个噪音值，由 16 个字节的随机数经过 base64 编码而成。每个连接的噪音必须是不同且随机的。

  注意：作为一个例子，如果选择的随机 16 个字节的值是 `0x01 0x02 0x03 0x04 0x05 0x06 0x07 0x08 0x09 0x0a 0x0b 0x0c 0x0d 0x0e 0x0f 0x10`，那么头字段中的值将是 `AQIDBAUGBwgJCgsMDQ4PEC==`
  
8. 如果连接来自浏览器客户端，那么 |Origin| [RFC6454](https://tools.ietf.org/html/rfc6454) 就是必须的。如果连接不是来自于一个浏览器客户端，那么这个值就是可选的。这个值表示的是发起连接的代码在运行时所属的源。关于源是由哪些部分组成的，见 [RFC6454](https://tools.ietf.org/html/rfc6454)。

  作为一个例子，如果代码是从 `http://cdn.jquery.com` 下载的，但是运行时所属的源是 `http://example.com`，如果代码向 `ww2.example.com` 发起连接，那么请求中 |Origin| 的值将是 `http://example.com`。
  
9. 请求必须有一个 |Sec-WebSocket-Version| 头字段，它的值必须是 13

10. 请求可以有一个可选的头字段 |Sec-WebSocket-Protocol|。如果包含了这个头字段，它的值表示的是客户端希望使用的子协议，按子协议的名称使用逗号分隔。组成这个值的元素必须是非空的字符串，并且取值范围在 U+0021 到 U+007E 之间，不可以包含定义在 [RFC2616](https://tools.ietf.org/html/rfc2616#section-2.2) 的分隔字符（separator character），并且每个以逗号分隔的元素之间必须相互不重复。

11. 请求可以有一个可选的头字段 |Sec-WebSocket-Extensions|。如果包含了这个字段，它的值表示的是客户端希望使用的协议级别的扩展，具体的介绍以及它的格式在第 9 节

12. 请求可以包含其他可选的头字段，比如 cookies [RFC6265](https://tools.ietf.org/html/rfc6265)，或者认证相关的头字段，比如 |Authorization| 定义在 [RFC2616](https://tools.ietf.org/html/rfc2616)，它们的处理方式就参照定义它们的技术说明中的描述。

一旦客户端的握手请求发送完成后，客户端必须等待服务端的握手响应，在此期间不可以向服务器传输任何数据。客户端必须按照下面的描述去验证服务端的握手响应：

1. 如果服务端传来的状态码不是 101，那么客户端可以按照一般的 HTTP 请求处理状态码的方式去处理。比如服务端传来 401 状态码，客户端可以执行一个授权验证；或者服务端回传的是 3xx 的状态码，那么客户端可以进行重定向（但是客户端不是非得这么做）。如果是 101 的话，就接着下面的步骤。

2. 如果服务端回传的握手中没有 |Upgrade| 头字段或者 |Upgrade| 都字段的值不是 ASCII 大小写不敏感的 `websocket` 的话，客户端必须标记 WebSocket 连接为失败。

3. 如果服务端回传的握手中没有 |Connection| 头字段或者 |Connection| 的头字段内容不是大小写敏感的 `Upgrade` 的话，客户端必须表示 WebSocket 连接为失败。

4. 如果服务端的回传握手中没有 |Sec-WebSocket-Accept| 头字段或者 |Sec-WebSocket-Accept| 头字段的内容不是 |Sec-WebSocket-Key| 的内容（字符串，不是 base64 解码后的）联结上字符串 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` 的字符串进行 SHA-1 得出的字节再 base64 编码得到的字符串的话，客户端必须标记 WebSocket 连接为失败。

 简单的说就是客户端也必须按照服务端生成 |Sec-WebSocket-Accept| 头字段值的方式也生成一个字符串，与服务端回传的进行对比，如果不同就标记连接为失败的。
 
5. 如果服务端回传的 |Sec-WebSocket-Extensions| 头字段的内容不是客户端握手请求中的扩展集合中的元素或者 `null` 的话，客户端必须标记连接为失败。这个头字段的解析规则在第 9 节中进行了描述。

  比如客户端的握手请求中的期望使用的扩展集合为：
  
  ```
  Sec-WebSocket-Extensions: bar; baz=2
  ```
  
  那么服务端可以选择使用其中的某个（些）扩展，通过在回传的 |Sec-WebSocket-Extensions| 头字段中表明：
  
  ```
  Sec-WebSocket-Extensions: bar; baz=2
  ```
  
  上面的服务端返回表示都使用。也可以使用其中的一个：
  
  ```
  Sec-WebSocket-Extensions: bar
  ```
  
  如果服务端希望表示一个都不使用，即表示 `null`，那么服务端回传的信息中将不可以包含 |Sec-WebSocket-Extensions|。
  
  失败的界定就是，如果客户端握手请求中有 |Sec-WebSocket-Extensions|，但是服务端返回的 |Sec-WebSocket-Extensions| 中包含了客户端请求中没有包含的值，那么必须标记连接为失败。服务端的返回中不包含 |Sec-WebSocket-Extensions| 是可以的，表示客户端和服务端之间将不使用任何扩展。
  
6. 如果客户端在握手请求中包含了子协议头字段 |Sec-WebSocket-Protocol|，其中的值表示客户端希望使用的子协议的集合。如果服务端回传信息的 |Sec-WebSocket-Protocol| 值不属于客户端握手请求中的子协议集合的话，那么客户端必须标记连接为失败。

如果服务端的握手响应不符合 4.2.2 小节中的服务端握手定义的话，客户端必须标记连接为失败。

请注意，根据 [RFC2616](https://tools.ietf.org/html/rfc2616) 技术说明，请求和响应的中所有头字段的名称都是大小写不敏感的（不区分大小写）。

如果服务端的响应符合上述的描述的话，那么就说明 WebSocket 的连接已经建立了，并且连接的状态变为 “OPEN 状态”。另外，服务端的握手响应中也可以包含 cookie 信息，cookie 信息被称为是 “服务端开始握手的 cookie 设置”。

## 4.2 服务端要求
WebSocket 服务器可能会卸下一些对连接的管理操作，而将这些管理操作交由网络中的其他代理，比如负载均衡服务器或者反向代理服务器。对于这种情况，在这个技术说明中，将组成服务端的基础设施的所有部分合起来视为一个整体。

比如，在一个数据中心，会有一个服务器专门用户响应客户端的握手请求，在握手成功之后将连接转交给实际处理任务的服务器。在这份技术说明中，服务端指代的就是这里的两台机器的组成的整体。

## 4.2.1 读取客户端的握手请求
当客户端发起一个 WebSocket 请求时，它会发送握手过程种属于它那一部分的内容。服务端必须解析客户端提交的握手请求，以从中获得生成服务端响应内容的必要的信息。

客户端的握手请求有接下来的几部分构成。服务端在读取客户端请求时，发现握手的内容和下面的描述不相符（注意 [RFC2616](https://tools.ietf.org/html/rfc2616)，头字段的顺序是不重要的），包括但不限于那些不符合相关 ABNF 语法描述的内容时，必须停止对请求的解析并返回一个具有适当的状态码 HTTP 响应（比如 400 Bad Request）。

1. 必须是 HTTP/1.1 或者以上的 GET 请求，包含一个 “请求资源标识符 Request-URI”，请求资源标识符遵循第 3 节中定义的 /resource name/。

2. 一个 |Host| 头字段，向服务器指明需要访问的服务名称（域名）

3. 一个 |Upgrade| 头字段，值为大小写不敏感的 `websocket` 字符串

4. 一个 |Connection| 头字段，它的值是大小写不敏感的字符串 `Upgrade`

5. 一个 |Sec-WebSocket-Key| 头字段，它的值是一段使用 base64 编码[Section 4 of [RFC4648]](https://tools.ietf.org/html/rfc4648#section-4) 后的字符串，解码之后是 16 个字节的长度。

6. 一个 |Sec-WebSocket-Version| 头字段，它的值是 13.

7. 可选的，一个 |Origin| 头字段。这个是所有浏览器客户度必须发送的。如果服务端限定只能由浏览器作为其客户端的话，在缺少这个字段的情况下，可以认定这个握手请求不是由浏览器发起的，反之则不行。

8. 可选的，一个 |Sec-WebSocket-Protocol| 头字段。由一些值组成的列表，这些值是客户端希望使用的子协议，按照优先级从左往右排序。

9. 可选的，一个 |Sec-WebSocket-Extensions| 头字段。有一些值组成的列表，这些值是客户端希望使用的扩展。具体的表示在第 9 节。

10. 可选的，其他头字段，比如那些用于向服务端发送 cookie 或则认证信息。未知的头字段将被忽略 [RFC2616](https://tools.ietf.org/html/rfc2616)

## 4.2.2 发送服务端的握手响应
当客户端对服务端建立了一个 WebSocket 连接之后，服务端必须完成接下来的步骤，以此去接受客户端的连接，并回应客户端的握手。

1. 如果连接发生在 HTTPS（基于 TLS 的 HTTP）端口上，那么要执行一个 TLS 握手。如果 TLS 握手失败，就必须关闭连接；否则的话之后的所有通信都必须建立在加密隧道上。

2. 服务端可以对客户端执行另外的授权认证，比如通过返回 401 状态码和 对应的 |WWW-Authenticate|，相关描述在 [RFC2616](https://tools.ietf.org/html/rfc2616)

3. 服务端也可以对客户端进行重定向，使用 3xx 状态码 [RFC2616](https://tools.ietf.org/html/rfc2616)。注意这一步也可以发生在上一步之前。

4. 确认下面的信息：

  * /origin/

     客户端握手请求中的 |origin| 头字段表明了脚本在发起请求时所处的源。源被序列化成 ASCII 并且被转换成了小写。服务端可以选择性地使用这个信息去决定是否接受这个连接请求。如果服务端不验证源的话，那么它将接收来自任何地方的请求。如果服务端不想接收这个连接的话，它必须返回适当的 HTTP 错误状态码（比如 403 Forbidden）并且终止接下来的 WebSocket 握手过程。更详细的内容，见第 10 节
   
   * /key/
   
     客户端握手请求中的 |Sec-WebSocket-Key| 头字段包含了一个使用 base64 编码后的值，如果解码的话，这个值是 16 字节长的。这个编码后的值用于服务端生成表示其接收客户端请求的内容。服务端没有必要去将这个值进行解码。
     
   * /version/

     客户端握手请求中的 |Sec-WebSocket-Version| 头字段包含了客户端希望进行通信的 WebSocket 协议的版本号。如果服务端不能理解这个版本号的话，那么它必须终止接下来的握手过程，并给客户端返回一个适当的 HTTP 错误状态码（比如 426 Upgrade Required），同时在返回的信息中包含一个 |Sec-WebSocket-Version| 头字段，通过其值指明服务端能够理解的协议版本号。
   
   * /subprotocol/

      服务端可以选择接受其中一个子协议，或者 `null`。子协议的选取必须来自客户端的握手信息中的 |Sec-WebSocket-Protocol| 头字段的元素集合。如果客户端没有发送 |Sec-WebSocket-Protocol| 头字段，或者客户端发送的 |Sec-WebSocket-Protocol| 头字段中没有一个可以被当前服务端接受的话，服务端唯一可以返回值就是 `null`。不发送这个头字段就表示其值是 `null`。注意，空字符串并不表示这里的 `null` 并且根据 [RFC2616](https://tools.ietf.org/html/rfc2616) 中的 ABNF 定义，空字符串也是不合法的。根据协议中的描述，客户端握手请求中的 |Sec-WebSocket-Protocol| 是一个可选的头字段，所以如果服务端必须使用这个头字段的话，可以选择性的拒绝客户端的连接请求。
      
   * /extensions/

      一个可以为空的列表，表示客户端希望使用的协议级别的扩展。如果服务端支持多个扩展，那么必须从客户端握手请求中的 |Sec-WebSocket-Extensions| 按需选择多个其支持的扩展。如果客户端没有发送次头字段，则表示这个字段的值是 `null`，空字符并不表示 `null`。返回的 |Sec-WebSocket-Extensions| 值中不可以包含客户端不支持的扩展。这个字段值的选择和解释将在第 9 节中讨论
      
5. 如果服务端选择接受来自客户端的连接，它必须回答一个有效的 HTTP 响应：

  1. 一个状态行，包含了响应码 101。比如 `HTTP/1.1 101 Switching Protocols`  
  
  2. 一个 |Upgrade| 头字段，值为 `websocket`

  3. 一个 |Connection| 头字段，值为 `Upgrade`

  4. 一个 |Sec-WebSocket-Accept| 头字段。这个值通过连接定义在 4.2.2 节中的第 4 步的 /key/ 和字符串 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，连接后的字符串运用 SHA-1 得到一个 20 字节的值，最后使用 base64 将这 20 个字节的内容编码，得到最后的用于返回的字符串。

    相应的 ABNF 定义如下：
    
    ```
    Sec-WebSocket-Accept     = base64-value-non-empty
    base64-value-non-empty = (1*base64-data [ base64-padding ]) |
                            base64-padding
    base64-data      = 4base64-character
    base64-padding   = (2base64-character "==") |
                      (3base64-character "=")
    base64-character = ALPHA | DIGIT | "+" | "/"
    ```
    
        注意：作为一个例子，如果来自客户端握手请求中的 |Sec-WebSocket-Key| 的值是 `dGhlIHNhbXBsZSBub25jZQ==` 的话，那么服务端需要将 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` 字符串追加到其后，变成 `dGhlIHNhbXBsZSBub25jZQ==258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，再对这个连接后的字符串运用 SHA-1 哈希得到这些内容 `0xb3 0x7a 0x4f 0x2c 0xc0 0x62 0x4f 0x16 0x90 0xf6 0x46 0x06 0xcf 0x38 0x59 0x45 0xb2 0xbe 0xc4 0xea`，对于哈希后的内容进行 base64 编码，最后得到 `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`，然后将这个值作为服务端返回的头字段 |Sec-WebSocket-Accept| 的字段值。
  
  5. 可选的，一个 |Sec-WebSocket-Protocol| 头字段，它的值已经在第 4.2.2 节中的第 4 步定义了
   
  6. 可选的，一个 |Sec-WebSocket-Extensions| 头字段，它的值已经在第4.2.2 节中的第 4 步定义了。如果有服务端选择了多个扩展，可以将它们分别放在 |Sec-WebSocket-Extensions| 头字段中，或者合并到一起放到一个 |Sec-WebSocket-Extensions| 头字段中。

这样就完成了服务端的握手。如果服务端没有发生终止的完成了所有的握手步骤，那么服务端就可以认为连接已经建立了，并且 WebSocket 连接的状态变为 OPEN。在这时，客户端和服务端就可以开始发送（或者接收）数据了。

## 4.3 握手中使用的新的头字段的 ABNF
这一节中将使用定义在 [Section 2.1 of [RFC2616]](https://tools.ietf.org/html/rfc2616#section-2.1) ABNF 语法/规则，包括隐含的 LWS 规则（implied *LWS rule）。为了便于阅读，这里给出 LWS 的简单定义：任意数量的空格，水平 tab 或者换行（换行指的是 CR（carriage return） 后面跟着 LF（linefeed），使用转义字符表示就是 `\r\n`）。

注意，接下来的一些 ABNF 约定将运用于这一节。一些规则的名称与与之对应的头字段相关。这些规则表示相应的头字段的值的语法，比如 Sec-WebSocket-Key ABNF 规则，它描述了 |Sec-WebSocket-Key| 头字段的值的语法。名字中具有 `-Client` 后缀的 ABNF 规则，表示的是客户端向服务端发送请求时的字段值语法；名字中具有 `-Server` 后缀的 ABNF 规则，表示的是服务端向客户端发送请求时的字段值语法。比如 ABNF 规则 Sec-WebSocket-Protocol-Client 描述了 |Sec-WebSocket-Protocol| 存在与由客户端发送到服务端的请求中的语法。 

接下来新头字段可以在握手期间由客户端发往服务端：

```
Sec-WebSocket-Key = base64-value-non-empty
Sec-WebSocket-Extensions = extension-list
Sec-WebSocket-Protocol-Client = 1#token
Sec-WebSocket-Version-Client = version

base64-value-non-empty = (1*base64-data [ base64-padding ]) |
                        base64-padding
base64-data      = 4base64-character
base64-padding   = (2base64-character "==") |
                 (3base64-character "=")
base64-character = ALPHA | DIGIT | "+" | "/"
extension-list = 1#extension
extension = extension-token *( ";" extension-param )
extension-token = registered-token
registered-token = token

extension-param = token [ "=" (token | quoted-string) ]
       ; When using the quoted-string syntax variant, the value
       ; after quoted-string unescaping MUST conform to the
       ; 'token' ABNF.
  NZDIGIT       =  "1" | "2" | "3" | "4" | "5" | "6" |
                   "7" | "8" | "9"
  version = DIGIT | (NZDIGIT DIGIT) |
            ("1" DIGIT DIGIT) | ("2" DIGIT DIGIT)
            ; Limited to 0-255 range, with no leading zeros
```

下面的新字段可以在握手期间由服务端发往客户端：

```
Sec-WebSocket-Extensions = extension-list
Sec-WebSocket-Accept     = base64-value-non-empty
Sec-WebSocket-Protocol-Server = token
Sec-WebSocket-Version-Server = 1#version
```

## 4.4 支持多个版本的 WebSocket 协议
这一节对在客户端和服务端之间提供多个版本的 WebSocket 协议提供了一些指导意见。

使用 WebSocket 的版本公告能力（|Sec-WebSocket-Version| 头字段），客户端可以指明它期望的采用的协议版本（不一定就是客户端已经支持的最新版本）。如果服务端支持相应的请求版本号的话，则握手可以继续，如果服务端不支持请求的版本号，它必须回应一个（或多个） |Sec-WebSocket-Version| 头字段，包含所有它支持的版本。这时，如果客户端也支持服务端的其中一个协议的话，它就可以使用新的版本号去重复客户端握手的步骤。

下面的例子可以作为上文提到的版本协商的演示：

客户端发送：

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
...
Sec-WebSocket-Version: 25
```

服务端的返回看起来类似：

```
HTTP/1.1 400 Bad Request
...
Sec-WebSocket-Version: 13, 8, 7
```

注意，服务器也可以返回下面的内容：

```
HTTP/1.1 400 Bad Request
...
Sec-WebSocket-Version: 13
Sec-WebSocket-Version: 8, 7
```

客户端现在就可以重新采用版本 13 （如果客户端也支持的话）进行握手请求了：

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
...
Sec-WebSocket-Version: 13
```