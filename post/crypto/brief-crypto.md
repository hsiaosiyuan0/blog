# 加密算法调研

需求需要对数据进行加解密，所以需要对一些常见加密算法做一些调研。

## 对称加密

对称加密 [Symmetric-key algorithms](https://en.wikipedia.org/wiki/Symmetric-key_algorithm) 有如下几个特点：

1. 使用相同的密匙进行加解密
2. 加解密速度相比非对称加密要快
3. 对 plaintext 的大小理论上没有限制
4. 加密后的密文大小的增幅不大

## 非对称加密

非对称加密 [Public-key cryptography, or asymmetric cryptography](https://en.wikipedia.org/wiki/Public-key_cryptography) 有如下几个特点

1. 使用一个公私匙对进行加解密
2. 加密速度相比对称加密要慢很多
2. 在特定情况下，对 plaintext 的大小有限制
3. 加密后的密文大小的增幅很大

常见的非对称加密算法有：

1. RSA (HTTPS 中使用)
2. ECDSA ([Bitcoin 中使用](https://en.bitcoin.it/wiki/How_bitcoin_works))

RSA 和 ECDSA 的比较可以参考 [ECDSA and RSA](https://equaleyes.com/blog/2018/04/06/ecdsa-and-rsa-algorithms/)，简单的来说 ECDSA 有如下几个优点

1. 在与 RSA 达到相同加密程度下的 key 尺寸更小 见 [Elliptic_Curve_Cryptography](https://wiki.openssl.org/index.php/Elliptic_Curve_Cryptography)
2. 在与 RSA 达到相同加密程度下的 key 生成更快
3. 加解密比 RSA 快点

_RSA 的加密程度与 key 的大小成正比。_


## 几个引用

### ref1 

[RSA maximum bytes to encrypt, comparison to AES in terms of security?
](https://security.stackexchange.com/questions/33434/rsa-maximum-bytes-to-encrypt-comparison-to-aes-in-terms-of-security#answer-33445)

主要说明非对称加密算法之一的 RSA 在某些情况下对 plaintext 的大小是有限制的。

另外说明了非对称加密的通常使用方式是做 [Enveloped Encryption](https://en.wikipedia.org/wiki/Public-key_cryptography#Enveloped_Public_Key_Encryption)

### ref2

[Why is asymmetric cryptography bad for huge data](https://crypto.stackexchange.com/questions/5782/why-is-asymmetric-cryptography-bad-for-huge-data#answer-5790)

主要说明非对称加密会消耗更对的空间来存储密文，比明文高出 49%。

相比非对称加密更慢消耗更多的性能，这点在移动设备上应该更为突出。

其中的一条补充应该是对 ref1 中:

> the maximum size of data which can be encrypted with RSA is 245 bytes. No more.

的补充，所以我感觉用 “特性情况” 下对 plaintext 的大小有限制这样来表述比较准确。

另一条补充强调了任何的 public-key encryption 都会导致密文大小变大。

## 小结

所以为了达到一个性能和安全性通用的程度，我们还是应该采取常见的 Enveloped Encryption 方式。

为了达到贴合 Bitcoin 的目的，可以使用 ECDSA 配合 AES 来对数据加密，具体的加密步骤如下：

1. 随机生成密匙 AK 用于 AES 加密
2. 对数据 Data 使用 AK 进行 AES 加密得到 AES(Data)
3. 使用 ECDSA 公钥对 AK 进行加密得到 ECDSA(AK)
4. 将 ECDSA(AK) 和 AES(Data) 写入文件，即为加密文件

对于每个文件的加密，都执行上述步骤，即每次的 AK 不同。

具体的解密步骤如下：

1. 打开加密文件得到数据 ECDSA(AK) 和 AES(Data)
2. 使用对应的 ECDSA 私钥解密 ECDSA(AK) 得到 AK
3. 使用 AK 进行 AES 解密 AES(Data) 得到 Data
4. 将 Data 写入文件，即为原始文件

这样有几个好处：

1. 利用了非对称加密的特性: 速度快，密文增幅小
2. 密文仅自己可以见，因为加密时使用的公钥进行的加密

上述步骤不能直接使用在数据需要分享的情况下，因为数据使用了公钥进行加密，解密时需要对应的私钥。

未来需要增加分享功能时，我们可提供功能，使得用户可以用他所期望的数据接收方的公钥、来使用上述步骤加密数据，数据接收方得到数据后，按上述的步骤进行解密即可。

