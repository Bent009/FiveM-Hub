const path = require("path");
const fs = require("fs");
const { getConfig, findFiveMPath } = require("./configManager");
const { isFiveMRunning } = require("./processLauncher");
const { formatBytes } = require("./cacheManager");

function resolveFiveMAppDir() {
    const config = getConfig();
    let fivemPath = config.fivemPath;
    if (!fivemPath || !fs.existsSync(fivemPath)) {
        fivemPath = findFiveMPath();
    }
    if (!fivemPath) {
        return null;
    }
    const appDir = path.join(path.dirname(fivemPath), "FiveM.app");
    return fs.existsSync(appDir) ? appDir : null;
}

async function getFolderSizeAndCount(targetDir) {
    let size = 0;
    let count = 0;
    if (!fs.existsSync(targetDir)) {
        return { size, count };
    }
    async function scan(dir) {
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isSymbolicLink()) continue;
                if (entry.isFile()) {
                    try {
                        const stat = await fs.promises.stat(fullPath);
                        size += stat.size;
                        count += 1;
                    } catch {}
                } else if (entry.isDirectory()) {
                    await scan(fullPath);
                }
            }
        } catch {}
    }
    await scan(targetDir);
    return { size, count };
}

async function emptyDirectory(targetDir) {
    let deletedCount = 0;
    let deletedBytes = 0;
    if (!fs.existsSync(targetDir)) {
        return { deletedCount, deletedBytes };
    }
    try {
        const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(targetDir, entry.name);
            try {
                const stat = await fs.promises.stat(fullPath);
                if (entry.isDirectory()) {
                    const sub = await getFolderSizeAndCount(fullPath);
                    await fs.promises.rm(fullPath, { recursive: true, force: true });
                    deletedBytes += sub.size;
                    deletedCount += sub.count;
                } else {
                    await fs.promises.unlink(fullPath);
                    deletedBytes += stat.size;
                    deletedCount += 1;
                }
            } catch {}
        }
    } catch {}
    return { deletedCount, deletedBytes };
}

async function getCleanupStats() {
    const appDir = resolveFiveMAppDir();
    if (!appDir) {
        return {
            available: false,
            message: "Lokasi FiveM.app belum terdeteksi. Atur FiveM.exe di menu Pengaturan.",
            crashesBytes: 0,
            crashesCount: 0,
            formattedCrashesSize: "0 B",
            logsBytes: 0,
            logsCount: 0,
            formattedLogsSize: "0 B",
            totalBytes: 0,
            totalCount: 0,
            formattedTotalSize: "0 B",
            canClean: false
        };
    }

    const crashesDir = path.join(appDir, "crashes");
    const logsDir = path.join(appDir, "logs");

    const [crashes, logs] = await Promise.all([
        getFolderSizeAndCount(crashesDir),
        getFolderSizeAndCount(logsDir)
    ]);

    const totalBytes = crashes.size + logs.size;
    const totalCount = crashes.count + logs.count;

    return {
        available: true,
        appDir,
        crashesBytes: crashes.size,
        crashesCount: crashes.count,
        formattedCrashesSize: formatBytes(crashes.size),
        logsBytes: logs.size,
        logsCount: logs.count,
        formattedLogsSize: formatBytes(logs.size),
        totalBytes,
        totalCount,
        formattedTotalSize: formatBytes(totalBytes),
        canClean: totalBytes > 0
    };
}

async function performCleanup() {
    if (await isFiveMRunning()) {
        throw new Error(
            "Tidak dapat membersihkan cache/crash dump saat FiveM sedang berjalan. Tutup FiveM terlebih dahulu."
        );
    }

    const appDir = resolveFiveMAppDir();
    if (!appDir) {
        throw new Error("Direktori FiveM.app tidak ditemukan. Atur FiveM.exe di menu Pengaturan.");
    }

    const crashesDir = path.join(appDir, "crashes");
    const logsDir = path.join(appDir, "logs");

    const [crashesClean, logsClean] = await Promise.all([
        emptyDirectory(crashesDir),
        emptyDirectory(logsDir)
    ]);

    const totalCleanedBytes = crashesClean.deletedBytes + logsClean.deletedBytes;
    const totalCleanedCount = crashesClean.deletedCount + logsClean.deletedCount;

    return {
        success: true,
        cleanedBytes: totalCleanedBytes,
        cleanedCount: totalCleanedCount,
        formattedCleanedSize: formatBytes(totalCleanedBytes),
        message:
            totalCleanedCount > 0
                ? `Berhasil membersihkan ${totalCleanedCount} file sampah (${formatBytes(totalCleanedBytes)}).`
                : "Direktori crash dan log FiveM sudah bersih."
    };
}

module.exports = {
    getCleanupStats,
    performCleanup
};
