## Logseq Banners plugin — fork by [@stdword](https://github.com/stdword)
Enliven your Logseq Workspace with gorgeous, custom, Notion style page banners

<img width="1177" src="https://github.com/stdword/logseq-banners-plugin/assets/1984175/e7fe67fc-36cf-45d2-92e6-d07f3fe145c7">
<img width="1181" src="https://github.com/stdword/logseq-banners-plugin/assets/1984175/6e7a39ef-e280-4f30-b776-e6d86b217c0f">

## Features
* Set banner image via page props
* Automatically find banner image based on page name
* 📅 Calendar widget (via `Block calendar` plugin)
* 💬 Random quote widget

## Installation
1. Enable «Developer mode» in «...» → Settings → Advanced
2. Download the latest plugin release in a raw .zip archive from [here](https://github.com/stdword/logseq-banners-plugin/releases/latest) and unzip it
3. Go to the «...» → Plugins, click «Load unpacked plugin» and point to the unzipped plugin
⚠️ The important point here is: every new plugin release should be updated manually

## Configuration
* Configure a default banners' images and icons in "Settings → Plugins → Banners"
* Customize the banner image on certain page via the page props:
    * via any URL:
       * `banner:: https://wallpaperaccess.com/full/1146672.jpg`
       * `banner:: "https://wallpaperaccess.com/full/1146672.jpg"` — wrap with doublequotes to avoid Logseq url preview
    * via Unsplash API:
       * `banner:: https://source.unsplash.com/featured/1600x900` — random featured
       * `banner:: https://source.unsplash.com/1600x900/daily` — photo of the day
       * `banner:: https://source.unsplash.com/featured/1600x900?diary,coffee`
    * via local assets (just insert an image to Logseq):
       * `banner:: ../assets/image_1656373162335_0.png`
       * `banner:: image_1656373162335_0.png`
    * To hide banner image on certain pages use:
       * `banner:: false`
* Customize banner alignment to see the cropped part (default: 50%):
    * top: `banner-align:: 0%`
    * bottom: `banner-align:: 100%`

### Calendar widget setup
* Install "Block Calendar" plugin from Logseq Marketplace
* Go to installed plugin settings "Settings → Plugins → Block Calendar"
* Set "Always render" to `#banner-widgets-calendar` banner placeholder
![CleanShot 2023-12-04 at 04 22 11@2x](https://github.com/stdword/logseq-banners-plugin/assets/1984175/500934c7-ea08-472a-a7ed-4161a73ab9ae)

## Credits
- This plugin was originally created by [@sawhney17](https://github.com/sawhney17) and extended by [@yoyurec](https://github.com/yoyurec)
