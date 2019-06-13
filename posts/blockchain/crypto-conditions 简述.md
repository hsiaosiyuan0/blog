# crypto-conditions 简述

> 下文将 crypto-conditions 简称为 cc
> cc 的详细的文档描述见 [ietf](https://tools.ietf.org/html/draft-thomas-crypto-conditions-04)

在现有的 public-key 这样的签名策略下，消息的传递过程如下:
1. 消息发送方 A 先将需要发送给消息接受方 B 的消息 M 进行摘要 `H = hash(M)`
2. A 用自己的私钥对摘要进行加密得到 AEH (A's encrypted hash 即 signature)
3. A 将要发送的消息 M 以及签名 AEH 发送给 B
4. B 接受到 M 后，对 M 进行摘要得到 BH
5. B 使用 A 的公钥对 AEH 进行解密，得到 AH
6. B 通过判断 `BH == AH` 是否成立来确定消息是否来自于 A

可以看到在 public-key 策略下，对一个消息的合法性的校验，发送方被限制成了单个实体 (one keypair)、单个条件 (签名匹配)

而 cc，则提供一个将现有加密验证算法进行条件组合的功能，比如上面的例子是 A 给 B 发送了消息，B 希望验证这个消息是 A 发送的。通过 cc，可以实现 A、C、D 一起给 B 发送了一个消息，B 可以验证 A、C、D 一起发送的，又或者 A、C、D 一起给 B 发送了一个消息，同时告诉 B，它们之间只要确定两个人，就可以证明消息的正确性，那么当 B 验证时，只要确保三人之间通过两人即可。

在 chaindb 的关于 cc 的[文档](https://docs.bigchaindb.com/projects/server/en/v0.8.2/data-models/crypto-conditions.html)中，有这样的例子：

```js
{
    "cid": "<condition index>",
    "condition": {
        "details": {
            "bitmask": 41,
            "subfulfillments": [
                {
                    "bitmask": 32,
                    "public_key": "<new owner 1 public key>",
                    "signature": null,
                    "type": "fulfillment",
                    "type_id": 4,
                    "weight": 1
                },
                {
                    "bitmask": 32,
                    "public_key": "<new owner 2 public key>",
                    "signature": null,
                    "type": "fulfillment",
                    "type_id": 4,
                    "weight": 1
                }
            ],
            "threshold": 2,
            "type": "fulfillment",
            "type_id": 2
        },
        "uri": "cc:2:29:ytNK3X6-bZsbF-nCGDTuopUIMi1HCyCkyPewm6oLI3o:206"},
        "owners_after": [
            "owner 1 public key>",
            "owner 2 public key>"
        ]
}
```

这里条件被划分为两个子条件，包含在 `subfulfillments`  中，`threshold` 为 2，表示需要两个子条件同时满足。

在 cc 的文档中有描述到，[sec 4.3](https://tools.ietf.org/html/draft-thomas-crypto-conditions-04#section-4.3)：

>  Crypto-conditions elegantly support weighted multi-signatures and
>  multi-level signatures.  A threshold condition has a number of
>  subconditions, and a target threshold.  Each subcondition can be a
>  signature or another threshold condition.  This provides flexibility
>  in forming complex conditions.
>
>  For example, consider a threshold condition that consists of two
>  subconditions, one each from Wayne and Alf. Alf's condition can be a
>  signature condition while Wayne's condition is a threshold condition,
>  requiring both Claude and Dan to sign for him.
>
>  Multi-level signatures allow more complex relationships than simple
>  M-of-N signing.  For example, a weighted condition can support an
>  arrangement of subconditions such as, "Either Ron, Mac, and Ped must
>  approve; or Smithers must approve."

就是条件理论上是支持被无限的划分为子条件的，那么在验证的时候，势必需要一个递归的程序，所以文档中还包含了 `cost` 的概念，因为每个条件的最终表现形态 (atom) 还是利用的已有的加密算法，比如 hash，rsa 等等，那么对每个已有的加密算法，都指定一个固定的 cost，而当条件制定方在制定自己的条件时，同时也将给出其中包含的所有 atom 元素的 cost 加法结果。当然校验方也不会仅仅认定条件方给出的 cost 值，不过可以作为一个预先的判断。

cost 的目的是，上文说道在校验时势必有一个递归的程序，那么如果接受任意嵌套的条件的话，比如会受到恶意攻击，比如构造一个足够深入的条件，导致校验方在校验条件时花费过多的资源，甚至宕机。

总的来说，cc 并没有提供或者创新一个新的加密算法，只是提供一个将现有加密算法进行一个条件组装，并对组装后的条件如何验证进行描述的一套机制。

参考 chaindb 的实现，至少在 js driver 中，虽然利用了 cc，不过也只是支持了 cc 中单个扁平条件下的 `ED25519-SHA256`，换句话说，和现有的 public-key 机制没有任何区别。

以使用 neo 搭建私有链的经验来看 [搭建私有链 - 第 5 节](http://docs.neo.org/zh-cn/network/private-chain/private-chain.html)，多方签名是需要多方进行配合的，比如在 neo wallet 中会让你将一个账号的签名结果拿出来给到另一个钱包账号再进行签名，在 chaindb 中没有看到提供这样的手段。

最初认为 cc 只需要简单的了解下，但是在这几天对 chaindb 的逐步了解中，会发现这是其中的重要一环。

chaindb 的构架

```
chaindb-core
   +   ^
   |   |
   v   +
 tendermint
```

可以看到，core 是基于 tendermint 之上的，因为 tendermint 将分布式以及共识的任务都完成了，准确的说是分布式完成，以及共识接口的完成，具体的共识细节，则需要由位于他上层的应用来实现，比如这里的 core。

那么现在很明显，各个节点之间，需要就什么来达成共识? 对于分布式记账系统而言，无非就是交易 (tx)，那么共识的内容无非也就是验证交易的合法性。交易的合法性除了包括简单的交易格式是否正确，是否双花等等，其中重要的一环就是交易是否由 owner(s) 授权，这就是 cc 所涉及的部分。

所以接下来，将会新的深入的角度，通过分析 [five-bells-condition](https://github.com/interledgerjs/five-bells-condition) 的代码来次深入的学习 cc。

`five-bells-condition` 是 cc 的 js 实现。 