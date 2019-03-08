# 小结

学习汇编语言的收获:

1. 了解汇编语言的语法
2. 了解 CPU 和 内存的基本结构
3. 栈及其相关操作
4. 了解汇编语言层面如何进行 Procedure 调用，包括传参和返回值和返回点如何处理
5. 了解汇编语言和 C 语言如何相互调用，以及 C 语言是如何编译成汇编语言

## 汇编语言的语法

汇编语言的语法包括预处理和指令生成两种，预处理部分在汇编的预处理阶段被处理，而指令生成部分则会在编译阶段生成具体的指令。
比如预处理阶段的 `macro` 和 `%define` 以及指令生成阶段的 `add AX, 1`。

对于指令生成的语法，都是没一行对应一条指令，且语法形式为 `opode operand1, operand2, ...` 即操作码接操作数的形式。

## 了解 CPU 和内存的基本结构

CPU 由各种运算电路以及寄存器组成。运算电路负责实际的运算，而寄存器用于存放参数，临时结果，最终结果。寄存器分为通用寄存器和特定用途寄存器。

特定用途寄存器又大致分为： 段寄存器，标志寄存器和指令指针寄存器，等。对于 EBP 和 ESP 这两个寄存，有时又被称为特殊通用寄存器，这是因为在进行栈的相关操作时这两个寄存器会有特殊用途。所谓“通用”指的是，该寄存器可以作为计算或者存放临时结果的寄存器，而特殊寄存器则被限定了其用途，比如指令指针寄存器，只可以用于存放接下来的指令的位置。

之所以 ESP 和 EBP 被称为通用寄存器就是因为，这两个寄存器也是可以在计算时用于存放临时结果的，只不过在栈相关操作时，为了方便将他们的功能基于约定地限定了。

对于内存的基本结构而言，CPU 并不能够直接访问内存上的数据，而是要通过地址总线，数据总线和控制总线，来指挥内存芯片来读取或者写入内存数据。由于内存以及 CPU 的设计结构限制，会有存在内存上的数据需要进行对齐的要求，如前所述，该要求并不是绝对的。数据对齐一般都是有编译器自动完成的，这在 C 语言中就涉及到数据 padding。

## 栈及其相关操作

栈是一个后进先出的结构，并且向低地址方向增长，栈中只会存放 word 和 double words 长度的元素，不会单独存放单个字节。TOS 指向的是栈顶元素的最低字节，栈中元素被 pop 后，只是将 TOS 向高地址方向进行移动，以此达到元素被移出的效果。移出元素的内存中的数据则实在下一次的入栈操作时被覆写。

## 了解 Procedure 调用细节

过程调用时的参数可以通过寄存器或者栈进行传递。使用寄存器和栈个有利弊。使用寄存器能获取更高的性能，这是因为减少了内存操作，操作数直接存在于寄存器中了。使用寄存器的弊端就是，寄存器数量是有限的，所以主要还是应该将它们用于计算。使用栈传递的参数的好处就是可以将原本用于传参的寄存器解放出来，用于计算，弊端就是在涉及到具体的计算时，需要将数据从栈中载入寄存器。

参数的释放，可以由调用者或者被调用者来释放。在参数长度固定的情况下，由被调用者进行参数的释放，比较符合模块化的设计思路。当参数长度不固定时，则只能有调用者来进行参数的释放。

在过程内部，在需要使用寄存器时，首先需要想将其进行压栈备份，然后在过程执行完毕后，进行出栈恢复。

call 指令的操作数并不是过程的相对代码段基地址的偏移量，而是相对被调用过程的第一条指令想对于 call 指令的下一条指令的相对偏移量，比如：

```asm
%include "io.mac"
.DATA
prompt_msg1  db   "Please input the first number: ",0
prompt_msg2  db   "Please input the second number: ",0
sum_msg      db   "The sum is ",0

.CODE
      .STARTUP
      PutStr  prompt_msg1    ; request first number
      GetInt  CX             ; CX = first number

      PutStr  prompt_msg2    ; request second number
      GetInt  DX             ; DX = second number

      call    sum            ; returns sum in AX
      PutStr  sum_msg        ; display sum
      PutInt  AX
      nwln
done:
      .EXIT

;-----------------------------------------------------------
; Procedure sum receives two integers in CX and DX.
; The sum of the two integers is returned in AX.
;-----------------------------------------------------------
sum:
      mov     AX,CX          ; sum = first number
      add     AX,DX          ; sum = sum + second number
      ret
```

上面代码中的 `call sum` 执行过程如下:

1. `call sum` 指令被读取，此时 EIP 寄存器已经为 `PutStr  sum_msg` 相对代码段基地址的偏移量了，假设 `call sum` 的地址为 `x`，则此时 EIP 的内容为 `x+1`。
2. `call sum` 的操作数为 `sum` 第一条指令的地址 `mov AX，CX` 相对于 `PutStr  sum_msg` 的相对偏移量。假设 `mov AX，CX` 地址为 y，此时 call 的操作数为 `y - (x + 1)`。因此，call 指令执行完成后，即对 EIP 中的地址进行调整，使得 EIP 中的地址变为了 `sum` 第一条命令的地址，即 `y = (y - (x + 1) + (x + 1))`。

除了修改 EIP 的内容达到指令跳转的功能外，call 指令还会将当前(修改前)的 EIP 内容压入栈中，因此在被调用过程的内部，可以使用 ret 指令进行返回。有一点需要注意的时，在执行 ret 指令时，ESP 必须指向栈上的记录返回地址的元素，这在由被调用的过程释放参数的情况下需要注意，可以使用 ret 的操作数来完成释放并返回的效果:

```asm
ret     optional-value
; 类似
EIP=SS:ESP
ESP=ESP + optional-value
```

局部变量的处理，通过使用 enter 和 leave 指令来完成:

enter 指令的格式为:

```asm
enter   bytes,level

```

level 用于高级语言中表示栈的嵌套层次


```asm
enter   XX,0
; 等价于
push    EBP 
mov     EBP,ESP
sub     ESP,XX
```

注意上面的 `sub ESP,XX`，前面提到栈是往低地址进行增长的，这里的减就是这个意思。


leave 指令的执行类似:

```asm
mov     ESP,EBP
pop     EBP
```

注意这里是将 EBP 赋值给了 ESP，而 EBP 的内容是在进入被调用过程后立即保存的 ESP 的值。

一般的过程调用模板类似，当然这是由被调用函数释放参数的过程:

```asm
proc-name:
    enter   XX,0
    ;procedure body
    leave
    ret     YY
```

如果过程需要使用到局部变量，那么 XX 将是一个非零的值。YY 目的是释放传入的参数。

## 和 C 语言相互调用

本书的 C 编译成汇编的例子在实际操作中可能因为 gcc 版本的差异，导致汇编结果不同。而且汇编的结果显示:

C 代码:

```c
int test(int x, int y, int z) {
    return x + y + z;
}

int main(void) {
    int x = 25, y = 70;
    int value;
    value = test(x, y, 5);
}
```

的汇编结果为，使用 `gcc -S -masm=intel test.c`:

```asm
	.file	"test.c"
	.intel_syntax noprefix
	.text
	.globl	test
	.type	test, @function
test:
.LFB0:
	.cfi_startproc
	push	rbp
	.cfi_def_cfa_offset 16
	.cfi_offset 6, -16
	mov	rbp, rsp
	.cfi_def_cfa_register 6
	mov	DWORD PTR -4[rbp], edi
	mov	DWORD PTR -8[rbp], esi
	mov	DWORD PTR -12[rbp], edx
	mov	edx, DWORD PTR -4[rbp]
	mov	eax, DWORD PTR -8[rbp]
	add	edx, eax
	mov	eax, DWORD PTR -12[rbp]
	add	eax, edx
	pop	rbp
	.cfi_def_cfa 7, 8
	ret
	.cfi_endproc
.LFE0:
	.size	test, .-test
	.globl	main
	.type	main, @function
main:
.LFB1:
	.cfi_startproc
	push	rbp
	.cfi_def_cfa_offset 16
	.cfi_offset 6, -16
	mov	rbp, rsp
	.cfi_def_cfa_register 6
	sub	rsp, 16
	mov	DWORD PTR -12[rbp], 25
	mov	DWORD PTR -8[rbp], 70
	mov	ecx, DWORD PTR -8[rbp]
	mov	eax, DWORD PTR -12[rbp]
	mov	edx, 5
	mov	esi, ecx
	mov	edi, eax
	call	test
	mov	DWORD PTR -4[rbp], eax
	mov	eax, 0
	leave
	.cfi_def_cfa 7, 8
	ret
	.cfi_endproc
.LFE1:
	.size	main, .-main
	.ident	"GCC: (Ubuntu 7.3.0-27ubuntu1~18.04) 7.3.0"
	.section	.note.GNU-stack,"",@progbits
```

可以看到并没有使用栈进行传参，而是使用的寄存器，所以问题在就在如果代码是 C 和汇编进行的混编，那么汇编的部分如何知道 C 语言使用的是哪几个寄存器进行的传参？后续看到的再进行补充