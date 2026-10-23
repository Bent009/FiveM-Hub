const { app, dialog, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { verifyLicenseToken } = require("./licenseValidator");

const PRIORITY_FLAGS = {
    normal: "",
    aboveNormal: "/abovenormal",
    high: "/high",
    realtime: "/realtime"
};

const VALID_AFFINITY_REGEX = /^[0-9A-Fa-f]+$/;
const VALID_THEMES = ["obsidian", "midnight", "crimson", "monochrome"];
const VALID_CACHE_MODES = ["junction", "copy"];
const VALID_ACCOUNT_TIERS = ["free", "pro", "developer"];
const FREE_ALLOWED_AFFINITY_PRESETS = ["", "F", "3F", "FF"];

const FALLBACK_KEY = crypto.scryptSync(
    "FiveM-Hub-Local-SafeStorage-Fallback",
    "fh-salt-2026",
    32
);

function fallbackEncrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", FALLBACK_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function fallbackDecrypt(base64Cipher) {
    try {
        const buf = Buffer.from(base64Cipher, "base64");
        if (buf.length < 28) return "";
        const iv = buf.subarray(0, 12);
        const tag = buf.subarray(12, 28);
        const data = buf.subarray(28);
        const decipher = crypto.createDecipheriv("aes-256-gcm", FALLBACK_KEY, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
        return "";
    }
}

function encryptLicenseToken(tokenString) {
    if (!tokenString) return "";
    try {
        if (
            safeStorage &&
            typeof safeStorage.isEncryptionAvailable === "function" &&
            safeStorage.isEncryptionAvailable()
        ) {
            return safeStorage.encryptString(tokenString).toString("base64");
        }
    } catch (err) {
        console.warn("safeStorage.encryptString gagal:", err.message);
    }
    return fallbackEncrypt(tokenString);
}

function decryptLicenseToken(base64Cipher) {
    if (!base64Cipher || typeof base64Cipher !== "string") return "";
    try {
        if (
            safeStorage &&
            typeof safeStorage.isEncryptionAvailable === "function" &&
            safeStorage.isEncryptionAvailable()
        ) {
            const buf = Buffer.from(base64Cipher, "base64");
            return safeStorage.decryptString(buf);
        }
    } catch (err) {
        console.warn("safeStorage.decryptString gagal (indikasi manipulasi file):", err.message);
        return "";
    }
    return fallbackDecrypt(base64Cipher);
}

function isProOrDev(configOrTier) {
    const tier = typeof configOrTier === "string"
        ? configOrTier
        : configOrTier?.accountTier;
    return tier === "pro" || tier === "developer";
}

function getAppRootDir() {
    return path.resolve(__dirname, "..", "..");
}

function getUserDataDir() {
    if (app && typeof app.getPath === "function") {
        return app.getPath("userData");
    }
    const appData = process.env.APPDATA || path.join(require("os").homedir(), "AppData", "Roaming");
    return path.join(appData, "fivem-hub");
}

function getConfigPath() {
    return path.join(getUserDataDir(), "config.json");
}

function getProfilesDir() {
    const dir = path.join(getUserDataDir(), "Profiles");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getUserAssetsDir() {
    const dir = path.join(getUserDataDir(), "assets");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function deriveCachePath(fivemPath) {
    if (!fivemPath || typeof fivemPath !== "string") {
        return "";
    }
    return path.join(path.dirname(fivemPath), "FiveM.app", "data");
}

function findFiveMPath() {
    const possiblePaths = [
        "D:\\fivem\\FiveM.exe",
        "D:\\FiveM\\FiveM.exe",
        process.env.LOCALAPPDATA
            ? path.join(process.env.LOCALAPPDATA, "FiveM", "FiveM.exe")
            : ""
    ].filter(Boolean);

    return possiblePaths.find(p => fs.existsSync(p));
}

function createDefaultConfig() {
    let legacyApiKey = process.env.FIVESTATS_API_KEY || "";
    const legacyConfigPath = path.join(getAppRootDir(), "config.json");

    if (!legacyApiKey && fs.existsSync(legacyConfigPath)) {
        try {
            const legacy = JSON.parse(fs.readFileSync(legacyConfigPath, "utf8"));
            if (typeof legacy.apiKey === "string") {
                legacyApiKey = legacy.apiKey;
            }
        } catch {}
    }

    const detectedFiveM = findFiveMPath() || "";

    return {
        fivemPath: detectedFiveM,
        priority: "normal",
        affinity: "",
        launchDelay: 30000,
        cachePath: deriveCachePath(detectedFiveM),
        cacheMode: "copy",
        apiKey: legacyApiKey,
        favorites: [],
        theme: "obsidian",
        licenseToken: "",
        accountTier: "free",
        licenseHolder: "",
        activeModOriginalName: "",
        modDescriptions: {}
    };
}

function sanitizeModDescriptions(rawMap) {
    if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
        return {};
    }
    const cleaned = {};
    for (const [key, val] of Object.entries(rawMap)) {
        if (typeof key === "string" && typeof val === "string") {
            const trimmedKey = key.trim();
            const trimmedVal = val.trim();
            if (trimmedKey && trimmedVal) {
                cleaned[trimmedKey] = trimmedVal;
            }
        }
    }
    return cleaned;
}

function getConfig() {
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
        const defaultConfig = createDefaultConfig();
        saveConfig(defaultConfig);
        return defaultConfig;
    }

    try {
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);

        // Security: Plaintext accountTier is never trusted.
        // Account tier must strictly be resolved by decrypting licenseToken with safeStorage (Windows DPAPI).
        let resolvedTier = "free";
        let resolvedLicenseHolder = "";
        const rawLicenseToken =
            typeof parsed.licenseToken === "string" ? parsed.licenseToken.trim() : "";

        if (rawLicenseToken) {
            const decrypted = decryptLicenseToken(rawLicenseToken);
            if (decrypted) {
                try {
                    const verified = verifyLicenseToken(decrypted);
                    if (verified && VALID_ACCOUNT_TIERS.includes(verified.tier)) {
                        resolvedTier = verified.tier;
                        resolvedLicenseHolder = verified.holder || "";
                    }
                } catch (verifyErr) {
                    console.warn(
                        "Validasi signature lisensi gagal:",
                        verifyErr.message
                    );
                    resolvedTier = "free";
                }
            } else {
                console.warn(
                    "Dekripsi licenseToken gagal (file config.json mungkin dimanipulasi). Mengembalikan status ke Free."
                );
                resolvedTier = "free";
            }
        }

        const accountTier = resolvedTier;
        const hasProAccess = isProOrDev(accountTier);

        const config = {
            fivemPath: typeof parsed.fivemPath === "string" ? parsed.fivemPath : "",
            priority: Object.prototype.hasOwnProperty.call(PRIORITY_FLAGS, parsed.priority)
                ? parsed.priority
                : "normal",
            affinity:
                typeof parsed.affinity === "string" &&
                (parsed.affinity === "" || VALID_AFFINITY_REGEX.test(parsed.affinity))
                    ? parsed.affinity.toUpperCase()
                    : "",
            launchDelay:
                typeof parsed.launchDelay === "number" && parsed.launchDelay > 0
                    ? parsed.launchDelay
                    : 30000,
            cachePath: "",
            cacheMode: hasProAccess
                ? (VALID_CACHE_MODES.includes(parsed.cacheMode) ? parsed.cacheMode : "junction")
                : "copy",
            apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
            favorites: Array.isArray(parsed.favorites)
                ? parsed.favorites.filter(id => typeof id === "string")
                : [],
            theme: hasProAccess && VALID_THEMES.includes(parsed.theme)
                ? parsed.theme
                : "obsidian",
            licenseToken: resolvedTier !== "free" ? rawLicenseToken : "",
            accountTier,
            licenseHolder: resolvedLicenseHolder,
            activeModOriginalName:
                typeof parsed.activeModOriginalName === "string"
                    ? parsed.activeModOriginalName.trim()
                    : "",
            modDescriptions: sanitizeModDescriptions(parsed.modDescriptions)
        };

        if (!hasProAccess && !FREE_ALLOWED_AFFINITY_PRESETS.includes(config.affinity)) {
            config.affinity = "";
        }

        config.cachePath = config.fivemPath
            ? deriveCachePath(config.fivemPath)
            : typeof parsed.cachePath === "string"
                ? parsed.cachePath
                : "";

        return config;
    } catch (err) {
        console.error("Gagal membaca config.json, menggunakan default:", err.message);
        const fallback = createDefaultConfig();
        saveConfig(fallback);
        return fallback;
    }
}

function saveConfig(data) {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const accountTier = VALID_ACCOUNT_TIERS.includes(data.accountTier)
        ? data.accountTier
        : "free";
    const hasProAccess = isProOrDev(accountTier);

    const normalized = {
        ...data,
        accountTier,
        theme: hasProAccess && VALID_THEMES.includes(data.theme) ? data.theme : "obsidian",
        cacheMode: hasProAccess
            ? (VALID_CACHE_MODES.includes(data.cacheMode) ? data.cacheMode : "junction")
            : "copy",
        cachePath: data.fivemPath ? deriveCachePath(data.fivemPath) : (data.cachePath || "")
    };

    if (!hasProAccess && !FREE_ALLOWED_AFFINITY_PRESETS.includes(normalized.affinity || "")) {
        normalized.affinity = "";
    }

    // Security: Do NOT write plaintext accountTier or licenseHolder to disk!
    // Only persist the encrypted licenseToken.
    const onDisk = { ...normalized };
    delete onDisk.accountTier;
    delete onDisk.licenseHolder;

    fs.writeFileSync(configPath, JSON.stringify(onDisk, null, 2), "utf8");
    return normalized;
}

function activateAccountTierByToken(rawToken) {
    const token = String(rawToken || "").trim();
    if (!token) {
        throw new Error("Masukkan token aktivasi terlebih dahulu.");
    }

    // Direct reset shortcut to free
    if (token.toUpperCase() === "FREE" || token.toUpperCase() === "RESET-FREE") {
        const config = getConfig();
        config.licenseToken = "";
        config.accountTier = "free";
        config.licenseHolder = "";
        config.cacheMode = "copy";
        config.theme = "obsidian";
        if (!FREE_ALLOWED_AFFINITY_PRESETS.includes(config.affinity)) {
            config.affinity = "";
        }
        const saved = saveConfig(config);
        return {
            accountTier: "free",
            cacheMode: saved.cacheMode,
            theme: saved.theme,
            affinity: saved.affinity,
            holder: "Community Free User"
        };
    }

    // Validate cryptographic signature & payload
    const verified = verifyLicenseToken(token);
    const targetTier = verified.tier;

    // Encrypt token via safeStorage (Windows DPAPI)
    const encryptedToken = encryptLicenseToken(token);
    if (!encryptedToken) {
        throw new Error(
            "Gagal mengenkripsi token lisensi dengan modul keamanan sistem (safeStorage)."
        );
    }

    const config = getConfig();
    config.licenseToken = encryptedToken;
    config.accountTier = targetTier;
    config.licenseHolder = verified.holder;

    if (isProOrDev(targetTier)) {
        config.cacheMode = "junction";
    } else {
        config.cacheMode = "copy";
        config.theme = "obsidian";
        if (!FREE_ALLOWED_AFFINITY_PRESETS.includes(config.affinity)) {
            config.affinity = "";
        }
    }

    const saved = saveConfig(config);
    return {
        accountTier: saved.accountTier,
        cacheMode: saved.cacheMode,
        theme: saved.theme,
        affinity: saved.affinity,
        holder: verified.holder
    };
}

const activateAccountTierByCode = activateAccountTierByToken;

function validateImportedConfig(rawObj, currentConfig) {
    if (!rawObj || typeof rawObj !== "object" || Array.isArray(rawObj)) {
        throw new Error("Format file konfigurasi tidak valid (harus berupa objek JSON).");
    }

    const validated = { ...currentConfig };

    if (rawObj.priority !== undefined) {
        if (!Object.prototype.hasOwnProperty.call(PRIORITY_FLAGS, rawObj.priority)) {
            throw new Error("Nilai 'priority' di dalam file config tidak valid.");
        }
        validated.priority = rawObj.priority;
    }

    if (rawObj.affinity !== undefined) {
        if (
            typeof rawObj.affinity !== "string" ||
            (rawObj.affinity !== "" && !VALID_AFFINITY_REGEX.test(rawObj.affinity))
        ) {
            throw new Error("Nilai 'affinity' di dalam file config tidak valid.");
        }
        validated.affinity = rawObj.affinity.toUpperCase();
    }

    if (rawObj.launchDelay !== undefined) {
        const delay = Number(rawObj.launchDelay);
        if (!Number.isFinite(delay) || delay < 1000 || delay > 300000) {
            throw new Error("Nilai 'launchDelay' di dalam file config tidak valid.");
        }
        validated.launchDelay = delay;
    }

    if (rawObj.favorites !== undefined) {
        if (
            !Array.isArray(rawObj.favorites) ||
            !rawObj.favorites.every(item => typeof item === "string")
        ) {
            throw new Error("Nilai 'favorites' di dalam file config harus berupa array string.");
        }
        validated.favorites = rawObj.favorites;
    }

    if (rawObj.fivemPath !== undefined) {
        if (typeof rawObj.fivemPath !== "string") {
            throw new Error("Nilai 'fivemPath' harus berupa string.");
        }
        const candidatePath = rawObj.fivemPath.trim();
        if (candidatePath) {
            if (
                path.extname(candidatePath).toLowerCase() !== ".exe" ||
                /["&|<>^`\r\n]/.test(candidatePath)
            ) {
                throw new Error("Nilai 'fivemPath' di dalam file config tidak valid.");
            }
            if (fs.existsSync(candidatePath)) {
                validated.fivemPath = candidatePath;
                validated.cachePath = deriveCachePath(candidatePath);
            }
        }
    }

    if (rawObj.theme !== undefined) {
        if (!VALID_THEMES.includes(rawObj.theme)) {
            throw new Error("Nilai 'theme' di dalam file config tidak valid.");
        }
        validated.theme = rawObj.theme;
    }

    if (rawObj.cacheMode !== undefined) {
        if (!VALID_CACHE_MODES.includes(rawObj.cacheMode)) {
            throw new Error("Nilai 'cacheMode' di dalam file config tidak valid.");
        }
        validated.cacheMode = rawObj.cacheMode;
    }

    return validated;
}

async function exportConfigDialog() {
    const result = await dialog.showSaveDialog({
        defaultPath: "fivem-config.json",
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (result.canceled || !result.filePath) {
        return false;
    }

    const { apiKey, licenseToken, licenseHolder, ...safeConfig } = getConfig();
    safeConfig.accountTier = "free";
    fs.writeFileSync(result.filePath, JSON.stringify(safeConfig, null, 2), "utf8");
    return true;
}

async function importConfigDialog() {
    const result = await dialog.showOpenDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"]
    });

    if (result.canceled || !result.filePaths.length) {
        return false;
    }

    const fileContent = fs.readFileSync(result.filePaths[0], "utf8");
    let parsed;
    try {
        parsed = JSON.parse(fileContent);
    } catch {
        throw new Error("File JSON rusak atau tidak dapat dibaca.");
    }

    const currentConfig = getConfig();
    const validatedConfig = validateImportedConfig(parsed, currentConfig);
    saveConfig(validatedConfig);
    return true;
}

module.exports = {
    PRIORITY_FLAGS,
    VALID_AFFINITY_REGEX,
    VALID_THEMES,
    VALID_CACHE_MODES,
    VALID_ACCOUNT_TIERS,
    FREE_ALLOWED_AFFINITY_PRESETS,
    isProOrDev,
    activateAccountTierByToken,
    activateAccountTierByCode,
    encryptLicenseToken,
    decryptLicenseToken,
    getAppRootDir,
    getUserDataDir,
    getConfigPath,
    getProfilesDir,
    getUserAssetsDir,
    deriveCachePath,
    findFiveMPath,
    getConfig,
    saveConfig,
    exportConfigDialog,
    importConfigDialog
};
