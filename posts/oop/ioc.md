## 符合直觉版

```ts
export interface IUserAuthService {
  auth(user: UserModel);
}

export class UserAuthService implements IUserAuthService {
  auth(user: UserModel): boolean {}
}
```

```ts
import UserAuthService from "user-auth-service";

export class UserController {
  userAuthService: UserAuthService;

  constructor() {
    this.userAuthService = new userAuthService();
  }

  saveCreditCard() {
    const isLegal = this.userAuthService.auth(this.ctx.user);
    if (!isLegal) return;
  }
}

// usage
const ctrl = new UserController();
ctrl.saveCreditCard();
```

## 内部解耦版

```ts
import IUserAuthService from "user-auth-service";

export class UserController {
  userAuthService: IUserAuthService;

  constructor(userAuthService: IUserAuthService) {
    this.userAuthService = userAuthService;
  }

  saveCreditCard() {
    const isLegal = this.userAuthService.auth(this.ctx.user);
    if (!isLegal) return;
  }
}

// usage
import UserAuthService from "user-auth-service";

const userAuthService = new UserAuthService();
const ctrl = new UserController(userAuthService);
ctrl.saveCreditCard();
```

## 3

```ts
// service provider
@provide("UserAuthService")
export class UserAuthService implements IUserAuthService {
  auth(user: UserModel): boolean {}
}

// service consumer
import IUserAuthService from "user-auth-service";

export class UserController {
  @inject("UserAuthService")
  userAuthService: IUserAuthService;

  saveCreditCard() {
    const isLegal = this.userAuthService.auth(this.ctx.user);
    if (!isLegal) return;
  }
}

// usage
const ctrl = new UserController(userAuthService);
ctrl.saveCreditCard();

// new service provider but the changes are transparent to the consumer
@provide("UserAuthService")
export class UserAuthService1 implements IUserAuthService {
  auth(user: UserModel): boolean {}
}
```

https://docs.spring.io/spring/docs/2.5.3/reference/beans.html#beans-factory-collaborators
