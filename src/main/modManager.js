const path = require("path");
const fs = require("fs");
const { shell } = require("electron");
const { getConfig, saveConfig } = require("./configManager");
const { formatBytes } = require("./cacheManager");

// FiveM menyimpan mods di FiveM.app/, dengan fallback ke FiveM.app/data/.
function resolveModsBaseDir() {
    const config = getConfig();

    const candidates = [];

    if (config.fivemPath && typeof config.fivemPath === "string") {
        const fivemDir = path.dirname(config.fivemPath);
        candidates.push(path.join(fivemDir, "FiveM.app"));
        candidates.push(path.join(fivemDir, "FiveM.app", "data"));
    }

    if (config.cachePath && typeof config.cachePath === "string") {
        candidates.push(path.dirname(config.cachePath));
        candidates.push(config.cachePath);
    }

    for (const dir of candidates) {
        if (dir && fs.existsSync(dir)) {
            try {
                const hasModsFolder = fs
                    .readdirSync(dir, { withFileTypes: true })
                    .some(
                        entry =>
                            entry.isDirectory() &&
                            /^mods(\s+.*|$)/i.test(entry.name.trim())
                    );
                if (hasModsFolder) {
                    return dir;
                }
            } catch {}
        }
    }

    for (const dir of candidates) {
        if (dir && fs.existsSync(dir)) {
            return dir;
        }
    }

    return null;
}

function isValidModFolderName(name) {
    if (typeof name !== "string") return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (
        trimmed.includes("..") ||
        trimmed.includes("/") ||
        trimmed.includes("\\") ||
        /[<>:"|?*\x00-\x1F]/.test(trimmed)
    ) {
        return false;
    }
    return /^mods(\s+.+|\b.*)?$/i.test(trimmed);
}

function normalizeNewModProfileName(rawName) {
    if (typeof rawName !== "string") return "";
    const trimmed = rawName.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";

    if (/^mods$/i.test(trimmed)) {
        return "mods baru";
    }
    if (/^mods\s+/i.test(trimmed)) {
        return `mods ${trimmed.replace(/^mods\s+/i, "").trim()}`;
    }
    return `mods ${trimmed}`;
}

async function analyzeModFolder(folderPath) {
    let totalBytes = 0;
    let rpfCount = 0;
    let fileCount = 0;

    async function walk(currentPath) {
        try {
            const stat = await fs.promises.lstat(currentPath);
            if (stat.isSymbolicLink()) return;
            if (stat.isFile()) {
                totalBytes += stat.size;
                fileCount += 1;
                if (currentPath.toLowerCase().endsWith(".rpf")) {
                    rpfCount += 1;
                }
                return;
            }
            if (!stat.isDirectory()) return;

            const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
            await Promise.all(
                entries.map(entry => walk(path.join(currentPath, entry.name)))
            );
        } catch {}
    }

    await walk(folderPath);
    return {
        sizeBytes: totalBytes,
        formattedSize: formatBytes(totalBytes),
        rpfCount,
        fileCount
    };
}

function findModDescription(modDescriptions, canonicalProfileName, folderName) {
    if (!modDescriptions || typeof modDescriptions !== "object") {
        return "";
    }

    const candidates = [canonicalProfileName, folderName].filter(Boolean);
    for (const candidate of candidates) {
        if (typeof modDescriptions[candidate] === "string" && modDescriptions[candidate].trim()) {
            return modDescriptions[candidate].trim();
        }
        const lowerCandidate = candidate.toLowerCase();
        for (const [key, val] of Object.entries(modDescriptions)) {
            if (key.toLowerCase() === lowerCandidate && typeof val === "string" && val.trim()) {
                return val.trim();
            }
        }
    }
    return "";
}

async function getModProfiles(serversList = []) {
    const baseDir = resolveModsBaseDir();
    const config = getConfig();
    const activeModOriginalName = config.activeModOriginalName || "";
    const modDescriptions =
        config.modDescriptions && typeof config.modDescriptions === "object"
            ? config.modDescriptions
            : {};

    if (!baseDir || !fs.existsSync(baseDir)) {
        return {
            baseDir: "",
            activeModOriginalName,
            profiles: [],
            totalBytes: 0,
            formattedTotalSize: "0 B"
        };
    }

    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    const modDirs = entries.filter(
        entry =>
            entry.isDirectory() &&
            /^mods(\s+.*|[-_].*|$)/i.test(entry.name.trim())
    );

    const profiles = await Promise.all(
        modDirs.map(async entry => {
            const folderName = entry.name;
            const fullPath = path.join(baseDir, folderName);
            const isActive = folderName.toLowerCase() === "mods";
            const stats = await analyzeModFolder(fullPath);

            const canonicalProfileName =
                isActive && activeModOriginalName ? activeModOriginalName : folderName;

            const description = findModDescription(
                modDescriptions,
                canonicalProfileName,
                folderName
            );

            const linkedServers = Array.isArray(serversList)
                ? serversList
                      .filter(s => {
                          if (!s.modProfile) return false;
                          const target = s.modProfile.toLowerCase();
                          return (
                              target === folderName.toLowerCase() ||
                              (isActive &&
                                  activeModOriginalName &&
                                  target === activeModOriginalName.toLowerCase())
                          );
                      })
                      .map(s => s.name)
                : [];

            return {
                folderName,
                displayName: isActive
                    ? activeModOriginalName
                        ? `mods (${activeModOriginalName})`
                        : "mods"
                    : folderName,
                canonicalProfileName,
                activeOriginLabel: isActive ? activeModOriginalName || "mods default" : "",
                description,
                isActive,
                fullPath,
                sizeBytes: stats.sizeBytes,
                formattedSize: stats.formattedSize,
                rpfCount: stats.rpfCount,
                fileCount: stats.fileCount,
                linkedServers
            };
        })
    );

    profiles.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return a.folderName.localeCompare(b.folderName);
    });

    const totalBytes = profiles.reduce((acc, item) => acc + item.sizeBytes, 0);

    return {
        baseDir,
        activeModOriginalName,
        profiles,
        totalBytes,
        formattedTotalSize: formatBytes(totalBytes)
    };
}

function resolveBackupNameForCurrentMods(baseDir, preferredOriginalName, targetFolderName) {
    if (
        preferredOriginalName &&
        preferredOriginalName.toLowerCase() !== "mods" &&
        preferredOriginalName.toLowerCase() !== String(targetFolderName || "").toLowerCase()
    ) {
        const candidatePath = path.join(baseDir, preferredOriginalName);
        if (!fs.existsSync(candidatePath)) {
            return preferredOriginalName;
        }
    }

    let baseCandidate = "mods default";
    let counter = 1;
    while (fs.existsSync(path.join(baseDir, baseCandidate))) {
        counter += 1;
        baseCandidate = `mods default ${counter}`;
    }
    return baseCandidate;
}

// Menukar folder `mods` aktif dengan profil target melalui operasi rename atomik.
async function switchModProfile(targetProfileName) {
    const baseDir = resolveModsBaseDir();
    if (!baseDir || !fs.existsSync(baseDir)) {
        throw new Error(
            "Direktori FiveM.app tidak ditemukan. Pilih FiveM.exe di menu Pengaturan."
        );
    }

    const cleanedTarget = String(targetProfileName || "").trim();
    if (!cleanedTarget || !isValidModFolderName(cleanedTarget)) {
        throw new Error("Nama profil mod tidak valid.");
    }

    const config = getConfig();
    const activeModsPath = path.join(baseDir, "mods");
    const hasActiveMods = fs.existsSync(activeModsPath);

    if (
        cleanedTarget.toLowerCase() === "mods" ||
        (hasActiveMods &&
            config.activeModOriginalName &&
            config.activeModOriginalName.toLowerCase() === cleanedTarget.toLowerCase() &&
            !fs.existsSync(path.join(baseDir, cleanedTarget)))
    ) {
        return {
            ok: true,
            alreadyActive: true,
            activeProfile: config.activeModOriginalName || "mods",
            previousModsRenamedTo: null
        };
    }

    const targetPath = path.join(baseDir, cleanedTarget);
    if (!fs.existsSync(targetPath)) {
        throw new Error(`Folder "${cleanedTarget}" tidak ditemukan di ${baseDir}.`);
    }

    let previousModsRenamedTo = null;

    if (hasActiveMods) {
        const backupFolderName = resolveBackupNameForCurrentMods(
            baseDir,
            config.activeModOriginalName,
            cleanedTarget
        );
        const backupPath = path.join(baseDir, backupFolderName);

        try {
            await fs.promises.rename(activeModsPath, backupPath);
            previousModsRenamedTo = backupFolderName;
        } catch (err) {
            throw new Error(
                `Gagal mengubah nama folder "mods" (${err.code || err.message}). Pastikan FiveM tidak sedang berjalan.`
            );
        }
    }

    try {
        await fs.promises.rename(targetPath, activeModsPath);
    } catch (err) {
        if (previousModsRenamedTo) {
            try {
                await fs.promises.rename(
                    path.join(baseDir, previousModsRenamedTo),
                    activeModsPath
                );
            } catch {}
        }
        throw new Error(
            `Gagal mengaktifkan "${cleanedTarget}" menjadi "mods" (${err.code || err.message}).`
        );
    }

    if (previousModsRenamedTo) {
        if (!config.modDescriptions || typeof config.modDescriptions !== "object") {
            config.modDescriptions = {};
        }
        const existingModsDesc = config.modDescriptions["mods"];
        if (existingModsDesc && !config.modDescriptions[previousModsRenamedTo]) {
            config.modDescriptions[previousModsRenamedTo] = existingModsDesc;
            delete config.modDescriptions["mods"];
        }
    }

    config.activeModOriginalName = cleanedTarget;
    saveConfig(config);

    return {
        ok: true,
        alreadyActive: false,
        activeProfile: cleanedTarget,
        previousModsRenamedTo
    };
}

function saveModDescription(profileName, descriptionText) {
    const cleanedKey = String(profileName || "").trim();
    if (!cleanedKey || !isValidModFolderName(cleanedKey)) {
        throw new Error("Nama profil mod tidak valid.");
    }

    const cleanedDesc = String(descriptionText || "").trim().slice(0, 250);
    const config = getConfig();

    if (!config.modDescriptions || typeof config.modDescriptions !== "object") {
        config.modDescriptions = {};
    }

    const targetKey =
        cleanedKey.toLowerCase() === "mods" && config.activeModOriginalName
            ? config.activeModOriginalName
            : cleanedKey;

    for (const existingKey of Object.keys(config.modDescriptions)) {
        if (
            existingKey.toLowerCase() === targetKey.toLowerCase() ||
            (cleanedKey.toLowerCase() === "mods" && existingKey.toLowerCase() === "mods")
        ) {
            delete config.modDescriptions[existingKey];
        }
    }

    if (cleanedDesc) {
        config.modDescriptions[targetKey] = cleanedDesc;
    }

    saveConfig(config);

    return {
        ok: true,
        profileName: targetKey,
        description: cleanedDesc
    };
}

async function createNewModProfile(rawProfileName) {
    const baseDir = resolveModsBaseDir();
    if (!baseDir || !fs.existsSync(baseDir)) {
        throw new Error(
            "Direktori FiveM.app tidak ditemukan. Pilih FiveM.exe di menu Pengaturan."
        );
    }

    const folderName = normalizeNewModProfileName(rawProfileName);
    if (!folderName || !isValidModFolderName(folderName)) {
        throw new Error(
            "Nama folder tidak valid. Hindari karakter simbol seperti / \\ : * ? \" < > |"
        );
    }

    const targetPath = path.join(baseDir, folderName);
    if (fs.existsSync(targetPath)) {
        throw new Error(`Folder "${folderName}" sudah ada.`);
    }

    await fs.promises.mkdir(targetPath, { recursive: true });
    return {
        ok: true,
        folderName,
        fullPath: targetPath
    };
}

async function openModFolder(folderName) {
    const baseDir = resolveModsBaseDir();
    if (!baseDir || !fs.existsSync(baseDir)) {
        throw new Error("Direktori FiveM.app tidak ditemukan.");
    }

    const targetName = String(folderName || "mods").trim();
    if (!isValidModFolderName(targetName)) {
        throw new Error("Nama folder tidak valid.");
    }

    const fullPath = path.join(baseDir, targetName);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Folder "${targetName}" tidak ditemukan.`);
    }

    await shell.openPath(fullPath);
    return true;
}

module.exports = {
    resolveModsBaseDir,
    isValidModFolderName,
    getModProfiles,
    switchModProfile,
    saveModDescription,
    createNewModProfile,
    openModFolder
};
