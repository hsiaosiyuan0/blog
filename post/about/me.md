#个人简历

肖思元的个人简历

##基本信息

| Key  | Value |
| :------------- | :------------- |
| 姓名  | 肖思元  |
| 性别  | 男  |
| 出生年月  | 1990.4  |
| 学历  | 本科  |
| Email  | mconintet@163.com  |
| 博客  | [简书](http://www.jianshu.com/u/342aaba5c859) [掘金](https://gold.xitu.io/user/565a3eaf60b2597424ede840)  |
| github  | [mconintet](https://github.com/mconintet) [hsiaosiyuan0](https://github.com/hsiaosiyuan0) |

## 工作经历

### 2015.12 - 今

  任职于 [南京芝麻信息科技有限公司](http://www.zhimatech.com/)，前期负责公司 iOS 应用，的开发，上架了两款 App (一款使用 Object-C 作为开发语言，一款是 Swift 作为的开发语言)。
  
  后期负责 Web 前端工作，负责公司三个后台系统的代码编写以及公司官网的切图。所涵盖的前端工作内容从 Photoshop，AI，Sketch 切图到 Vuejs 最终实现。
  
### 2012.3 - 2015.7

任职于 [南京普兰穆特软件科技有限公司](http://www.plmt-soft.com/)。

后端熟练掌握从零开始编写一个简单的 PHP MVC 小框架。
  
前端熟练掌握从零开始编写一个 tiny jQuery，包括用 js 来实现选择器，样式，事件绑定，ajax，动画。

主要工作内容包括：
  
  * 使用 HTML & CSS，jQuery，Zepto 等前端技术来进行前端的开发
  * 使用 Yii，MySQL 进行服务端的开发
  * [Magento](http://magento.com/) 的深度二次开发，包括定制其物流，3delta 支付模块

期间项目包括:

* 开发区排污监控

  最初它是一个使用 PhoneGap 制作的 Hybird App。主要功能：

  * 开发区的企业展示
  * 企业文档浏览、下载
  * 企业排放实时数据

  这是一个和别家公司合作的项目，他们公司负责环保数据的采集，给我们提供了数据库的读权限，由我们自己去编写接口供前端调用以展示数据，所以服务端使用的是自己写的一个 [很小的 PHP MVC 工具](https://github.com/mconintet/lce)

  在之后我利用业余一个月的时间学习使用 Android native code 重写了该环保项目
  
* 『优美生活』 微信公众号

  可以在微信中搜索『优美生活』来添加它。这是一个美发行业的会员卡系统，前端使用了自己编写的 [sop](https://github.com/mconintet/sop) 来简单实现单页应用，后端采用 Yii & MySQL。为了在浏览器中展示一维码，还造了一个轮子 [jsbarcode](https://github.com/mconintet/jsbarcode)。
  
* FTP 客户端
  
  还使用 Android native code 做了一个简单的 FTP 客户端，不过没有使用 FTP 协议，只是采用的 HTTP 协议来实现对服务端文件的上传、浏览、删除，服务端使用的是 golang。

### 2011.3 - 2012.3

  任职于『江苏迈瑞信息技术有限公司』，从事 Web 开发的的工作。主要涉及：

  1. 使用 .NET Web Form 以及 MSSQL 开发公司内部订餐系统
  2. 使用 .NET Web Form 以及 MSSQL 开发公司内部流程管理系统

## 个人项目

### 前端项目 (raw js，vuejs，electron, coffeescript，canvas)

* [sop](https://github.com/mconintet/sop)

  公司需要做一个会员卡包的项目，主要方向就是微信公众号，那么需要有一个比较好的体验的话就需要使用单页应用的技术。因为我是前后端都做的比较杂，在此之前一直没有时间去学习体会下现有的单页应用的框架，因为项目时间比较紧，考虑到学习也需要时间不如我自己造个轮子来得快，于是花了大概三天的时间设计完成了这小段代码。这小段代码包括了 AMD，PHP 风格的模板，基础的 helper methods，有类似服务端 MVC 的体验。

* [jsbarcode](https://github.com/mconintet/jsbarcode)

  也是由于会员卡的项目，会员卡包需要生成一维码，在比较了几个一维码格式之后，发现 code128 比较不错，优点就是支持的字符多，以及变长（长度可压缩）。也有一个 [golang 版本](https://github.com/mconintet/barcode) 的，但是考虑服务端生成图片的开销以及传输图片的网络开销，最终决定使用 js 直接在 canvas 中绘制。
  
* [lottery](https://github.com/hsiaosiyuan0/lottery)

  使用 vuejs 和 Electron 等开源软件编写的一个年会抽奖小程序。
  
* [brownie](https://github.com/mconintet/brownie)

  这是一个使用 coffeescript 编写的 canvas 小工具，使用它可以方便的实现一个简单的对静态图片和文本的编辑器。

* [re](https://github.com/hsiaosiyuan0/re)

  使用 js 编写的最简正则表达式引擎，用来学习了解和窥视一下正则表达式引擎的内部原理。
  
### 后端 (PHP, nodejs，koa2)

* [PHP MVC Toolkit](https://github.com/mconintet/lce)

	一个简单的 PHP MVC 小框架

* [Lychee](https://github.com/hsiaosiyuan0/lychee)

  这是一个使用 Koa2 实现的简单的博客系统。在内部它通过 Koa-router 来完成路由，Koa-static2 来处理静态文件，handlebars 作为模板引擎。在使用 Koa-router 时，使用了 ES7 中的 decorator 来实现类似 java 中当定义一个 router handler 时通过 Annotation 来标注其对应的 router pattern 的功能，比如：
  
 ```js
  class Post {
    @route.pattern('/')
    async list(ctx, next) {}
  }
 ```

 上面这段 js 代码就将 `list` 这个处理函数直观的与它的 `router pattern` (这里是 `'/'`) 进行了关联。

### IM (WebSocket, golang, Object-C)

* [kiwi](https://github.com/mconintet/kiwi)

  这是我为了完成自己的 IM 的初章，通过阅读 [WebSocket 协议](https://tools.ietf.org/html/rfc6455)，制作了这个 golang package。我对协议的翻译在[这里](http://www.jianshu.com/p/867274a5e054)。其实 golang 官方是有 WebSocket package 的，只是在我有写一个 golang websocket package 想法的时候，官方的包还没有出来，于是我接着最初的想法写了它。
  
* [KiwiChat-Server](https://github.com/mconintet/KiwiChat-Server)

  这是 IM 的服务端，当然是使用的上面我自己写的 golang websocket package。服务端只保存朋友关系，以及用户的基本信息（登陆信息、网络状态等）。对于用户之前发送的消息，是不做保存的。这是偷懒的好主意。其实我是希望信息被更少的人看到，未来客户端和服务端之间的通信会建立在 TLS 上，只是目前还是明文。
  
* [kiwi-objc](https://github.com/mconintet/kiwi-objc)

  这是我为了完成自己的 IM 的第二章，使用 Objective-C 写的一个 WebSocket Client Component，这样就不用使用在 webview 中的 websocket 实现了。
  
* [KiwiChat](https://github.com/mconintet/KiwiChat)

  [开源中国](http://www.oschina.net/)首页[推荐](http://og9g58alt.bkt.clouddn.com/Snip20151108_1.png)项目。项目在开源中国的地址: [KiwiChat@OSC](http://git.oschina.net/mconintet/KiwiChat)
  
  这是我使用 Objc 制作的 iOS IM 客户端。包含了一些基本功能：

	1. 注册
	2. 登陆
	3. 添加好友
	4. 刷新好友信息
	5. 刷新个人信息
	6. 发送文本消息
	7. 显示历史消息

* [KiwiChat-Browser](https://github.com/mconintet/KiwiChat-Browser)

  为了在浏览器中测试 kiwi 的 Echo Server，当然也可以和 KiwiChat 进行聊天。
  
* [sqlite3-objc](https://github.com/mconintet/sqlite3-objc)

  本来在做 KiwiChat 时我是想看下 Core Data 的，想着用 sqlite 的话 Android 和 iOS 的表结构可以通用，于是就选择了使用 sqlite 做持久化存储方案，为了更加方便的使用 sqlite，写了这个 lib。


### 其他

* [honey](https://github.com/mconintet/honey)

  这是一个使用 golang 编写的，可以将 socks5 代理转成 HTTP/HTTPS 代理的软件。制作它的目的是因为在命令行中简单的利用 SSH Client 自带的端口转发功能就可以在本机和远程服务器之间开启一个 socks5 链接，现在的大部分软件都是支持 socks5 代理的，然而有些个比较老的软件比如 SVN，只支持 HTTP/HTTPS 代理，而 Android SDK Manager 居然也只支持 HTTP/HTTPS 代理。

## 个人小结
善于学习，喜欢写代码和造轮子。善用 Google，目前所接触的应用层面的代码基本没有问题。之前的技能树点得还是比较杂，希望接受挑战并在一个方向上深入下去。
