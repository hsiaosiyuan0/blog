# midway 分析

按目前项目主页的描述，当前默认分支是 [serverless](https://github.com/midwayjs/midway/tree/serverless)，该分支主要提供跨平台的 Serverless 能力，这部分工作是在原有的全栈框架的基础上，抽象不同 Serverless 平台的差异，对外提供相对一致的 Serverless 接口

<img src="https://p6.music.126.net/obj/wo3DlcOGw6DClTvDisK1/3614125418/3dae/5473/d8c5/366e85e46bc33b0652e6dfbfeb4111de.png" width="200" />

原有的全栈框架实现在 [master](https://github.com/midwayjs/midway/tree/master) 分支，接下来将主要分析 master 分支的内容

master 分支中的 README 概况了自身的功能：

> Midway is a Node.js Web framework written by typescript, which uses the IoC injection mechanism to decouple the business logic of the application and make the development of large Node.js application easier and more natural.

主要特点为：

- 使用 TypeScript 编写
- 实现了 IoC 设计理念，方便模块间的解耦
- 基于 “框架的框架” egg 做了一些调整
  - 目录结构
  - 使用注解控制路由
  - controller 和 service [测试](https://midwayjs.org/midway/guide.html#%E5%BA%94%E7%94%A8%E6%B5%8B%E8%AF%95)方式
- 脚手架以及编辑器[增强](https://www.yuque.com/midwayjs/faas/nrcgm5)

按照上面罗列的功能点，应该只有 IoC 是一个比较新的概念，除了 IoC 应该都是和 mug 重叠的功能。所以下面将讨论一下 midway 的 IoC 实现

## IoC

经过这两天对 IoC 设计理念的理解和对 [injection](https://github.com/midwayjs/injection#readme) 模块以及 [midway-web](https://github.com/midwayjs/midway/tree/master/packages/midway-web) 的学习，整理了下面这些关于 IoC 的简介，以及 `midway-web + injection` 如何实现 IoC 的一点分析

### IoC 简介

先准备一个接口 `IUserService`，在这个接口中提供了 `certificate` 来对用户进行实名认证

```ts
// user-service.ts
export interface IUserService {
  certificate(user: UserModel);
}
```

服务提供方基于这个接口，实现了一个服务 `UserService`

```ts
// user-service-impl.ts
export class UserService implements IUserService {
  certificate(user: UserModel): boolean {}
}
```

服务消费方将通过下面的方式来使用该服务：

```ts
// user-controller.ts
import UserService from "user-service";

export class UserController {
  userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  saveCreditCardAction() {
    const isLegal = this.userService.certificate(this.ctx.user);
    if (isLegal) this.ctx.user.save();
  }
}

// app.ts
const ctrl = new UserController();
ctrl.saveCreditCard();
```

上面的使用方式存在一个问题，就是 `userService` 属性的实例化是在 `UserController` 内部完成的，因此在创建 `UserController` 时，不支持外部使用不同的参数来构造 `UserService` 或者使用不同的 `IUserService` 实现，为了解决这个问题，可以进行下面的调整：

```ts
// user-controller.ts
import IUserService from "user-service";
import UserService from "user-service-impl";

export class UserController {
  userService: IUserService;

  constructor(userService: IUserService) {
    this.userService = userService;
  }

  saveCreditCardAction() {
    const isLegal = this.userService.certificate(this.ctx.user);
    if (isLegal) this.ctx.user.save();
  }
}

// app.ts
const userService = new UserService();
const ctrl = new UserController(userService);
ctrl.saveCreditCard();
```

上面的代码，通过将 `userService` 作为 `UserController` 的构造函数参数，并且指定其类型为 `IUserService`，这样消费方就能传入自己所需的 `IUserService` 实现了。不过这样依然存在一些问题，就是消费方的代码和 `UserService` 耦合了起来 - 在 `app.ts` 中固定地实例化了 `UserService`

如果使用了 IoC 后，整体代码变为：

```ts
// user-service-impl.ts
import IUserService from "user-service";

@provide("UserService")
export class UserService implements IUserService {
  certificate(user: UserModel): boolean {}
}

// user-controller.ts
import IUserService from "user-service";

export class UserController {
  @inject("UserService")
  userService: IUserService;

  saveCreditCard() {
    const isLegal = this.userService.certificate(this.ctx.user);
    if (isLegal) this.ctx.user.save();
  }
}

// app.ts
const ctrl = container.get<UserController>("userController");
ctrl.saveCreditCard();
```

使用了 IoC 之后，作为 `IUserService` 实现的 `UserService` 只需要告诉框架自身是名为 `UserService` 的服务提供方，消费方在使用的时候，只需要使用 `inject` 注解告诉框架这是一个使用 IoC 容器管理的名为 `UserService` 的对象，当需要更换 `IUserService` 实现的时候，只需要更准备一个新的实现 `UserService1` 并将其标记为 `@provide("UserService")` 即可，消费方的代码不需要修改

`UserController` 也是由 IoC 容器管理的，容器会预先扫描被它所管理的对象，收集出它们的依赖关系，所以在实例化 `UserController` 会把其属性 `userService` 按需设置好

### midway-web + injection

#### 注册

对那些希望通过 IoC 管理的对象，需要首先向 IoC 注册它们的实现，下面是修改自 injection 模块项目中的例子：

```ts
import { Container } from "injection";

@provide("userModel")
class UserModel {}

const container = new Container();
container.bind(UserModel);

const user = container.get<UserModel>("userModel");
```

除了上面这样命令式的注册外，还支持了通过 xml 文件这样声明式的[注册](https://github.com/midwayjs/injection/blob/master/src/factory/xml/example.xml)，对比一下 spring 的 IoC [描述](https://docs.spring.io/spring/docs/2.5.3/reference/beans.html#beans-factory-collaborators)

这样先注册再使用的模式很好理解，不过有一个会让人疑惑的点在于 midway 中的 Controller 没有一个显式的注册，比如这里的[演示](https://github.com/midwayjs/midway-examples/blob/master/demo-ant-design-pro/server/src/app/controller/home.ts)，那么注册动作是在什么时候以什么方式完成的？

注册是通过 `controller` 注解中的 [saveModule](https://github.com/midwayjs/midway/blob/master/packages/midway-decorator/src/web/controller.ts#L19) 完成的，也就是框架在启动的时候，载入 `controller` 目录下的控制器文件，其中的类因为都添加了 `controller` 注解，因此完成了模块的注册，可以通过编译后的结果看到，对于使用注解修饰的类和其属性，模块文件被引入后，注解函数就立即被执行了：

```ts
@controller("/user")
class UserController {
  @inject("UserService")
  userService: IUserService;

  saveCreditCard() {
    const isLegal = this.userService.certificate(this.ctx.user);
    if (isLegal) this.ctx.user.save();
  }
}
```

会被编译为：

```js
let UserController = _decorate([controller("/user")], function (_initialize) {
  class UserController {
    constructor() {
      _initialize(this);
    }

  }

  return {
    F: UserController,
    d: [{
      kind: "field",
      decorators: [inject("UserService")],
      key: "userService",
      value: void 0
    }, {
      kind: "method",
      key: "saveCreditCard",
      value: function saveCreditCard() {
        const isLegal = this.userService.certificate(this.ctx.user);
        if (isLegal) this.ctx.user.save();
      }
    }]
  };
});
```

就是利用这个机制，在引入文件的时候，就收集了元信息（依赖关系，路由信息等等），随后的启动过程中，框架内部会调用 `MidwayWebLoader::loadMidwayController` 来遍历上面注册的控制器模块，并结合那些通过比如 `get` 注解添加的路由信息完成路由的[创建](https://github.com/midwayjs/midway/blob/master/packages/midway-web/src/loader/webLoader.ts#L291)和[注册](https://github.com/midwayjs/midway/blob/master/packages/midway-web/src/loader/webLoader.ts#L198)

最后是目前 IoC 实现的一些问题：

- 依赖的扫描不是在编译阶段完成的，而是通过注解，在运行时文件被载入的时完成的，这就会导致应用的启动时间变长
- 实例化对象需要根据其依赖图动态的进行，性能上会有一些下降

另外 IoC 的必要性需要讨论，它的目的就是希望将模块之前解耦，考虑到微服务之类的架构形式，服务之间已经解耦，对于单个服务工程内的模块再进行解耦可能用处不是很大，因为需要独立的部分早已作为了单独的服务