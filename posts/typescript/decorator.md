# decorator has different implementations in babel and tsc

Assuming we have below code:

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

for tsc with the option `emitDecoratorMetadata` is turned on, above code will be translated into：

```js
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
let AppController = /** @class */ (() => {
    var _a;
    let AppController = class AppController {
        constructor(appService) {
            this.appService = appService;
        }
        getHello() {
            return this.appService.getHello();
        }
    };
    __decorate([
        Get(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", String)
    ], AppController.prototype, "getHello", null);
    AppController = __decorate([
        Controller(),
        // see here, the parameter type is retained
        __metadata("design:paramtypes", [typeof (_a = typeof AppService !== "undefined" && AppService) === "function" ? _a : Object])
    ], AppController);
    return AppController;
})();
```

However, since babel's internal translation process will remove the types before it's doing the actual translating process, the type information is missed from the decorate metadata:

```js
let AppController = _decorate([(0, _common.Controller)()], function (_initialize) {
  class AppController {
    constructor(appService) {
      _initialize(this);

      this.appService = appService;
    }

  }

  return {
    F: AppController,
    d: [{
      kind: "method",
      decorators: [(0, _common.Get)()],
      key: "getHello",
      value: function getHello() {
        return this.appService.getHello();
      }
    }]
  };
});
```