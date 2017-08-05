```cmake
project(Hello)
add_executable(Hello Hello.c)
```

`project` 命令指定了项目名称，`add_executable` 像构建过程中添加了一个可执行目标。如果项目包含的文件非常少，整个配置也可以变得更加简单：

```cmake
add_executable(Hello Hello.c File2.c)
```

## 如何指定编译器
https://stackoverflow.com/questions/11588855/how-do-you-set-cmake-c-compiler-and-cmake-cxx-compiler-for-building-assimp-for-i
