/**
 * 把列印庫複製到 lib/。試算表庫若還沒有，只在這一步下載一次。
 * 網頁打開之後只讀 lib/，不會再連到其他網站。
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const PROJ = __dirname;
const LIB = path.join(PROJ, "lib");
const niimSrc = path.join(PROJ, "node_modules", "@mmote", "niimbluelib", "dist", "umd", "niimbluelib.min.js");
const xlsxDest = path.join(LIB, "xlsx.full.min.js");
const xlsxUrl = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";

function get(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(get(new URL(res.headers.location, url).href, dest));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error("HTTP " + res.statusCode));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(niimSrc)) {
    console.error("找不到 niimbluelib。請先在這個資料夾執行 npm install。");
    process.exit(1);
  }
  fs.mkdirSync(LIB, { recursive: true });
  const stale = path.join(PROJ, "public", "lib");
  if (fs.existsSync(stale)) {
    fs.rmSync(stale, { recursive: true, force: true });
    console.log("已移除重複的 public/lib");
  }
  fs.copyFileSync(niimSrc, path.join(LIB, "niimbluelib.min.js"));
  console.log("已複製 lib/niimbluelib.min.js");
  if (!fs.existsSync(xlsxDest)) {
    console.log("下載試算表程式庫（只在準備檔案時下載一次）...");
    await get(xlsxUrl, xlsxDest);
    console.log("已下載 lib/xlsx.full.min.js");
  } else {
    console.log("lib/xlsx.full.min.js 已存在");
  }
  console.log("完成。網頁執行時只使用 lib/ 裡的檔案。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
