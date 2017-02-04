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
| 博客  | [简书](http://jianshu.mconintet.com) [掘金](https://gold.xitu.io/user/565a3eaf60b2597424ede840)  |
| github  | [mconintet](http://github.mconintet.com) [hsiaosiyuan0](https://github.com/hsiaosiyuan0) |

## 工作经历

### 2015.12 - 今

  任职于 [南京芝麻信息科技有限公司](http://www.zhimatech.com/)，负责公司新 iOS 应用，和 web 前端的开发工作。开始四个月主要负责公司 iOS 客户端的开发，后来公司进行业务整合，开始负责 web 前端工作，主要使用 vuejs 来开发后台管理系统。
  
### 2012.3 - 2015.7

  任职于 [南京普兰穆特软件科技有限公司](http://www.plmt-soft.com/)。主要工作内容是基于 [Magento](http://magento.com/) 的深度二次开发。代表性的站点有 [peekkids](http://peekkids.com/)、[tosy](http://tosy.com/)、[天下牧场](http://www.txmch.com/) 等。
  
  由于工作需要，使用 PhoneGap 制作了一个环保项目，主要负责开发区的企业展示，企业文档浏览、下载，企业排放实时数据。这是一个和别家公司合作的项目，他们公司负责环保数据的采集，给我们提供了数据库的读权限，由我们自己去编写接口供前端调用以展示数据，所以服务端使用的是自己写的一个 [PHP MVC toolkit](https://github.com/mconintet/lce)。
  之后我利用用业余一个月的时间学习使用 Android native code 重写了环保项目。
  
  还做过一个微信公众号的应用、可以搜索『优美生活』。它是一个美发行业的会员卡系统，前端使用了自己编写的 [sop](https://github.com/mconintet/sop) 来简单实现客户端的 MVC，后端采用 Yii。为了在浏览器中展示一维码，还造了一个轮子 [jsbarcode](https://github.com/mconintet/jsbarcode)。
  
  还使用 Android native code 做了一个简单的 FTP 客户端，不过没有使用 FTP 协议，只是采用的 HTTP 协议来实现对服务端文件的上传、浏览、删除，服务端使用的是 golang。
 

### 2012.3 - 2011.3

  任职于『江苏迈瑞信息技术有限公司』，从事 Web 开发的的工作。主要涉及：

  1. 使用 .NET Web Form 以及 MSSQL 开发公司内部订餐系统
  2. 使用 .NET Web Form 以及 MSSQL 开发公司内部流程管理系统

## 个人项目

### [honey](https://github.com/mconintet/honey)
这是一个可以将 socks5 代理转成 HTTP/HTTPS 代理的软件。制作它的目的是因为在命令行中简单的利用 SSH Client 自带的端口转发功能就可以在本机和远程服务器之间开启一个 socks5 链接，现在的大部分软件都是支持 socks5 代理的，然而有些个比较老的软件比如 SVN，只支持 HTTP/HTTPS 代理，而 Android SDK Manager 居然也只支持 HTTP/HTTPS 代理。

### [sop](https://github.com/mconintet/sop)
公司需要做一个会员卡包的项目，主要方向就是微信公众号，那么需要有一个比较好的体验的话就需要使用单页应用的技术。因为我是前后端都做的比较杂，在此之前一直没有时间去学习体会下现有的单页应用的框架，因为项目时间比较紧，考虑到学习也需要时间不如我自己造个轮子来得快，于是花了大概三天的时间设计完成了这小段代码。这小段代码包括了 AMD，PHP 风格的模板，基础的 helper methods，有类似服务端 MVC 的体验。

### [jsbarcode](https://github.com/mconintet/jsbarcode)
也是由于会员卡的项目，会员卡包需要生成一维码，在比较了几个一维码格式之后，发现 code128 比较不错，优点就是支持的字符多，以及变长（长度可压缩）。也有一个 [golang 版本](https://github.com/mconintet/barcode) 的，但是考虑服务端生成图片的开销以及传输图片的网络开销，最终决定使用 js 直接在 canvas 中绘制。

### [kiwi](https://github.com/mconintet/kiwi)
这是我为了完成自己的 IM 的初章，通过阅读 [WebSocket 协议](https://tools.ietf.org/html/rfc6455)，制作了这个 golang package。我对协议的翻译在[这里](http://www.jianshu.com/p/867274a5e054)。其实 golang 官方是有 WebSocket package 的，只是在我有写一个 golang websocket package 想法的时候，官方的包还没有出来，于是我接着最初的想法写了它。

### [kiwi-objc](https://github.com/mconintet/kiwi-objc)
这是我为了完成自己的 IM 的第二章，使用 Objective-C 写的一个 WebSocket Client Component，这样就不用使用在 webview 中的 websocket 实现了。

### [KiwiChat](https://github.com/mconintet/KiwiChat)
[开源中国](http://www.oschina.net/)首页[推荐](http://og9g58alt.bkt.clouddn.com/Snip20151108_1.png)项目。项目在开源中国的地址: [KiwiChat@OSC](http://git.oschina.net/mconintet/KiwiChat)

这是我使用 Objc 制作的 iOS IM 客户端。包含了一些基本功能：

1. 注册
2. 登陆
3. 添加好友
4. 刷新好友信息
5. 刷新个人信息
6. 发送文本消息
7. 显示历史消息

### [KiwiChat-Server](https://github.com/mconintet/KiwiChat-Server)
这是 IM 的服务端，当然是使用的上面我自己写的 golang websocket package。服务端只保存朋友关系，以及用户的基本信息（登陆信息、网络状态等）。对于用户之前发送的消息，是不做保存的。这是偷懒的好主意。其实我是希望信息被更少的人看到，未来客户端和服务端之间的通信会建立在 TLS 上，只是目前还是明文。

### [KiwiChat-Browser](https://github.com/mconintet/KiwiChat-Browser)
为了测试 kiwi 的 Echo Server，当然也可以和 KiwiChat 进行聊天。

### [sqlite3-objc](https://github.com/mconintet/sqlite3-objc)
本来在做 KiwiChat 时我是想看下 Core Data 的，想着用 sqlite 的话 Android 和 iOS 的表结构可以通用，于是就选择了使用 sqlite 做持久化存储方案，为了更加方便的使用 sqlite，写了这个 lib。

### [brownie](https://github.com/mconintet/brownie)
这是一个使用 coffeescript 编写的 canvas 小工具，使用它可以方便的实现一个简单的对静态图片和文本的编辑器。

### [lottery](https://github.com/hsiaosiyuan0/lottery)
使用 vuejs 和 Electron 等开源软件编写的一个年会抽奖小程序。

### [re](https://github.com/hsiaosiyuan0/re)
使用 js 编写的最简正则表达式引擎，用来学习了解和窥视一下正则表达式引擎的内部原理。

## 个人小结
喜欢写代码和造轮子，目前所接触的应用层面的代码基本没有问题，希望接受挑战并在一个方向上深入下去。
