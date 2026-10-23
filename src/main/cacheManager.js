const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const { getProfilesDir, getConfig } = require("./configManager");

function isValidProfileName(name) {
    if (typeof name !== "string") {
        return false;
    }

    const trimmed = name.trim();
    if (!trimmed) {
        return false;
    }

    if (
        trimmed.includes("..") ||
        trimmed.includes("/") ||
        trimmed.includes("\\") ||
        /[<>:"|?*\x00-\x1F]/.test(trimmed)
    ) {
        return false;
    }

    const profilesDir = getProfilesDir();
    const resolved = path.resolve(profilesDir, trimmed);
    const relative = path.relative(profilesDir, resolved);

    return Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveProfilePath(profileName) {
    if (!isValidProfileName(profileName)) {
        throw new Error(
            "Nama profil tidak valid. Hindari karakter garis miring atau '..'."
        );
    }
    return path.join(getProfilesDir(), profileName.trim());
}

function formatBytes(bytes) {
    const num = Number(bytes) || 0;
    if (num <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(num) / Math.log(1024)));
    const value = num / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

async function calculateDirectorySize(dirPath) {
    try {
        const stat = await fs.promises.lstat(dirPath);
        if (stat.isSymbolicLink()) {
            return 0;
        }
        if (stat.isFile()) {
            return stat.size;
        }
        if (!stat.isDirectory()) {
            return 0;
        }

        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const sizes = await Promise.all(
            entries.map(entry => calculateDirectorySize(path.join(dirPath, entry.name)))
        );
        return sizes.reduce((acc, curr) => acc + curr, 0);
    } catch {
        return 0;
    }
}

// Lepas tautan junction tanpa menghapus isi asli di userData/Profiles.
async function safeRemoveCacheTarget(targetPath) {
    let stat;
    try {
        stat = await fs.promises.lstat(targetPath);
    } catch (err) {
        if (err.code === "ENOENT") {
            return;
        }
        throw err;
    }

    if (stat.isSymbolicLink()) {
        try {
            await fs.promises.unlink(targetPath);
        } catch {
            await fs.promises.rmdir(targetPath);
        }
        return;
    }

    await fsExtra.remove(targetPath);
}

function isJunctionPointingTo(targetPath, expectedSourcePath) {
    try {
        const stat = fs.lstatSync(targetPath);
        if (!stat.isSymbolicLink()) {
            return false;
        }
        const realTarget = fs.realpathSync(targetPath);
        const realExpected = fs.realpathSync(expectedSourcePath);
        return realTarget.toLowerCase() === realExpected.toLowerCase();
    } catch {
        return false;
    }
}

function getActiveLinkedProfileName() {
    const config = getConfig();
    if (!config.cachePath) return null;

    const targetServerCache = path.join(config.cachePath, "server-cache");
    try {
        const stat = fs.lstatSync(targetServerCache);
        if (!stat.isSymbolicLink()) {
            return null;
        }
        const realTarget = fs.realpathSync(targetServerCache);
        const profilesDir = fs.realpathSync(getProfilesDir());
        const rel = path.relative(profilesDir, realTarget);
        if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
            const parts = rel.split(path.sep);
            return parts[0] || null;
        }
    } catch {}
    return null;
}

function createProfile(profileName) {
    const profilePath = resolveProfilePath(profileName);

    if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
    }

    return true;
}

async function saveCacheProfile(profileName) {
    const profilePath = resolveProfilePath(profileName);
    const config = getConfig();
    const cachePath = config.cachePath;

    if (!cachePath || !fs.existsSync(cachePath)) {
        throw new Error(
            "Folder data FiveM tidak ditemukan. Pastikan lokasi FiveM.exe sudah diatur di Pengaturan."
        );
    }

    const sourceServerCache = path.join(cachePath, "server-cache");
    const sourceServerCachePriv = path.join(cachePath, "server-cache-priv");

    const destServerCache = path.join(profilePath, "server-cache");
    const destServerCachePriv = path.join(profilePath, "server-cache-priv");

    if (isJunctionPointingTo(sourceServerCache, destServerCache)) {
        return true;
    }

    if (!fs.existsSync(sourceServerCache) && !fs.existsSync(sourceServerCachePriv)) {
        throw new Error("Cache FiveM saat ini masih kosong.");
    }

    fs.mkdirSync(profilePath, { recursive: true });

    if (fs.existsSync(sourceServerCache)) {
        const realSource = fs.realpathSync(sourceServerCache);
        await fsExtra.copy(realSource, destServerCache, { dereference: true });
    }

    if (fs.existsSync(sourceServerCachePriv)) {
        const realSourcePriv = fs.realpathSync(sourceServerCachePriv);
        await fsExtra.copy(realSourcePriv, destServerCachePriv, { dereference: true });
    }

    return true;
}

async function loadCacheProfile(profileName) {
    let profilePath;
    try {
        profilePath = resolveProfilePath(profileName);
    } catch (err) {
        return {
            success: false,
            mode: null,
            error: err.message || "Nama profil tidak valid."
        };
    }

    const config = getConfig();
    const cachePath = config.cachePath;

    if (!cachePath || !fs.existsSync(cachePath)) {
        const warnMsg = "Cache path FiveM belum tersedia. Pilih FiveM.exe di menu Pengaturan.";
        console.warn(warnMsg);
        return {
            success: false,
            mode: null,
            error: warnMsg
        };
    }

    const profileServerCache = path.join(profilePath, "server-cache");
    const profileServerCachePriv = path.join(profilePath, "server-cache-priv");

    const targetServerCache = path.join(cachePath, "server-cache");
    const targetServerCachePriv = path.join(cachePath, "server-cache-priv");

    if (config.cacheMode === "junction") {
        try {
            fs.mkdirSync(profileServerCache, { recursive: true });
            fs.mkdirSync(profileServerCachePriv, { recursive: true });

            if (!isJunctionPointingTo(targetServerCache, profileServerCache)) {
                await safeRemoveCacheTarget(targetServerCache);
                await fs.promises.symlink(profileServerCache, targetServerCache, "junction");
            }

            if (!isJunctionPointingTo(targetServerCachePriv, profileServerCachePriv)) {
                await safeRemoveCacheTarget(targetServerCachePriv);
                await fs.promises.symlink(profileServerCachePriv, targetServerCachePriv, "junction");
            }

            console.log(`Cache profile "${profileName}" ditautkan melalui Directory Junction.`);
            return {
                success: true,
                mode: "junction",
                error: null
            };
        } catch (err) {
            console.warn(
                `Gagal membuat Directory Junction (${err.message}), melakukan fallback ke mode salin...`
            );
        }
    }

    if (!fs.existsSync(profileServerCache)) {
        fs.mkdirSync(profilePath, { recursive: true });
        return {
            success: false,
            mode: null,
            error: `Profil "${profileName}" belum memiliki data server-cache tersimpan.`
        };
    }

    try {
        await safeRemoveCacheTarget(targetServerCache);
        await fsExtra.copy(profileServerCache, targetServerCache);

        if (fs.existsSync(profileServerCachePriv)) {
            await safeRemoveCacheTarget(targetServerCachePriv);
            await fsExtra.copy(profileServerCachePriv, targetServerCachePriv);
        }

        return {
            success: true,
            mode: "copy",
            error: null
        };
    } catch (err) {
        return {
            success: false,
            mode: null,
            error: err.message || "Gagal menyalin direktori server-cache."
        };
    }
}

function getProfiles() {
    const profilesDir = getProfilesDir();

    if (!fs.existsSync(profilesDir)) {
        return [];
    }

    return fs
        .readdirSync(profilesDir, { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);
}

async function getProfilesDetailed(serversList = []) {
    const profileNames = getProfiles();
    const activeLinkedProfile = getActiveLinkedProfileName();

    const details = await Promise.all(
        profileNames.map(async name => {
            const profilePath = path.join(getProfilesDir(), name);
            const serverCacheDir = path.join(profilePath, "server-cache");
            const privCacheDir = path.join(profilePath, "server-cache-priv");

            const [sizeMain, sizePriv] = await Promise.all([
                calculateDirectorySize(serverCacheDir),
                calculateDirectorySize(privCacheDir)
            ]);

            const totalBytes = sizeMain + sizePriv;
            const hasCache = totalBytes > 0 || fs.existsSync(serverCacheDir);
            const linkedServers = Array.isArray(serversList)
                ? serversList
                      .filter(s => s.cacheProfile === name)
                      .map(s => s.name)
                : [];

            return {
                name,
                sizeBytes: totalBytes,
                formattedSize: formatBytes(totalBytes),
                hasCache,
                status: totalBytes > 0 ? "Tersimpan" : "Kosong",
                isActiveJunction: activeLinkedProfile === name,
                linkedServers
            };
        })
    );

    const totalAllBytes = details.reduce((acc, item) => acc + item.sizeBytes, 0);

    return {
        profiles: details,
        totalBytes: totalAllBytes,
        formattedTotalSize: formatBytes(totalAllBytes),
        activeLinkedProfile
    };
}

async function deleteProfile(profileName) {
    const profilePath = resolveProfilePath(profileName);

    if (!fs.existsSync(profilePath)) {
        throw new Error("Profil cache tidak ditemukan.");
    }

    // Lepas junction aktif terlebih dahulu sebelum menghapus folder profil.
    const config = getConfig();
    if (config.cachePath) {
        const targetServerCache = path.join(config.cachePath, "server-cache");
        const targetServerCachePriv = path.join(config.cachePath, "server-cache-priv");
        const profileServerCache = path.join(profilePath, "server-cache");
        const profileServerCachePriv = path.join(profilePath, "server-cache-priv");

        if (isJunctionPointingTo(targetServerCache, profileServerCache)) {
            await safeRemoveCacheTarget(targetServerCache);
        }
        if (isJunctionPointingTo(targetServerCachePriv, profileServerCachePriv)) {
            await safeRemoveCacheTarget(targetServerCachePriv);
        }
    }

    await fsExtra.remove(profilePath);
    return true;
}

module.exports = {
    isValidProfileName,
    resolveProfilePath,
    formatBytes,
    createProfile,
    saveCacheProfile,
    loadCacheProfile,
    getProfiles,
    getProfilesDetailed,
    deleteProfile
};
