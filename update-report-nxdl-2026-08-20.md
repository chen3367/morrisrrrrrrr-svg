# nxdl 更新檢查報告（2026-08-20）

## 結論

nxdl 遠端 manifest 有更新，但目前沒有看到會影響網站資料庫內容的 JSON 資料變動。

- 遠端遊戲：新楓之谷：經典版
- 遠端 manifest 時間：2026-08-14 17:56:41 GMT+8
- 遠端 catalog 版本：1.14.2
- 目前網站資料版本：1.14.2
- 檢查範圍：catalog 與所有 JSON bundle

## 對網站的影響

目前不需要重建或更新怪物、道具、任務、地圖、技能資料。

原因：

- `json_*.bundle` 共 17 個檔案，新舊內容完全相同。
- 變動的是 catalog/hash 檔案，以及 manifest 指向的主程式、prefab、部分 spritesheet bundle。
- catalog 版本仍是 `1.14.2`，不應新增玩家端遊戲更新日誌。

## 確認到的資料層變動

### 未變動

以下資料來源未變動：

- 怪物 / 道具 / 任務 / 地圖 / 技能使用的 JSON bundle
- `catalog_1.14.2` 的版本號
- 網站目前使用的遊戲版本號

### 已變動

以下 catalog/hash 檔案內容有變：

- `catalog.bin`
- `catalog.hash`
- `catalog_json.bin`
- `catalog_json.hash`
- `catalog_1.14.2.bin`
- `catalog_1.14.2.hash`
- `json_catalog_1.14.2.bin`
- `json_catalog_1.14.2.hash`

## 遠端 manifest 指向的新資產檔

新增或替換的資產 bundle：

- `prefab_92f0a4d0c9ccb93c818b21f6ff24ed5f.bundle`
- `spritesheet_1023f33d7803aa6ec6ec9c49277ec3bf.bundle`
- `spritesheet_1b3bc95af88aeb7d127adb2ba1f9f70e.bundle`
- `spritesheet_abb78745197801a5edf2bc22ce6b7ea2.bundle`
- `spritesheet_ef97f1e56f7745b18b0753d33f4faea9.bundle`

被替換掉的舊資產 bundle：

- `prefab_92f0a4d0c9ccb93cc2f3db62ee9bda29.bundle`
- `spritesheet_1023f33d7803aa6e0a16eb625147c4c5.bundle`
- `spritesheet_1b3bc95af88aeb7db297c8d287cb7b8b.bundle`
- `spritesheet_abb78745197801a5f9b510c97201b6d7.bundle`
- `spritesheet_ef97f1e56f7745b12ee8bc7eb515e14b.bundle`

## 主程式層變動

遠端 manifest 顯示以下主程式相關檔案有變：

- `GameAssembly.dll`
- `global-metadata.dat`

這類變動可能代表程式邏輯或編譯內容更新，但目前沒有直接反映到網站可解析的 WZJSON 資料。

## 建議

這次先不要更新 GitHub Pages，也不要新增遊戲更新日誌。

若接下來要確認素材差異，可以只下載變動的 prefab / spritesheet bundle 做圖示與 prefab 差異檢查；資料庫內容則可等 catalog 版本或 JSON bundle 內容真的變動時再重建網站。
