// ── NiimBlueLib（同目錄的本地檔，執行時不連到其他網站）────────────────────────
if (typeof niimbluelib === "undefined") {
  const missing = document.getElementById("libStatus");
  if (missing) missing.textContent = "找不到 lib/niimbluelib.min.js，無法連線列印。";
  throw new Error("niimbluelib missing");
}
const { Utils, RequestCommandId, ResponseCommandId, NiimbotBluetoothClient, ImageEncoder, SoundSettingsItemType } = niimbluelib;

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const btnConnect      = $("btnConnect");
const btnDisconnect   = $("btnDisconnect");
const btnFetchInfo    = $("btnFetchInfo");
const btnPrint        = $("btnPrint");
const btnClearLog     = $("btnClearLog");
const btnClearImage   = $("btnClearImage");
const btnSetShutdown  = $("btnSetShutdown");
const btnSoundBle     = $("btnSoundBle");
const btnSoundPower   = $("btnSoundPower");
const btnCalibrate    = $("btnCalibrate");
const btnReset        = $("btnReset");
const btnSnapHeight   = $("btnSnapHeight");
const btnResetProcess = $("btnResetProcess");
const btnLogAll       = $("btnLogAll");
const btnLogStatus    = $("btnLogStatus");
const modeThreshold   = $("modeThreshold");
const modeDither      = $("modeDither");
const statusEl        = $("status");
const infoGrid        = $("infoGrid");
const hbBar           = $("hbBar");
const sectionSettings = $("sectionSettings");
const logEl           = $("log");
const canvas          = $("preview");
const bwCanvas        = $("bwPreview");
const labelTextEl     = $("labelText");
const fontFamilyEl    = $("fontFamily");
const fontSizeEl      = $("fontSize");
const lineHeightEl    = $("lineHeight");
const toggleBold      = $("toggleBold");
const toggleItalic    = $("toggleItalic");
const toggleInvert    = $("toggleInvert");
const toggleBorder    = $("toggleBorder");
const alignLeft       = $("alignLeft");
const alignCenter     = $("alignCenter");
const alignRight      = $("alignRight");
const canvasWidthEl   = $("canvasWidth");
const canvasHeightEl  = $("canvasHeight");
const heightHint      = $("heightHint");
const imageUpload     = $("imageUpload");
const imageFitEl      = $("imageFit");
const printDirEl      = $("printDirection");
const labelTypeEl     = $("labelType");
const printSpeedEl    = $("printSpeed");
const quantityEl      = $("quantity");
const densityEl       = $("density");
const densityValEl    = $("densityVal");
const autoShutdownEl  = $("autoShutdown");
const thresholdEl     = $("threshold");
const brightnessEl    = $("brightness");
const contrastEl      = $("contrast");
const progressWrap    = $("progressWrap");
const progressFg      = $("progressFg");
const progressText    = $("progressText");
const presetSizeEl    = $("presetSize");
const rotBtns         = [$("rot0"), $("rot90"), $("rot180"), $("rot270")];
const btnExportDesign = $("btnExportDesign");
const btnExportBW     = $("btnExportBW");
const presetNameEl    = $("presetName");
const presetSelect    = $("presetSelect");
const btnSavePreset   = $("btnSavePreset");
const btnLoadPreset   = $("btnLoadPreset");
const btnDeletePreset = $("btnDeletePreset");
const batchSrcPaste   = $("batchSrcPaste");
const batchSrcFile    = $("batchSrcFile");
const batchFmtCSV     = $("batchFmtCSV");
const batchFmtDelim   = $("batchFmtDelim");
const batchFmtJSON    = $("batchFmtJSON");
const batchDelimField = $("batchDelimField");
const batchDelimInput = $("batchDelimiter");
const batchPasteArea  = $("batchPasteArea");
const batchFileArea   = $("batchFileArea");
const batchPasteText  = $("batchPasteText");
const batchFileInput  = $("batchFile");
const btnParse        = $("btnParse");
const batchParseInfo  = $("batchParseInfo");
const batchMapping    = $("batchMapping");
const batchTextCol    = $("batchTextCol");
const batchQtyCol     = $("batchQtyCol");
const batchSizeCol    = $("batchSizeCol");
const batchPreviewWrap = $("batchPreviewWrap");
const btnBatchPrint   = $("btnBatchPrint");
const batchPrintCount = $("batchPrintCount");
const btnBatchStop    = $("btnBatchStop");
const batchProgWrap   = $("batchProgWrap");
const batchProgFg     = $("batchProgFg");
const batchProgText   = $("batchProgText");

// ── State ─────────────────────────────────────────────────────────────────────
let client       = null;
let overlayImage = null;   // uploaded HTMLImageElement
let imageObjUrl  = null;   // for URL.revokeObjectURL
let isBold       = true;
let isItalic     = false;
let isInvert     = false;
let isBorder     = false;
let textAlign    = "center";
let useDither    = false;
let logRaw       = true;   // show raw packet hex or status-only
let textRotation = 0;

// ── Debounced repaint ─────────────────────────────────────────────────────────
let repaintTimer = null;
function scheduleRepaint() {
  clearTimeout(repaintTimer);
  repaintTimer = setTimeout(repaintAll, 60);
}

// ── Logger ────────────────────────────────────────────────────────────────────
const PACKET_RE = /^[<>]{2} /;
function log(msg, isPacket = false) {
  if (isPacket && !logRaw) return;
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

btnLogAll.onclick = () => { logRaw = true; btnLogAll.classList.add("active"); btnLogStatus.classList.remove("active"); };
btnLogStatus.onclick = () => { logRaw = false; btnLogStatus.classList.add("active"); btnLogAll.classList.remove("active"); };
btnClearLog.onclick = () => { logEl.textContent = ""; };

// ── Sliders display ───────────────────────────────────────────────────────────
const sliders = [
  [densityEl,    densityValEl,    v => v],
  [thresholdEl,  $("thresholdVal"),  v => v],
  [brightnessEl, $("brightnessVal"), v => (v > 0 ? "+" : "") + v],
  [contrastEl,   $("contrastVal"),   v => (v > 0 ? "+" : "") + v],
];
sliders.forEach(([el, display, fmt]) => {
  display.textContent = fmt(el.value);
  el.addEventListener("input", () => { display.textContent = fmt(el.value); scheduleRepaint(); });
});

btnResetProcess.onclick = () => {
  thresholdEl.value  = 128; brightnessEl.value = 0; contrastEl.value = 0;
  sliders.forEach(([el, d, fmt]) => { d.textContent = fmt(el.value); });
  scheduleRepaint();
};

// ── Mode toggle ───────────────────────────────────────────────────────────────
modeThreshold.onclick = () => { useDither = false; modeThreshold.classList.add("active"); modeDither.classList.remove("active"); scheduleRepaint(); };
modeDither.onclick    = () => { useDither = true;  modeDither.classList.add("active"); modeThreshold.classList.remove("active"); scheduleRepaint(); };

// ── Style toggles ─────────────────────────────────────────────────────────────
const styleToggles = [
  [toggleBold,   () => { isBold   = !isBold;   toggleBold.classList.toggle("active", isBold); }],
  [toggleItalic, () => { isItalic = !isItalic; toggleItalic.classList.toggle("active", isItalic); }],
  [toggleInvert, () => { isInvert = !isInvert; toggleInvert.classList.toggle("active", isInvert); }],
  [toggleBorder, () => { isBorder = !isBorder; toggleBorder.classList.toggle("active", isBorder); }],
];
styleToggles.forEach(([btn, fn]) => btn.addEventListener("click", () => { fn(); scheduleRepaint(); }));

[alignLeft, alignCenter, alignRight].forEach((btn, i) => {
  btn.addEventListener("click", () => {
    textAlign = ["left", "center", "right"][i];
    [alignLeft, alignCenter, alignRight].forEach((b, j) => b.classList.toggle("active", j === i));
    scheduleRepaint();
  });
});

rotBtns.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    textRotation = [0, 90, 180, 270][i];
    rotBtns.forEach((b, j) => b.classList.toggle("active", j === i));
    scheduleRepaint();
  });
});

// ── Height validation ─────────────────────────────────────────────────────────
canvasHeightEl.addEventListener("input", () => {
  heightHint.classList.toggle("show", parseInt(canvasHeightEl.value) % 8 !== 0);
  scheduleRepaint();
});

btnSnapHeight.onclick = () => {
  const h = parseInt(canvasHeightEl.value) || 120;
  canvasHeightEl.value = Math.min(192, Math.round(h / 8) * 8);
  heightHint.classList.remove("show");
  scheduleRepaint();
};

presetSizeEl.addEventListener("change", () => {
  const val = presetSizeEl.value; if (!val) return;
  const [pw, ph] = val.split(",").map(Number);
  canvasWidthEl.value = pw; canvasHeightEl.value = ph;
  heightHint.classList.toggle("show", ph % 8 !== 0);
  scheduleRepaint();
});

// ── Image upload ──────────────────────────────────────────────────────────────
imageUpload.addEventListener("change", () => {
  const file = imageUpload.files[0];
  if (!file) return;
  if (imageObjUrl) URL.revokeObjectURL(imageObjUrl);
  imageObjUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { overlayImage = img; scheduleRepaint(); };
  img.src = imageObjUrl;
});
btnClearImage.addEventListener("click", () => {
  overlayImage = null;
  imageUpload.value = "";
  if (imageObjUrl) { URL.revokeObjectURL(imageObjUrl); imageObjUrl = null; }
  scheduleRepaint();
});
imageFitEl.addEventListener("change", scheduleRepaint);

// Live repaint on text/font inputs
[labelTextEl, fontFamilyEl, fontSizeEl, lineHeightEl, canvasWidthEl].forEach(el => el.addEventListener("input", scheduleRepaint));

btnExportDesign.onclick = () => {
  const a = document.createElement("a"); a.download = "label-design.png";
  a.href = canvas.toDataURL("image/png"); a.click();
};
btnExportBW.onclick = () => {
  const a = document.createElement("a"); a.download = "label-bw.png";
  a.href = bwCanvas.toDataURL("image/png"); a.click();
};

// ── Draw design canvas ────────────────────────────────────────────────────────
function drawDesign() {
  const w = parseInt(canvasWidthEl.value) || 240;
  const h = parseInt(canvasHeightEl.value) || 120;
  canvas.width  = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  const bg  = isInvert ? "#000" : "#fff";
  const fg  = isInvert ? "#fff" : "#000";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  if (overlayImage) {
    ctx.save();
    const fit  = imageFitEl.value;
    const sw   = overlayImage.width, sh = overlayImage.height;
    let dx, dy, dw, dh;
    if (fit === "fill") {
      dx = 0; dy = 0; dw = w; dh = h;
    } else if (fit === "left") {
      const s = h / sh; dw = sw * s; dh = h; dx = 0; dy = 0;
    } else if (fit === "right") {
      const s = h / sh; dw = sw * s; dh = h; dx = w - dw; dy = 0;
    } else { // contain
      const s = Math.min(w / sw, h / sh); dw = sw * s; dh = sh * s;
      dx = (w - dw) / 2; dy = (h - dh) / 2;
    }
    ctx.drawImage(overlayImage, dx, dy, dw, dh);
    ctx.restore();
  }

  if (isBorder) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  const lines = (labelTextEl.value || "").split("\n");
  const visibleLines = lines.filter(Boolean);
  if (!visibleLines.length) return;

  const family      = fontFamilyEl.value || "sans-serif";
  const lhRatio     = parseFloat(lineHeightEl.value) || 1.2;
  const manualSize  = parseInt(fontSizeEl.value);
  const padding     = 8;
  const stylePrefix = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}`;
  // For 90°/270°, available text space swaps axes
  const rotated     = textRotation === 90 || textRotation === 270;
  const effW        = rotated ? h : w;
  const effH        = rotated ? w : h;

  let fontSize;
  if (manualSize > 0) {
    fontSize = manualSize;
  } else {
    fontSize = Math.floor((effH - padding * 2) / (visibleLines.length * lhRatio));
    fontSize = Math.min(fontSize, effH - padding * 2);
    ctx.font = `${stylePrefix}${fontSize}px ${family}`;
    const maxW = Math.max(...visibleLines.map(l => ctx.measureText(l).width));
    if (maxW > effW - padding * 2) fontSize = Math.floor(fontSize * (effW - padding * 2) / maxW);
    fontSize = Math.max(fontSize, 6);
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (textRotation) ctx.rotate(textRotation * Math.PI / 180);
  ctx.font         = `${stylePrefix}${fontSize}px ${family}`;
  ctx.fillStyle    = fg;
  ctx.textBaseline = "middle";
  ctx.textAlign    = textAlign;

  const lineH  = fontSize * lhRatio;
  const totalH = lineH * visibleLines.length;
  const startY = -totalH / 2 + lineH / 2;
  const xBase  = textAlign === "left"  ? -effW / 2 + padding :
                 textAlign === "right" ?  effW / 2 - padding : 0;

  visibleLines.forEach((line, i) => ctx.fillText(line, xBase, startY + i * lineH));
  ctx.restore();
}

// ── Image processing pipeline ─────────────────────────────────────────────────

/** Apply brightness and contrast to an ImageData (modifies in place). */
function applyBrightnessContrast(imageData, brightness, contrast) {
  const d = imageData.data;
  const factor = contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      v += brightness;                      // brightness
      v = factor * (v - 128) + 128;         // contrast
      d[i + c] = Math.max(0, Math.min(255, v));
    }
  }
}

/** Convert RGBA ImageData to a Float32 grayscale array. */
function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4;
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return gray;
}

/** Simple threshold: gray < t → black, else white. */
function applyThresholdToGray(gray, threshold) {
  for (let i = 0; i < gray.length; i++) {
    gray[i] = gray[i] < threshold ? 0 : 255;
  }
}

/** Floyd-Steinberg dithering on a grayscale Float32Array. */
function floydSteinberg(gray, width, height, threshold) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const old = gray[idx];
      const nw  = old < threshold ? 0 : 255;
      gray[idx]  = nw;
      const err  = old - nw;
      if (x + 1 < width)              gray[idx + 1]               += err * (7 / 16);
      if (y + 1 < height) {
        if (x > 0)                     gray[(y + 1) * width + x - 1] += err * (3 / 16);
                                       gray[(y + 1) * width + x]     += err * (5 / 16);
        if (x + 1 < width)             gray[(y + 1) * width + x + 1] += err * (1 / 16);
      }
    }
  }
}

/** Build a processed (B&W only) canvas from the design canvas. */
function buildProcessedCanvas() {
  const w = canvas.width, h = canvas.height;
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const ctx = off.getContext("2d");
  ctx.drawImage(canvas, 0, 0);

  const brightness = parseInt(brightnessEl.value);
  const contrast   = parseInt(contrastEl.value);
  const threshold  = parseInt(thresholdEl.value);

  const imageData = ctx.getImageData(0, 0, w, h);
  applyBrightnessContrast(imageData, brightness, contrast);

  const gray = toGrayscale(imageData);
  if (useDither) floydSteinberg(gray, w, h, threshold);
  else           applyThresholdToGray(gray, threshold);

  // Write B&W back to imageData
  const d = imageData.data;
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i] < 128 ? 0 : 255;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return off;
}

/** Update B&W preview canvas. */
function updateBWPreview() {
  const processed = buildProcessedCanvas();
  bwCanvas.width  = processed.width;
  bwCanvas.height = processed.height;
  bwCanvas.getContext("2d").drawImage(processed, 0, 0);
}

function repaintAll() {
  drawDesign();
  updateBWPreview();
}

// ── Info grid ─────────────────────────────────────────────────────────────────
const batteryPct    = { 0: "0%", 1: "25%", 2: "50%", 3: "75%", 4: "100%" };
const shutdownLabel = { 1: "15 分鐘", 2: "30 分鐘", 3: "45/60 分", 4: "60 分/永不" };

function showInfoCard(label, value) {
  const d = document.createElement("div");
  d.className = "info-card";
  const lbl = document.createElement("div");
  lbl.className = "lbl";
  lbl.textContent = label;
  const val = document.createElement("div");
  val.className = "val";
  val.textContent = value ?? "—";
  d.append(lbl, val);
  infoGrid.appendChild(d);
}

function updateMiniHint() {
  const hint = $("miniHint");
  if (!hint) return;
  hint.hidden = statusEl.classList.contains("connected");
}

// ── Client setup ──────────────────────────────────────────────────────────────
function setupClient() {
  if (client) { client.disconnect(); client = null; }
  client = new NiimbotBluetoothClient();

  client.on("packetsent",     e => log(`>> ${Utils.bufToHex(e.packet.toBytes())} (${RequestCommandId[e.packet.command]})`, true));
  client.on("packetreceived", e => log(`<< ${Utils.bufToHex(e.packet.toBytes())} (${ResponseCommandId[e.packet.command]})`, true));

  client.on("connect", () => {
    log("✅ 已連線");
    statusEl.textContent = "已連線"; statusEl.className = "connected";
    btnConnect.disabled = true; btnDisconnect.disabled = false;
    btnPrint.disabled = false; btnFetchInfo.disabled = false;
    sectionSettings.style.display = "";
    updateMiniHint();

    const meta = client.getModelMetadata?.();
    if (meta) {
      densityEl.min = meta.densityMin; densityEl.max = meta.densityMax;
      densityEl.value = meta.densityDefault; densityValEl.textContent = meta.densityDefault;
    }
  });

  client.on("disconnect", () => {
    log("🔌 已中斷連線");
    statusEl.textContent = "未連線"; statusEl.className = "";
    btnConnect.disabled = false; btnDisconnect.disabled = true;
    btnPrint.disabled = true; btnFetchInfo.disabled = true;
    infoGrid.style.display = "none"; hbBar.style.display = "none";
    sectionSettings.style.display = "none"; infoGrid.innerHTML = "";
    client = null;
    updateMiniHint();
  });

  client.on("printprogress", e => {
    const pct = Math.round((e.pagePrintProgress + e.pageFeedProgress) / 2);
    progressFg.style.width = pct + "%";
    progressText.textContent = `第 ${e.page}/${e.pagesTotal} 頁 · 列印 ${e.pagePrintProgress}% · 走紙 ${e.pageFeedProgress}%`;
    log(`進度: 第${e.page}/${e.pagesTotal} 頁 列印${e.pagePrintProgress}% 走紙${e.pageFeedProgress}%`);
  });

  client.on("heartbeat", e => {
    const d = e.data ?? e;
    hbBar.style.display = "";
    if (d.lidClosed !== undefined) {
      $("hbLid").className = `dot ${d.lidClosed ? "ok" : "bad"}`;
      $("hbLidTxt").textContent = d.lidClosed ? "蓋子 關" : "蓋子 開";
    }
    if (d.paperInserted !== undefined) {
      $("hbPaper").className = `dot ${d.paperInserted ? "ok" : "warn"}`;
      $("hbPaperTxt").textContent = d.paperInserted ? "紙張 有" : "紙張 無";
    }
    if (d.chargeLevel !== undefined) $("hbBattery").textContent = `🔋 ${batteryPct[d.chargeLevel] ?? d.chargeLevel}`;
    if (d.temp        !== undefined) $("hbTemp").textContent    = `🌡 ${d.temp}°C`;
  });
}

// ── Connect ───────────────────────────────────────────────────────────────────
btnConnect.onclick = async () => {
  if (!navigator.bluetooth) { alert("此瀏覽器不支援 Web Bluetooth。請用 Chrome 或 Edge。"); return; }
  setupClient();
  log("正在搜尋藍牙裝置...");
  try {
    await client.connect();
  } catch (e) {
    log(`❌ 連線失敗: ${e.message ?? e}`);
    client = null; statusEl.textContent = "未連線"; statusEl.className = "";
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    btnPrint.disabled = true;
    btnFetchInfo.disabled = true;
    updateMiniHint();
  }
};

btnDisconnect.onclick = () => { if (client) client.disconnect(); };

// ── Fetch info ────────────────────────────────────────────────────────────────
btnFetchInfo.onclick = async () => {
  if (!client) return;
  log("讀取裝置資訊...");
  try {
    const info = await client.fetchPrinterInfo();
    const meta = client.getModelMetadata?.();
    infoGrid.innerHTML = ""; infoGrid.style.display = "";
    showInfoCard("型號",      meta?.model ?? info.modelId);
    showInfoCard("DPI",       meta?.dpi);
    showInfoCard("印頭像素",  meta ? `${meta.printheadPixels}px` : undefined);
    showInfoCard("電量",      batteryPct[info.charge] ?? info.charge);
    showInfoCard("MAC",       info.mac);
    showInfoCard("序號",      info.serial);
    showInfoCard("韌體版本",  info.softwareVersion);
    showInfoCard("硬體版本",  info.hardwareVersion);
    showInfoCard("自動關機",  shutdownLabel[info.autoShutdownTime] ?? info.autoShutdownTime);
    showInfoCard("協定版本",  info.protocolVersion);
    if (info.autoShutdownTime) autoShutdownEl.value = info.autoShutdownTime;
    log("✅ 裝置資訊讀取完成");
  } catch (e) { log(`❌ 讀取失敗: ${e.message ?? e}`); }
};

// ── Device settings ───────────────────────────────────────────────────────────
btnSetShutdown.onclick = async () => {
  if (!client) return;
  const t = parseInt(autoShutdownEl.value);
  try { await client.abstraction.setAutoShutDownTime(t); log(`✅ 自動關機: ${shutdownLabel[t]}`); }
  catch (e) { log(`❌ 設定失敗: ${e.message ?? e}`); }
};

async function toggleSound(type, btn, label) {
  if (!client) return;
  try {
    const cur = await client.abstraction.isSoundEnabled(type);
    await client.abstraction.setSoundEnabled(type, !cur);
    btn.classList.toggle("active", !cur);
    log(`✅ ${label} 已${!cur ? "開啟" : "關閉"}`);
  } catch (e) { log(`❌ 聲音設定失敗: ${e.message ?? e}`); }
}
btnSoundBle.onclick   = () => toggleSound(SoundSettingsItemType?.BluetoothConnectionSound ?? 1, btnSoundBle,   "BLE 聲音");
btnSoundPower.onclick = () => toggleSound(SoundSettingsItemType?.PowerSound ?? 2,               btnSoundPower, "開機聲音");

btnCalibrate.onclick = async () => {
  if (!client || !confirm("確定執行標籤位置校準？機器會走紙約 15cm。")) return;
  try { await client.abstraction.labelPositioningCalibration(1); log("✅ 標籤校準完成"); }
  catch (e) { log(`❌ 校準失敗: ${e.message ?? e}`); }
};

btnReset.onclick = async () => {
  if (!client || !confirm("確定恢復出廠設定？此操作無法撤銷。")) return;
  try { await client.abstraction.printerReset(); log("✅ 已恢復出廠設定"); }
  catch (e) { log(`❌ 重置失敗: ${e.message ?? e}`); }
};

// ── Print ─────────────────────────────────────────────────────────────────────
btnPrint.onclick = async () => {
  if (!client) return;

  const h = parseInt(canvasHeightEl.value);
  if (h % 8 !== 0) {
    const snapped = Math.min(192, Math.round(h / 8) * 8);
    alert(`高度 ${h}px 不是 8 的倍數！\n建議改為 ${snapped}px`);
    return;
  }

  const direction = printDirEl.value;
  const quantity  = parseInt(quantityEl.value)  || 1;
  const density   = parseInt(densityEl.value);
  const labelType = parseInt(labelTypeEl.value);
  const speed     = parseInt(printSpeedEl.value);

  log(`開始列印 | 方向:${direction} 數量:${quantity} 深度:${density} 速度:${speed}`);

  // Use processed B&W canvas for encoding
  const processedCanvas = buildProcessedCanvas();

  let encoded;
  try {
    encoded = ImageEncoder.encodeCanvas(processedCanvas, direction);
  } catch (e) {
    log(`❌ 編碼失敗: ${e.message}`);
    alert(`圖像編碼失敗: ${e.message}`);
    return;
  }

  const printTaskName = client.getPrintTaskType?.() ?? "B1";
  log(`PrintTask: ${printTaskName}`);

  const printTask = client.abstraction.newPrintTask(printTaskName, {
    totalPages: quantity, density, labelType, speed,
    statusPollIntervalMs: 100, statusTimeoutMs: 8_000,
  });

  btnPrint.disabled = true;
  progressWrap.style.display = "block";
  progressFg.style.width = "0%";
  progressText.textContent = "準備中...";

  try {
    await printTask.printInit();
    await printTask.printPage(encoded, quantity);
    await printTask.waitForFinished();
    progressFg.style.width = "100%";
    progressText.textContent = "✅ 列印完成";
    log("✅ 列印完成");
  } catch (e) {
    progressText.textContent = `❌ ${e.message ?? e}`;
    log(`❌ 列印失敗: ${e.message ?? e}`);
    alert(`列印失敗: ${e.message ?? e}`);
  } finally {
    await printTask.printEnd();
    btnPrint.disabled = false;
    setTimeout(() => { progressWrap.style.display = "none"; }, 3000);
  }
};

// ── Batch print ───────────────────────────────────────────────────────────────
let parsedRows   = [];
let parsedCols   = [];
let batchFmt_    = 'csv';    // underscore avoids shadowing batchFmtCSV button ref
let batchSrc_    = 'paste';
let batchStopped = false;

[[batchSrcPaste, 'paste'], [batchSrcFile, 'file']].forEach(([btn, val]) =>
  btn.addEventListener('click', () => {
    batchSrc_ = val;
    batchSrcPaste.classList.toggle('active', val === 'paste');
    batchSrcFile.classList.toggle('active',  val === 'file');
    batchPasteArea.style.display = val === 'paste' ? '' : 'none';
    batchFileArea.style.display  = val === 'file'  ? '' : 'none';
  }));

[[batchFmtCSV, 'csv'], [batchFmtDelim, 'delim'], [batchFmtJSON, 'json']].forEach(([btn, val]) =>
  btn.addEventListener('click', () => {
    batchFmt_ = val;
    batchFmtCSV.classList.toggle('active',   val === 'csv');
    batchFmtDelim.classList.toggle('active', val === 'delim');
    batchFmtJSON.classList.toggle('active',  val === 'json');
    batchDelimField.style.display = val === 'delim' ? '' : 'none';
    batchPasteText.placeholder = val === 'json'
      ? '["Hello World","Test Label"]\n或\n[{"text":"Hello","qty":"2"},{"text":"World","qty":"1"}]'
      : val === 'delim' ? 'text|qty\nHello World|2\nTest Label|1'
      : 'text,qty\nHello World,2\nTest Label,1';
  }));

function splitCSVLine(line, d) {
  if (d !== ',') return line.split(d).map(v => v.trim());
  const res = []; let cur = '', inQ = false;
  for (let i = 0; i <= line.length; i++) {
    const ch = line[i];
    if (i === line.length || (ch === d && !inQ)) { res.push(cur.trim()); cur = ''; }
    else if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else cur += ch;
  }
  return res;
}

function parseTextInput(text, fmt, delim) {
  text = text.trim();
  if (!text) throw new Error('資料為空');
  if (fmt === 'json') {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('JSON 必須是 Array');
    if (!data.length) throw new Error('陣列為空');
    if (typeof data[0] === 'string') return { rows: data.map((s, i) => ({ '#': i + 1, text: s })), cols: ['#', 'text'] };
    return { rows: data, cols: Object.keys(data[0]) };
  }
  const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
  if (lines.length < 2) throw new Error('需要至少標題行 + 一行資料');
  const d = fmt === 'delim' ? (delim || '|') : ',';
  const cols = splitCSVLine(lines[0], d).map((h, i) => h || `欄${i + 1}`);
  const rows = lines.slice(1).map(line => {
    const vals = splitCSVLine(line, d);
    const obj = {}; cols.forEach((h, i) => { obj[h] = vals[i] ?? ''; }); return obj;
  });
  return { rows, cols };
}

function readFileAsText(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = e => res(e.target.result); fr.onerror = () => rej(new Error('讀取失敗'));
    fr.readAsText(file, 'UTF-8');
  });
}

function parseExcelBuffer(file) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS 未載入，請重新整理頁面');
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve({ rows, cols: rows.length ? Object.keys(rows[0]) : [] });
      } catch (err) { reject(err); }
    };
    fr.onerror = () => reject(new Error('讀取失敗')); fr.readAsArrayBuffer(file);
  });
}

function updateBatchSelects(cols) {
  const lower = cols.map(c => String(c).toLowerCase());
  [batchTextCol, batchQtyCol, batchSizeCol].forEach((sel, si) => {
    const prev = sel.value;
    sel.innerHTML = si === 0 ? '' : '<option value="">不使用</option>';
    cols.forEach(c => { const o = document.createElement('option'); o.value = o.textContent = c; sel.appendChild(o); });
    if (prev && cols.includes(prev)) sel.value = prev;
    else if (si === 0 && cols.length) sel.value = cols[0];
  });
  const textHint = ['text', 'name', '文字', 'label', '標籤', 'content'].find(k => lower.includes(k));
  if (textHint) batchTextCol.value = cols[lower.indexOf(textHint)];
  const qtyHint = ['qty', 'quantity', 'count', '數量', 'copies'].find(k => lower.includes(k));
  if (qtyHint) batchQtyCol.value = cols[lower.indexOf(qtyHint)];
}

function renderBatchPreview(rows, cols) {
  const show = rows.slice(0, 5);
  const extra = rows.length - show.length;
  const table = document.createElement("table");
  table.className = "batch-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  cols.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  show.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => {
      const td = document.createElement("td");
      const text = String(row[col] ?? "");
      td.textContent = text.substring(0, 30);
      td.title = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  if (extra > 0) {
    const tr = document.createElement("tr");
    tr.className = "more-row";
    const td = document.createElement("td");
    td.colSpan = cols.length;
    td.textContent = `… 還有 ${extra} 筆`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  batchPreviewWrap.replaceChildren(table);
}

btnParse.addEventListener('click', async () => {
  batchParseInfo.textContent = '解析中…'; batchParseInfo.style.color = '#888';
  batchMapping.style.display = 'none';
  try {
    let result;
    if (batchSrc_ === 'file') {
      const file = batchFileInput.files[0];
      if (!file) throw new Error('請先選擇檔案');
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') result = await parseExcelBuffer(file);
      else result = parseTextInput(await readFileAsText(file), ext === 'json' ? 'json' : batchFmt_, batchDelimInput.value);
    } else {
      result = parseTextInput(batchPasteText.value, batchFmt_, batchDelimInput.value);
    }
    parsedRows = result.rows; parsedCols = result.cols;
    batchParseInfo.textContent = `✅ 已解析 ${parsedRows.length} 筆，${parsedCols.length} 欄`;
    batchParseInfo.style.color = '#2e7d32';
    updateBatchSelects(parsedCols);
    renderBatchPreview(parsedRows, parsedCols);
    batchMapping.style.display = '';
    btnBatchPrint.disabled = !parsedRows.length;
    batchPrintCount.textContent = parsedRows.length;
    log(`📊 批量解析：${parsedRows.length} 筆，${parsedCols.length} 欄`);
  } catch (e) {
    batchParseInfo.textContent = `❌ ${e.message}`;
    batchParseInfo.style.color = '#c62828';
    log(`❌ 批量解析失敗：${e.message}`);
  }
});

btnBatchStop.onclick = () => { batchStopped = true; btnBatchStop.disabled = true; };

btnBatchPrint.onclick = async () => {
  if (!client) { alert('請先連線到印表機'); return; }
  if (!parsedRows.length) return;
  const origText = labelTextEl.value, origQty = quantityEl.value, origSize = fontSizeEl.value;
  const direction = printDirEl.value, density = parseInt(densityEl.value);
  const labelType = parseInt(labelTypeEl.value), speed = parseInt(printSpeedEl.value);

  batchStopped = false; btnBatchStop.disabled = false; btnBatchStop.style.display = '';
  btnBatchPrint.disabled = true; batchProgWrap.style.display = "block"; batchProgFg.style.width = "0%";
  const total = parsedRows.length; let success = 0, failed = 0;

  for (let i = 0; i < total; i++) {
    if (batchStopped) { log('⏹ 批量列印已停止'); break; }
    const row = parsedRows[i];
    labelTextEl.value = String(row[batchTextCol.value] ?? '');
    if (batchQtyCol.value && row[batchQtyCol.value] !== '') quantityEl.value = Math.max(1, parseInt(row[batchQtyCol.value]) || 1);
    if (batchSizeCol.value && row[batchSizeCol.value] !== '') fontSizeEl.value = parseInt(row[batchSizeCol.value]) || 0;

    batchProgFg.style.width = `${Math.round(i / total * 100)}%`;
    batchProgText.textContent = `${i + 1} / ${total} · "${labelTextEl.value.substring(0, 25)}"`;
    drawDesign(); updateBWPreview();

    const h = parseInt(canvasHeightEl.value);
    if (h % 8 !== 0) { log(`⚠ 第${i + 1}筆跳過：高度非8倍數`); failed++; continue; }

    let encoded;
    try { encoded = ImageEncoder.encodeCanvas(buildProcessedCanvas(), direction); }
    catch (e) { log(`❌ 第${i + 1}筆編碼失敗: ${e.message}`); failed++; continue; }

    const task = client.abstraction.newPrintTask(client.getPrintTaskType?.() ?? 'B1', {
      totalPages: parseInt(quantityEl.value) || 1, density, labelType, speed,
      statusPollIntervalMs: 100, statusTimeoutMs: 8000,
    });
    try {
      await task.printInit();
      await task.printPage(encoded, parseInt(quantityEl.value) || 1);
      await task.waitForFinished();
      success++; log(`✅ ${i + 1}/${total}: "${labelTextEl.value.substring(0, 20)}"`);
    } catch (e) {
      failed++; log(`❌ ${i + 1}/${total} 失敗: ${e.message}`);
    } finally { await task.printEnd(); }
    if (i < total - 1 && !batchStopped) await new Promise(r => setTimeout(r, 600));
  }

  batchProgFg.style.width = '100%';
  batchProgText.textContent = `完成：✅ ${success}${failed ? ` · ❌ ${failed}` : ''}`;
  log(`📊 批量完成：成功 ${success}，失敗 ${failed}`);
  btnBatchStop.style.display = 'none'; btnBatchPrint.disabled = false; batchStopped = false;
  labelTextEl.value = origText; quantityEl.value = origQty; fontSizeEl.value = origSize;
  scheduleRepaint();
};

// ── Presets (localStorage) ────────────────────────────────────────────────────
const PRESETS_KEY = "niimbo_presets";

function collectSettings() {
  return {
    text: labelTextEl.value, fontFamily: fontFamilyEl.value,
    fontSize: fontSizeEl.value, lineHeight: lineHeightEl.value,
    isBold, isItalic, isInvert, isBorder, textAlign, textRotation,
    width: canvasWidthEl.value, height: canvasHeightEl.value,
    imageFit: imageFitEl.value, printDirection: printDirEl.value,
    labelType: labelTypeEl.value, printSpeed: printSpeedEl.value,
    quantity: quantityEl.value, density: densityEl.value,
    threshold: thresholdEl.value, brightness: brightnessEl.value,
    contrast: contrastEl.value, useDither,
  };
}

function applySettings(s) {
  if (s.text       !== undefined) labelTextEl.value   = s.text;
  if (s.fontFamily !== undefined) fontFamilyEl.value  = s.fontFamily;
  if (s.fontSize   !== undefined) fontSizeEl.value    = s.fontSize;
  if (s.lineHeight !== undefined) lineHeightEl.value  = s.lineHeight;
  if (s.isBold     !== undefined) { isBold   = s.isBold;   toggleBold.classList.toggle("active", isBold); }
  if (s.isItalic   !== undefined) { isItalic = s.isItalic; toggleItalic.classList.toggle("active", isItalic); }
  if (s.isInvert   !== undefined) { isInvert = s.isInvert; toggleInvert.classList.toggle("active", isInvert); }
  if (s.isBorder   !== undefined) { isBorder = s.isBorder; toggleBorder.classList.toggle("active", isBorder); }
  if (s.textAlign  !== undefined) {
    textAlign = s.textAlign;
    [alignLeft, alignCenter, alignRight].forEach((b, i) =>
      b.classList.toggle("active", ["left", "center", "right"][i] === textAlign));
  }
  if (s.textRotation !== undefined) {
    textRotation = s.textRotation;
    rotBtns.forEach((b, i) => b.classList.toggle("active", [0, 90, 180, 270][i] === textRotation));
  }
  if (s.width  !== undefined) canvasWidthEl.value  = s.width;
  if (s.height !== undefined) {
    canvasHeightEl.value = s.height;
    heightHint.classList.toggle("show", parseInt(s.height) % 8 !== 0);
  }
  if (s.imageFit       !== undefined) imageFitEl.value    = s.imageFit;
  if (s.printDirection !== undefined) printDirEl.value    = s.printDirection;
  if (s.labelType      !== undefined) labelTypeEl.value   = s.labelType;
  if (s.printSpeed     !== undefined) printSpeedEl.value  = s.printSpeed;
  if (s.quantity       !== undefined) quantityEl.value    = s.quantity;
  if (s.density    !== undefined) { densityEl.value    = s.density;    densityValEl.textContent    = s.density; }
  if (s.threshold  !== undefined) { thresholdEl.value  = s.threshold;  $("thresholdVal").textContent  = s.threshold; }
  if (s.brightness !== undefined) { brightnessEl.value = s.brightness; $("brightnessVal").textContent = (s.brightness > 0 ? "+" : "") + s.brightness; }
  if (s.contrast   !== undefined) { contrastEl.value   = s.contrast;   $("contrastVal").textContent   = (s.contrast   > 0 ? "+" : "") + s.contrast; }
  if (s.useDither  !== undefined) {
    useDither = s.useDither;
    modeThreshold.classList.toggle("active", !useDither);
    modeDither.classList.toggle("active", useDither);
  }
  scheduleRepaint();
}

function getPresets()    { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "{}"); } catch { return {}; } }
function storePresets(p) { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); }
function refreshPresetSelect() {
  const p = getPresets();
  presetSelect.innerHTML = '<option value="">-- 選擇預設 --</option>';
  Object.keys(p).forEach(name => {
    const o = document.createElement("option"); o.value = o.textContent = name;
    presetSelect.appendChild(o);
  });
}

btnSavePreset.onclick = () => {
  const name = presetNameEl.value.trim();
  if (!name) { alert("請輸入預設名稱"); return; }
  const p = getPresets(); p[name] = collectSettings(); storePresets(p);
  refreshPresetSelect(); presetSelect.value = name;
  log(`💾 已儲存預設：${name}`);
};
btnLoadPreset.onclick = () => {
  const name = presetSelect.value; if (!name) return;
  const p = getPresets(); if (p[name]) { applySettings(p[name]); log(`📂 已載入預設：${name}`); }
};
btnDeletePreset.onclick = () => {
  const name = presetSelect.value;
  if (!name || !confirm(`刪除預設「${name}」？`)) return;
  const p = getPresets(); delete p[name]; storePresets(p);
  refreshPresetSelect(); log(`🗑 已刪除預設：${name}`);
};

// ── Voice input（全畫面共用一個辨識器）────────────────────────────────────────
let stopVoice = () => {};

function setupVoice() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $("btnVoice");
  const btnBatch = $("btnVoiceBatch");
  const holdBtn = $("btnVoiceHold");
  const label = $("btnVoiceLabel");
  const labelBatch = $("btnVoiceBatchLabel");
  const note = $("voiceNote");
  const live = $("voiceLive");
  const miniLive = $("miniVoiceLive");
  const langEl = $("voiceLang");
  const defaultNote = note.textContent;

  if (!Rec) {
    btn.disabled = true;
    btnBatch.disabled = true;
    if (holdBtn) holdBtn.disabled = true;
    label.textContent = "不支援";
    labelBatch.textContent = "不支援";
    const holdHint = holdBtn?.querySelector(".hold-hint");
    if (holdHint) holdHint.textContent = "請用 Chrome";
    note.textContent = "這個瀏覽器沒有語音輸入。請改用 Chrome 或 Edge，並允許麥克風。";
    return;
  }

  const rec = new Rec();
  rec.continuous = true;
  rec.interimResults = true;

  let want = false;
  let voiceHolding = false;
  let acceptVoice = false;
  let hearing = false;
  let target = labelTextEl;
  let prefix = "";
  let suffix = "";
  let restartEl = null;

  function showHeard(text) {
    live.hidden = false;
    live.textContent = text;
    if (miniLive) {
      miniLive.hidden = false;
      miniLive.textContent = text;
    }
  }

  function paint(on) {
    const onLabel = on && target === labelTextEl;
    const onBatch = on && target === batchPasteText;
    btn.classList.toggle("listening", onLabel && !voiceHolding);
    btnBatch.classList.toggle("listening", onBatch);
    btn.setAttribute("aria-pressed", onLabel && !voiceHolding ? "true" : "false");
    btnBatch.setAttribute("aria-pressed", onBatch ? "true" : "false");
    label.textContent = onLabel && !voiceHolding ? "停止" : "語音輸入";
    labelBatch.textContent = onBatch ? "停止" : "語音輸入";
    if (holdBtn) {
      const held = onLabel && voiceHolding;
      holdBtn.classList.toggle("listening", held);
      holdBtn.setAttribute("aria-pressed", held ? "true" : "false");
    }
    if (!on) {
      live.hidden = true;
      if (miniLive) miniLive.hidden = true;
    }
  }

  function stop() {
    want = false;
    try { rec.stop(); } catch { /* already stopped */ }
  }

  stopVoice = () => {
    acceptVoice = false;
    voiceHolding = false;
    restartEl = null;
    stop();
    paint(false);
  };

  function begin(el, opts = {}) {
    target = el;
    const atEnd = opts.atEnd === true;
    const start = atEnd ? el.value.length : (el.selectionStart ?? el.value.length);
    const end = atEnd ? el.value.length : (el.selectionEnd ?? el.value.length);
    prefix = el.value.slice(0, start);
    suffix = el.value.slice(end);
    rec.lang = langEl.value || "zh-HK";
    acceptVoice = true;
    want = true;
    note.textContent = defaultNote;
    showHeard(voiceHolding ? "請說話，放開就停" : "請開始說話…");
    try { rec.start(); }
    catch {
      want = false;
      voiceHolding = false;
      acceptVoice = false;
      paint(false);
      note.textContent = "語音輸入暫時無法開始，請再按一次。";
    }
  }

  function listen(el) {
    if (voiceHolding) return;
    if (want && target === el) { restartEl = null; stop(); return; }
    if (want) { restartEl = el; stop(); return; }
    begin(el);
  }

  rec.onstart = () => {
    if (!want && !voiceHolding) {
      try { rec.stop(); } catch { /* already stopped */ }
      return;
    }
    hearing = true;
    paint(true);
  };
  let lastHoldRestart = 0;
  rec.onend = () => {
    const holdAgain = voiceHolding;
    const next = restartEl;
    hearing = false;
    want = false;
    restartEl = null;
    paint(false);
    if (holdAgain) {
      const now = Date.now();
      if (now - lastHoldRestart < 300) {
        voiceHolding = false;
        return;
      }
      lastHoldRestart = now;
      begin(labelTextEl, { atEnd: true });
      return;
    }
    if (next) begin(next);
  };
  rec.onerror = (e) => {
    if (e.error === "aborted" || e.error === "no-speech") return;
    want = false;
    voiceHolding = false;
    acceptVoice = false;
    const msg = {
      "not-allowed": "請允許這個網站使用麥克風，再按一次語音輸入。",
      "service-not-allowed": "這個瀏覽器沒有開放語音辨識。",
      "audio-capture": "找不到麥克風。",
      "network": "語音服務連不上。聲音不會因此上傳到 GitHub，但這次辨識需要瀏覽器的語音服務。",
    };
    note.textContent = msg[e.error] || "語音輸入沒有成功，請再試一次。";
    if (miniLive) {
      miniLive.hidden = false;
      miniLive.textContent = note.textContent;
    }
  };
  rec.onresult = (event) => {
    if (!acceptVoice || !hearing) return;
    let said = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) said += text;
      else interim += text;
    }
    const merged = said + interim;
    target.value = prefix + merged + suffix;
    const caret = prefix.length + merged.length;
    try { target.setSelectionRange(caret, caret); } catch { /* 極簡模式文字框藏著，游標可以略過 */ }
    showHeard(interim ? `聽到：${interim}` : "已寫入文字");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  };

  btn.addEventListener("click", () => listen(labelTextEl));
  btnBatch.addEventListener("click", () => listen(batchPasteText));
  langEl.addEventListener("change", () => {
    if (!want) return;
    restartEl = target;
    stop();
  });

  if (!holdBtn) return;

  function releaseHold() {
    if (!voiceHolding) return;
    voiceHolding = false;
    restartEl = null;
    stop();
  }

  holdBtn.addEventListener("pointerdown", (event) => {
    if (holdBtn.disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (voiceHolding) return;
    voiceHolding = true;
    if (want) stop();
    else begin(labelTextEl, { atEnd: true });
    event.preventDefault();
    try { holdBtn.setPointerCapture(event.pointerId); } catch { /* 這一下已經結束 */ }
  }, { passive: false });
  holdBtn.addEventListener("pointerup", releaseHold);
  holdBtn.addEventListener("pointercancel", releaseHold);
  holdBtn.addEventListener("contextmenu", (event) => event.preventDefault());
}

// ── 一般 / 極簡 ───────────────────────────────────────────────────────────────
const MODE_KEY = "niimbo_ui_mode";

function setMode(mode) {
  const mini = mode === "mini";
  if (mini === document.documentElement.classList.contains("mode-mini")) return;
  document.documentElement.classList.toggle("mode-mini", mini);
  syncModeButton();
  try { localStorage.setItem(MODE_KEY, mini ? "mini" : "full"); }
  catch { /* 寫不進去時，這次畫面仍然切換 */ }
  stopVoice();
}

function syncModeButton() {
  const mini = document.documentElement.classList.contains("mode-mini");
  const btn = $("btnMode");
  btn.setAttribute("aria-pressed", String(mini));
  btn.setAttribute("aria-label", mini ? "切換到一般模式" : "切換到極簡模式");
  updateMiniHint();
}

$("btnMode").addEventListener("click", () => {
  setMode(document.documentElement.classList.contains("mode-mini") ? "full" : "mini");
});
$("btnClearLabel").addEventListener("click", () => {
  stopVoice();
  labelTextEl.value = "";
  $("voiceLive").hidden = true;
  $("miniVoiceLive").hidden = true;
  scheduleRepaint();
});

// ── Init ───────────────────────────────────────────────────────────────────────
{
  const src = window._libSrc ?? {};
  const el  = document.getElementById("libStatus");
  if (el) {
    const niim  = src.niimbluelib ?? "?";
    const sheet = src.SheetJS    ?? "?";
    const color = (niim.includes("❌") || sheet.includes("❌")) ? "#e57373" : "#bbb";
    el.style.color   = color;
    el.textContent   = `niimbluelib: ${niim}  │  SheetJS: ${sheet}`;
  }
}
setupVoice();
syncModeButton();
refreshPresetSelect();
repaintAll();
