# 正式素材需求

目前所有CSS角色、家具符號與場景都是原型。新增圖檔置 `src/assets/`，命名 `角色或場景-物件-狀態.webp`，所有文字保持DOM。透明PNG/WebP優先，小圖可SVG，不熱連結或直接使用無授權課本圖。

|素材|用途與尺寸|透明與圖層|錨點與熱區|狀態及格式|
|---|---|---|---|---|
|anan/zhe/mi/hao|學生全身512×768|透明，層30腳底y排序|底部中央，至少48px熱區|idle/talk/raise-hand/think/happy/concern，WebP|
|teacher|老師全身512×768|透明，層30|底部中央，至少48px|idle/talk/guide，WebP|
|classroom-wall|後牆1600×800|不透明，層0|上中，無熱區|靜態WebP|
|classroom-floor|8×4格地板1600×800|透明邊，層10|場景中央，格點映射|靜態WebP|
|shelf-idle|書櫃256×320|透明，層20|格中心投影到底部，整格熱區|idle/selected/drag/invalid，WebP|
|table-idle|桌椅組384×256|透明，層20|格中心，至少48px|同上，不改邏輯占格，WebP|
|mat-idle|地墊384×192|透明，層15|格中心，至少48px|selected/drag，WebP|
|meeting-room|班會場景1600×1000|不透明無角色，層0|中央，黑板文字另渲染|靜態WebP|
|lectern|講桌320×320|透明，層25|底部中央|靜態WebP|
|campus-map|校園1600×1000|不透明，層0|中央，無文字|靜態WebP|
|station-clean/traffic/library/council|四站建物400×320|透明，層20|底部中央，至少64px|selected/complete，WebP|
|radar/detective/note|三功能圖示96×96|透明，UI層50|中心，不獨立互動|SVG|
|face-happy/neutral/sad|回饋表情96×96|透明，UI層50|中心，48px|SVG|
|sfx-tap/success/retry/transition|回饋0.1–1秒|不適用|使用者手勢後播放|OGG或MP3，提供靜音|
|voice-line-*|角色台詞|不適用|不得取代文字|授權錄音或語音，與data對應|

建議35度等角2.5D，兒童頭身1:3、老師1:4。單張盡量300KB內，首屏圖片預算1.5MB內；加入後實測。圖層是後續規畫，不宣稱現有CSS都已採用。
