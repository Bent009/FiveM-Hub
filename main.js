const { BrowserWindow, app } = require("electron");
const path = require("path");
const fs = require("fs");
const {
    getProfilesDir,
    deriveCachePath,
    findFiveMPath,
    getConfig,
    saveConfig
} = require("./src/main/configManager");
const { ensureServersInitialized } = require("./src/main/serverManager");
const { registerIpcHandlers } = require("./src/main/ipcHandlers");

function createWindow() {
    const win = new BrowserWindow({
        width: 1120,
        height: 740,
        minWidth: 920,
        minHeight: 620,
        frame: false,
        titleBarStyle: "hidden",
        backgroundColor: "#050507",
        icon: path.join(__dirname, "assets", "logo-utama.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true
        }
    });

    win.loadFile("./ui/index.html");
}

registerIpcHandlers();

app.whenReady().then(() => {
    getProfilesDir();
    ensureServersInitialized();

    const config = getConfig();

    if (!config.fivemPath || !fs.existsSync(config.fivemPath)) {
        const detected = findFiveMPath();

        if (detected) {
            config.fivemPath = detected;
            config.cachePath = deriveCachePath(detected);
            saveConfig(config);
            console.log("FiveM ditemukan:", detected);
        }
    } else if (config.cachePath !== deriveCachePath(config.fivemPath)) {
        config.cachePath = deriveCachePath(config.fivemPath);
        saveConfig(config);
    }

    createWindow();
});