## 背景

背景有2：

- 虽然目前存在各式的 JavaScript 引擎，但是由于其优异的性能表现 V8 已经成为相对的标准。

  在深入学习 JavaScript 语言的过程中，除了需要对 [语言标准](http://www.ecma-international.org/ecma-262/6.0/) 进行了解掌握，引擎作为对语言标准的实现，了解学习引擎内部的执行机理则是另一个更为立体的学习语言的方式。

  学习引擎内部机理，直接阅读源码的方式显得过于抽象，如果可以将引擎构建运行起来，并且可以对其进行断点调试，会使学习的过程变得生动有趣。

- 在 [node-debugger](https://g.hz.netease.com/alpaca/wiki/issues/8#node-debugger) 中基于我对 debugger 的理解画了一个通用形式的构架图，希望可以将图中的内容对应到 v8 的实现细节中

接下来内容，就是对如何在 VSCode 中对 V8 引擎进行断点调试的过程的记录。


## 获取源码

可以参照 V8 官网中的章节 [Building V8 from source](https://v8.dev/docs/build) 来获取并从源码构建 V8。V8 作为 [Chromium](https://www.chromium.org/) 项目的一部分，其构建方式都是沿用的与 Chromium 相同的。

按照官网记录的步骤，需要先配置构建工具 [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) 并利用 `gclient sync` 来同步项目的依赖，如果不是为了向 V8 贡献源码、只是以学习为目的的话，整个构建的过程显得相对繁琐，并且构建出的内容在 Windows 和 MacOS  下进行断点调试有存在问题。

为了方便代码的获取和调试，我在 [v8-cmake](https://github.com/bnoordhuis/v8-cmake) 项目的基础上加入了 VSCode 容器调试相关的配置，称之为了 [v8-cmake-vscode](https://github.com/hsiaosiyuan0/v8-cmake)。

[v8-cmake-vscode](https://github.com/hsiaosiyuan0/v8-cmake) 包含两个部分的内容：

- 针对 V8 的 [CMake](https://cmake.org/) 配置。V8 默认的构建配置对主流的编辑器比如 VSCode 或者 [CLion](https://www.jetbrains.com/clion/) 没有比较好的支持

- 利用 [VSCode - Developing inside a Container](https://code.visualstudio.com/docs/remote/containers) 功能，在 [docker](https://www.docker.com/) 容器中对 V8 源码进行构建和调试

因此对于源码的获取，可以直接将 [v8-cmake-vscode](https://github.com/hsiaosiyuan0/v8-cmake) 克隆到本地即可。

## docker 安装

使用 docker 容器技术是本方案的基础，因此首先需要先安装 docker。对于 Windows 和 MacOS 系统可以从官网直接[下载](https://www.docker.com/products/docker-desktop)安装包，对于 Linux 系统则可以参考官方的手动安装[指南](https://docs.docker.com/install/linux/docker-ce/ubuntu/)。

安装好 docker 之后，需要在 [Preferences](https://docs.docker.com/docker-for-mac/#preferences) 面板将容器的资源限制调整得大一点，因为需要编译的 V8 源码体积比较大，为了加速构建，需要提供更多的 CPUs 和内存。

### 基于容器开发简介

上文中的链接 [VSCode - Developing inside a Container](https://code.visualstudio.com/docs/remote/containers) 提供了在 VSCode 中进行基于容器的开发的细节。需要安装 [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) 插件开启 VSCode 对该功能的支持以继续下面的内容。

既然是基于容器进行开发，那么对容器的操作和运行有一个基本了解是必须的，这部分的内容将不会在这里进行展开。

VSCode 中在容器内部进行开发的方式分为两部分：

- 基于用户提供的容器配置文件，构建镜像并启动容器
- 提供将插件安装在容器内部，并可以在配置中预定以进行分发的功能

因此 [v8-cmake-vscode](https://github.com/hsiaosiyuan0/v8-cmake) 相对于 [v8-cmake](https://github.com/bnoordhuis/v8-cmake)  加入的内容有：

- `Dockerfile` 文件
- `.devcontainer` 目录

`Dockerfile` 当然是为了对 V8 进行构建所选取的计算环境，选取了 `Ubuntu:18.04` 为基础，并在其之上安装了构建所必须的软件。

`.devcontaienr/devcontainer.json` 文件则向 VSCode 指明：

- 使用项目中的 `Dockerfile` 构建镜像
- 开启一些容器的选项以支持在其中调试 C++ 代码
- 预置一些开发调试 C++ 所必须的插件，这些插件将会安装在容器中

预置的插件有：

```json
"extensions": [
  "ms-vscode.cpptools",
  "twxs.cmake",
  "ms-vscode.cmake-tools",
  "eamodio.gitlens",
  "v8-torque.vscode-torque",
  "visualstudioexptteam.vscodeintellicode"
],
```

可以在 [VSCode Marketplace](https://marketplace.visualstudio.com/) 中或者 VSCode 左侧的插件面板中搜索它们，主要增加对 CMake 的支持，以及增强对 C++ 的代码静态分析。

VSCode 还支持直接连接到正在运行的容器，这次并未利用这个特性。

## 项目构建 

### 在容器中打开项目

当把 [v8-cmake-vscode](https://github.com/hsiaosiyuan0/v8-cmake) 项目克隆到本地之后，进入本地的项目目录，通过 `code .` 命令在 VSCode 中打开项目目录。如果没有在环境变量 `PATH` 路径下安装过 `code` 命令，也可以使用 VSCode 界面中打开项目目录。

当 VSCode 打开项目之后，注意右下的弹窗会有 `Reopen in Container` 的提示：

<img src="https://p1.music.126.net/d5NPB80538pSVAU08p58OQ==/109951164758879750.png" width="400" />

点击这个按钮即可在容器中打开这个目录。

如果这个提示没有弹出的话，也可以通过呼出[命令面板](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)中选择 `Remote-Contaienr: Open Folder in Container...` 在容器中打开项目

<img src="https://p1.music.126.net/3QrRL868yRt_TiyP5NEjWA==/109951164758901001.png" width="500" />

如果是第一次运行这个步骤，那么此时还没有对应的容器，VSCode 会根据项目中提供的 `Dockerfile` 内容构建一个镜像文件，并以此镜像启动一个供开发调试的容器。首次因为需要构建镜像，所以会花去较多的时间等待，未来如果未对 `Dockerfile` 文件进行修改，则不会重复的构建新的镜像，启动的时间会加速很多。

### 使用 CMake 进行构建

可以呼出[命令面板](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)并选择 `CMake: Debug`

<img src="https://p1.music.126.net/Bs1yWggnpUN7GWNLM9PjtA==/109951164758990573.png" width="500" />

首次会继续询问需要构建的目标：

<img src="https://p1.music.126.net/LJdwvOcUxlrK3XltzYhoLw==/109951164758984926.png" width="500" />

如果不确定的话，选择 `d8` 就可以了。`d8` 是 V8 项目内置的以 V8 为引擎的命令行程序，它的源码在 `v8/src/d8` 下面，入口函数定义在 `v8/src/d8/d8.cc:3913`

选择了构建目标后，构建过程将会自动开启。首次构建将会花费一段时间，需要花些耐心等待构建结束。如果在构建的过程中看到类似 `[build] c++: internal compiler error: Killed (program cc1plus)` 的奇怪错误，可以将容器的资源限制按上文介绍的方式上调。在编译结束后的链接过程中似乎会占据比较大的内存，因此尽可能慷慨地分配资源，因为一次构建需要花费比较长的时间，一次给足资源构建成功最好了。

后续如果不对源码进行修改的话，构建工具将会跳过编译链接过程，这也是使用断点方式比 `printf` 之类来得高效的原因之一。

## 小结

虽然这是一个针对 VSCode 中构建调试 V8 过程的记录整理，但是也包含了一次对 VSCode 中基于容器进行开发的形式的一次尝试。更加确定了编写 VSCode 插件的方向的可行性，将插件预置在 `.devcontainer.json` 中，并提供和线上容器一样的 Dockerfile 让开发者直接在本地的容器中进行开发。

最后放一个进入断点界面的截图作为结尾：

<img src="https://p1.music.126.net/Iij23oIIIH2E99XbQlDurQ==/109951164759032502.png" width="500" />