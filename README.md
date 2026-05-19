# BlyBly

#### 阻挡不感兴趣的内容

#### 设置屏蔽规则，打开过滤，心情美美哒😊 ✨

<img width="1231" height="684" alt="image" src="https://github.com/user-attachments/assets/9ce0a326-0d85-498c-9c80-dab2dad7ba7d" />

#### 支持快捷添加
> <img width="1212" height="324" alt="image" src="https://github.com/user-attachments/assets/4c97cbf5-3cc0-43ab-b46c-2188b7dae27f" />

### 其它功能

- [新周必，新分区浏览页 展示 v0.4.0 ](docs/features/v0.4.0周必，分区页.md)
- [新推荐页 展示 v0.2.0 ](docs/features/v0.2.0新版本推荐页.md)


### 安装
#### 插件适用chrome/Edge等Chromium系浏览器，需要手动加载文件夹
1. 请先下载并解压 [extension.rar](https://github.com/sugarbomb/BlyBly--morefilter/releases)
<img width="800" height="600" alt="PixPin_2026-02-03_10-45-09" src="https://github.com/user-attachments/assets/81bc81ea-86e4-4db4-a91f-e942b00a7715" />

2. 开发者模式打开
<img width="800" height="600" alt="PixPin_2026-02-03_08-32-56" src="https://github.com/user-attachments/assets/cf4a5339-57cc-4657-be10-c5d3c2686db9" />
<img width="800" height="400" alt="PixPin_2026-02-03_10-20-22" src="https://github.com/user-attachments/assets/06e6ce1c-a12c-4b86-bd3f-3a5148d1de82" />

### 升级

1. 文件解压
2. 覆盖旧文件夹内的文件，选择全部替换
3. 刷新插件
<img width="500" height="299" alt="image" src="https://github.com/user-attachments/assets/32a796f9-84fa-49a0-9d87-0d756c8bf875" />

## 本项目为学习交流目的， 所有赞助以及链接均保存自[BewlyBewly](https://github.com/BewlyBewly/BewlyBewly)  侵删。

## 以下为原项目介绍：

English | [官话 - 简体中文](README-cmn_CN.md) | [官話 - 繁體中文](README-cmn_TW.md) | [廣東話](README-jyut.md)

<p align="center" style="margin-bottom: 0px !important;">
<img width="300" alt="BewlyBewly icon" src="https://cdn.jsdelivr.net/gh/BewlyBewly/Imgs/logos/bewlybewly-vtuber-logo.png"><br/>
</p>

<p align="center">Just make a few small changes to your Bilibili homepage.</p>

<!-- ![min1](https://github.com/hakadao/BewlyBewly/assets/33394391/951f9e2a-d0e1-452c-83a9-dc6d85c4d441)
![min2](https://github.com/hakadao/BewlyBewly/assets/33394391/3e75dd20-f60b-4645-b434-23a24c72959c) -->

## 👋 Introduction

> [!IMPORTANT]
> BewlyBewly mainly focuses on page adjustments and optimization rather than improving functionally and efficiency.
>
> The dark mode will only be adapted to commonly used pages due to its efficiency and maintenance difficulty, while less
> frequently used pages will not to be adapted.

> [!CAUTION]
> [BLBewly](https://apps.apple.com/us/app/blbewly/id6742200021) is a free BewlyBewly extension on Safari. We thank [𝗦𝘁𝗲𝘃𝗲 𝕏](https://x.com/st7evechou) for their help with the free publication of the app to Safari.
> However, issues encountered with the Safari version are outside of our maintenance scope,
> and we are not considering Safari maintenance.

> [!CAUTION]
> If you are installing this extension, your browser will probably say that it can read your browser history.
>
> This is because BewlyBewly uses the ["tabs" permission](https://developer.chrome.com/docs/extensions/reference/api/tabs), which can also be used to read each tab, allowing it to know the browsing history, but it is not utilized here.
>
> **Some browsers will mention the worst-case scenario and the highest risks, ensuring your safety after installation.**
> Additionally, this project is open source, so you can see what exactly what it does.

BewlyBewly is a browser extension for BiliBili that aims to enhance the user experience by redesigning the BiliBili UI.
The design is inspired by YouTube, Vision OS, and iOS, resulting in a more visually appealing and user-friendly interface.
This project uses the [vitesse-webext](https://github.com/antfu/vitesse-webext) template for development.
Without this template, it may not be possible to develop this project.

## ⬇️ Installation

### Online Installation

> [!TIP]
> Even in the Edge browser, we strongly recommend you install it in the Chrome web store.
> In terms of review speed, the Chrome web store is faster than Edge Add-ons.
>
> Additionally, the Chrome Web Store version of BewlyBewly will address and fix critical bugs more quickly.

- Chrome: <https://chromewebstore.google.com/detail/bewlybewly/bbbiejemhfihiooipfcjmjmbfdmobobp>
- Edge: <https://chromewebstore.google.com/detail/bewlybewly/bbbiejemhfihiooipfcjmjmbfdmobobp>
- Firefox: <https://addons.mozilla.org/en-US/firefox/addon/bewlybewly/>

#### To Firefox users

> [!WARNING]
> When using the Firefox browser, remember to enable all permissions shown in the picture below for normal use of BewlyBewly

<br/> <img width="655" alt="enable all bewlybewly permissions on firefox" src="https://github.com/hakadao/BewlyBewly/assets/33394391/9566aed8-040a-4435-a2ec-c61117f8e429">

### Local Installation

[CI](https://github.com/hakadao/BewlyBewly/actions): Automatically build with the latest code

[Releases](https://github.com/hakadao/BewlyBewly/releases): Stable version

#### Edge & Chrome (RECOMMENDED)

> Ensure you installed [extension.zip](https://github.com/hakadao/BewlyBewly/releases) .

Opening the `edge://extensions` page in the Edge or `chrome://extensions` page in Chrome,
simply drag and drop the downloaded `extension.zip` file into the browser to complete the installation.

<details>
 <summary> Another installation method for Edge & Chrome </summary>

#### Edge

> Ensure you installed [extension.zip](https://github.com/hakadao/BewlyBewly/releases) and decompress this file.

1. Type in `edge://extensions/` in the address bar and press Enter
2. Turn on `Developer mode` then press `Load Unpacked` <br/> <img width="655" alt="image" src="https://user-images.githubusercontent.com/33394391/232246901-e3544c16-bde2-480d-b770-ca5242793963.png">
3. Load the decompressed extension folder in your browser

#### Chrome
>
> Ensure you installed [extension.zip](https://github.com/hakadao/BewlyBewly/releases) and decompress this file.

1. Type in `chrome://extensions/` in the address bar and press Enter
2. Turn on `Developer mode` then press `Load Unpacked` <br/> <img width="655" alt="Snipaste_2022-03-27_18-17-04" src="https://user-images.githubusercontent.com/33394391/160276882-13da0484-92c1-47dd-add8-7655c5c2bf1c.png">
3. Load the decompressed extension folder in your browser

</details>

## 🤝 Contribution & Build

See [CONTRIBUTING.md](docs/CONTRIBUTING.md)

### Contributors

[![Contributors](https://contrib.rocks/image?repo=hakadao/BewlyBewly)](https://github.com/BewlyBewly/BewlyBewly/graphs/contributors)

## ❤️ Credits

- [vitesse-webext](https://github.com/antfu/vitesse-webext) - The template used for this project
- [UserScripts/bilibiliHome](https://github.com/indefined/UserScripts/tree/master/bilibiliHome),
[bilibili-app-recommend](https://github.com/magicdawn/bilibili-app-recommend) - Reference source for obtaining the access key
- [Bilibili-Evolved](https://github.com/the1812/Bilibili-Evolved) - Partial implementation of functionalities
- [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)
