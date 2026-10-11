const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const APP_URL = "https://kings-marketplace.lovable.app";
const APP_ICON = path.join(__dirname, "..", "assets", "kings-food.ico");
let mainWindow;

function loadingPage() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KINGS FOOD</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8fa;color:#20242b;font:16px "Segoe UI",Arial,sans-serif}.card{text-align:center;background:#fff;padding:38px 32px;border-radius:18px;box-shadow:0 10px 40px #17203312}.spinner{width:28px;height:28px;border:3px solid #e4e7ec;border-top-color:#b91c1c;border-radius:50%;animation:spin .8s linear infinite;margin:20px auto}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><div class="card"><h1>KINGS FOOD</h1><div class="spinner"></div><p>Preparing your workspace…</p></div></body></html>';
}

function showErrorPage(details) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const safeDetails = String(details || "").replace(/[&<>"]/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"' : "&quot;" }[char]; });
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KINGS FOOD</title><style>body{font:16px/1.5 "Segoe UI",Arial,sans-serif;background:#f7f8fa;color:#20242b;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fff;padding:36px;border-radius:16px;max-width:560px;margin:20px;box-shadow:0 10px 40px #17203312}h1{margin-top:0}p{color:#596273}.details{font-size:12px;overflow-wrap:anywhere;color:#87909d}button{background:#b91c1c;color:white;border:0;border-radius:8px;padding:12px 20px;font-weight:600;cursor:pointer}</style></head><body><main><h1>KINGS FOOD could not connect</h1><p>The desktop app opened, but the KINGS FOOD website did not load. Check your internet connection and try again. If this keeps happening, the website deployment address may need to be updated.</p><button onclick="window.location.href=\'' + APP_URL + '\'">Retry connection</button><p class="details">' + safeDetails + '</p></main></body></html>';
  void mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1024, minHeight: 700,
    show: true, icon: APP_ICON, autoHideMenuBar: true, backgroundColor: "#f7f8fa",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false }
  });

  mainWindow.webContents.setWindowOpenHandler(function ({ url }) {
    if (url.startsWith(APP_URL) || url.startsWith("https://")) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", function (event, url) {
    if (url.startsWith("http://") || url.startsWith("https://")) return;
    event.preventDefault();
  });

  mainWindow.webContents.on("did-fail-load", function (_event, errorCode, description, validatedURL, isMainFrame) {
    if (isMainFrame && !validatedURL.startsWith("data:")) showErrorPage(description + " (code " + errorCode + ")");
  });

  // Display a branded loading page immediately instead of a blank white window.
  void mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(loadingPage()))
    .then(function () { return new Promise(function (resolve) { setTimeout(resolve, 250); }); })
    .then(function () { if (mainWindow && !mainWindow.isDestroyed()) return mainWindow.loadURL(APP_URL); })
    .catch(function (error) { showErrorPage(error && error.message ? error.message : "Unable to open the application."); });
}

app.whenReady().then(function () {
  createWindow();
  app.on("activate", function () { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", function () { if (process.platform !== "darwin") app.quit(); });
