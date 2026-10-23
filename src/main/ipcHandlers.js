const { BrowserWindow, ipcMain, dialog } = require("electron");
const os = require("os");
const {
    PRIORITY_FLAGS,
    VALID_AFFINITY_REGEX,
    VALID_THEMES,
    VALID_CACHE_MODES,
    FREE_ALLOWED_AFFINITY_PRESETS,
    isProOrDev,
    activateAccountTierByToken,
    activateAccountTierByCode,
    deriveCachePath,
    getConfig,
    saveConfig,
    exportConfigDialog,
    importConfigDialog
} = require("./configManager");
const {
    createProfile,
    saveCacheProfile,
    loadCacheProfile,
    getProfiles,
    getProfilesDetailed,
    deleteProfile
} = require("./cacheManager");
const {
    getModProfiles,
    switchModProfile,
    saveModDescription,
    createNewModProfile,
    openModFolder
} = require("./modManager");
const {
    getServers,
    fetchCfxMetadataForForm,
    syncServerMetadataFromStatus,
    saveServer,
    deleteServer
} = require("./serverManager");
const {
    isFiveMRunning,
    launchFiveMProcess,
    launchServer,
    connectNow,
    cancelLaunch
} = require("./processLauncher");
const { getServerStatus } = require("./serverStatusService");
const { getCleanupStats, performCleanup } = require("./cleanerService");

function registerIpcHandlers() {
    ipcMain.handle("window-minimize", event => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.minimize();
        return true;
    });

    ipcMain.handle("window-maximize", event => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return false;
        if (win.isMaximized()) {
            win.unmaximize();
            return false;
        }
        win.maximize();
        return true;
    });

    ipcMain.handle("window-close", event => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.close();
        return true;
    });

    ipcMain.handle("get-account-tier", async () => {
        const config = getConfig();
        return config.accountTier || "free";
    });

    ipcMain.handle("activate-account-tier", async (_event, token) => {
        return activateAccountTierByToken(token);
    });

    ipcMain.handle("activate-license", async (_event, token) => {
        return activateAccountTierByToken(token);
    });

    ipcMain.handle("get-theme", async () => {
        const config = getConfig();
        return config.theme || "obsidian";
    });

    ipcMain.handle("save-theme", async (_event, theme) => {
        if (!VALID_THEMES.includes(theme)) {
            throw new Error("Pilihan tema tidak valid.");
        }
        const config = getConfig();
        if (theme !== "obsidian" && !isProOrDev(config)) {
            throw new Error(
                "Tema Midnight, Crimson, dan Monochrome memerlukan lisensi PRO atau Developer."
            );
        }
        config.theme = theme;
        saveConfig(config);
        return config.theme;
    });

    ipcMain.handle("get-cpu-info", async () => {
        const cpus = os.cpus() || [];
        const count = Math.max(1, cpus.length);
        return {
            count,
            logicalCores: count,
            model: cpus[0]?.model ? cpus[0].model.trim() : "System Processor"
        };
    });

    ipcMain.handle("save-affinity", async (_event, affinity) => {
        if (typeof affinity !== "string" || (affinity !== "" && !VALID_AFFINITY_REGEX.test(affinity))) {
            throw new Error("Nilai CPU Affinity tidak valid.");
        }

        const cleaned = affinity.toUpperCase();
        const config = getConfig();
        if (!FREE_ALLOWED_AFFINITY_PRESETS.includes(cleaned) && !isProOrDev(config)) {
            throw new Error(
                "Pengaturan CPU Affinity per core memerlukan lisensi PRO atau Developer."
            );
        }

        config.affinity = cleaned;
        saveConfig(config);
        return true;
    });

    ipcMain.handle("get-affinity", async () => {
        const config = getConfig();
        return config.affinity || "";
    });

    ipcMain.handle("save-priority", async (_event, priority) => {
        if (!Object.prototype.hasOwnProperty.call(PRIORITY_FLAGS, priority)) {
            throw new Error("Nilai prioritas proses tidak valid.");
        }

        const config = getConfig();
        config.priority = priority;
        saveConfig(config);
        return true;
    });

    ipcMain.handle("get-priority", async () => {
        const config = getConfig();
        return config.priority;
    });

    ipcMain.handle("save-launch-delay", (_event, delay) => {
        const parsedDelay = Number(delay);
        if (!Number.isFinite(parsedDelay) || parsedDelay < 1000 || parsedDelay > 300000) {
            throw new Error("Nilai jeda koneksi tidak valid.");
        }

        const config = getConfig();
        config.launchDelay = parsedDelay;
        saveConfig(config);
        return true;
    });

    ipcMain.handle("get-launch-delay", () => {
        const config = getConfig();
        return config.launchDelay || 30000;
    });

    ipcMain.handle("check-fivem-running", async () => {
        return await isFiveMRunning();
    });

    ipcMain.handle("launch-fivem", async () => {
        const config = getConfig();
        launchFiveMProcess(config);
        return true;
    });

    ipcMain.handle("get-servers", async () => {
        return getServers();
    });

    ipcMain.handle("fetch-cfx-metadata", async (_event, rawInput) => {
        try {
            return await fetchCfxMetadataForForm(rawInput);
        } catch (err) {
            return {
                ok: false,
                endpoint: "",
                error: err?.message || "Server tidak ditemukan atau sedang offline (404)"
            };
        }
    });

    ipcMain.handle("save-server", async (_event, serverPayload) => {
        return await saveServer(serverPayload);
    });

    ipcMain.handle("delete-server", async (_event, serverId) => {
        return deleteServer(serverId);
    });

    ipcMain.handle("launch-server", async (event, serverId) => {
        return await launchServer(event.sender, serverId);
    });

    ipcMain.handle("connect-now", async () => {
        return connectNow();
    });

    ipcMain.handle("cancel-launch", async () => {
        return cancelLaunch();
    });

    ipcMain.handle("toggle-favorite", (_event, serverId) => {
        if (typeof serverId !== "string" || !serverId.trim()) {
            throw new Error("ID server tidak valid.");
        }

        const config = getConfig();
        if (!Array.isArray(config.favorites)) {
            config.favorites = [];
        }

        const index = config.favorites.indexOf(serverId);
        if (index === -1) {
            config.favorites.push(serverId);
        } else {
            config.favorites.splice(index, 1);
        }

        saveConfig(config);
        return config.favorites;
    });

    ipcMain.handle("get-favorites", () => {
        const config = getConfig();
        return config.favorites || [];
    });

    ipcMain.handle("get-server-status", async (_event, endpoint) => {
        const status = await getServerStatus(endpoint);
        if (status && status.online) {
            try {
                syncServerMetadataFromStatus(endpoint, status);
            } catch {}
        }
        return status;
    });

    ipcMain.handle("create-profile", (_event, profileName) => {
        return createProfile(profileName);
    });

    ipcMain.handle("save-cache", async (_event, profileName) => {
        return await saveCacheProfile(profileName);
    });

    ipcMain.handle("load-cache", async (_event, profileName) => {
        return await loadCacheProfile(profileName);
    });

    ipcMain.handle("get-profiles", async () => {
        return getProfiles();
    });

    ipcMain.handle("get-profiles-detailed", async () => {
        const servers = getServers();
        return await getProfilesDetailed(servers);
    });

    ipcMain.handle("delete-profile", async (_event, profileName) => {
        return await deleteProfile(profileName);
    });

    ipcMain.handle("get-cache-mode", async () => {
        const config = getConfig();
        return config.cacheMode || "copy";
    });

    ipcMain.handle("save-cache-mode", async (_event, mode) => {
        if (!VALID_CACHE_MODES.includes(mode)) {
            throw new Error("Mode cache tidak valid.");
        }
        const config = getConfig();
        if (mode === "junction" && !isProOrDev(config)) {
            throw new Error(
                "Mode Fast Junction memerlukan lisensi PRO atau Developer."
            );
        }
        config.cacheMode = mode;
        saveConfig(config);
        return config.cacheMode;
    });

    ipcMain.handle("get-mod-profiles", async () => {
        const servers = getServers();
        return await getModProfiles(servers);
    });

    ipcMain.handle("switch-mod-profile", async (_event, targetProfileName) => {
        if (await isFiveMRunning()) {
            throw new Error(
                "Tidak dapat mengganti profil mod saat FiveM sedang berjalan. Tutup FiveM terlebih dahulu."
            );
        }
        return await switchModProfile(targetProfileName);
    });

    ipcMain.handle("save-mod-description", (_event, profileName, description) => {
        return saveModDescription(profileName, description);
    });

    ipcMain.handle("create-mod-profile", async (_event, profileName) => {
        return await createNewModProfile(profileName);
    });

    ipcMain.handle("open-mod-folder", async (_event, folderName) => {
        return await openModFolder(folderName);
    });

    ipcMain.handle("browse-fivem", async () => {
        const result = await dialog.showOpenDialog({
            title: "Pilih FiveM.exe",
            filters: [{ name: "Executable", extensions: ["exe"] }],
            properties: ["openFile"]
        });

        if (result.canceled || !result.filePaths.length) {
            return null;
        }

        const filePath = result.filePaths[0];
        const config = getConfig();

        config.fivemPath = filePath;
        config.cachePath = deriveCachePath(filePath);
        saveConfig(config);

        return filePath;
    });

    ipcMain.handle("get-fivem-path", () => {
        const config = getConfig();
        return config.fivemPath || "Belum dipilih";
    });

    ipcMain.handle("export-config", async () => {
        return await exportConfigDialog();
    });

    ipcMain.handle("import-config", async () => {
        return await importConfigDialog();
    });

    ipcMain.handle("get-cleanup-stats", async () => {
        return await getCleanupStats();
    });

    ipcMain.handle("perform-cleanup", async () => {
        return await performCleanup();
    });
}

module.exports = {
    registerIpcHandlers
};
