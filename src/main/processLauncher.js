const { shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const {
    PRIORITY_FLAGS,
    VALID_AFFINITY_REGEX,
    getConfig
} = require("./configManager");
const { loadCacheProfile } = require("./cacheManager");
const { switchModProfile } = require("./modManager");
const { getServerById } = require("./serverManager");

let activeLaunchSession = null;

function isFiveMRunning() {
    return new Promise(resolve => {
        exec('tasklist /FI "IMAGENAME eq FiveM.exe"', (err, stdout) => {
            if (err || !stdout) {
                return resolve(false);
            }
            resolve(stdout.includes("FiveM.exe"));
        });
    });
}

function launchFiveMProcess(config) {
    const fivemPath = config.fivemPath;

    if (
        !fivemPath ||
        typeof fivemPath !== "string" ||
        path.extname(fivemPath).toLowerCase() !== ".exe" ||
        /["&|<>^`\r\n]/.test(fivemPath) ||
        !fs.existsSync(fivemPath)
    ) {
        throw new Error(
            "Lokasi FiveM.exe belum diatur atau tidak ditemukan. Pilih FiveM.exe di menu Pengaturan."
        );
    }

    const priorityKey = Object.prototype.hasOwnProperty.call(PRIORITY_FLAGS, config.priority)
        ? config.priority
        : "normal";
    const priorityFlag = PRIORITY_FLAGS[priorityKey];

    let affinityFlag = "";
    if (config.affinity) {
        if (!VALID_AFFINITY_REGEX.test(config.affinity)) {
            throw new Error("Nilai CPU Affinity tidak valid (harus berupa heksadesimal).");
        }
        affinityFlag = `/affinity ${config.affinity}`;
    }

    const command = `cmd /c start "" ${priorityFlag} ${affinityFlag} "${fivemPath}"`;
    console.log("Launching FiveM with priority:", priorityKey, "path:", fivemPath);
    exec(command);
}

function clearActiveLaunchSession() {
    if (activeLaunchSession) {
        if (activeLaunchSession.intervalId) {
            clearInterval(activeLaunchSession.intervalId);
        }
        if (activeLaunchSession.timeoutId) {
            clearTimeout(activeLaunchSession.timeoutId);
        }
        activeLaunchSession = null;
    }
}

function emitLaunchProgress(webContents, payload) {
    if (webContents && !webContents.isDestroyed()) {
        webContents.send("launch-progress", payload);
    }
}

async function launchServer(sender, serverId) {
    emitLaunchProgress(sender, {
        step: "checking",
        serverId,
        progress: 10,
        message: "Memeriksa proses FiveM.exe..."
    });

    if (await isFiveMRunning()) {
        emitLaunchProgress(sender, {
            step: "error",
            serverId,
            progress: 0,
            message: "FiveM sedang berjalan. Tutup aplikasi FiveM terlebih dahulu."
        });
        throw new Error("FiveM sedang berjalan. Tutup aplikasi FiveM terlebih dahulu.");
    }

    const server = getServerById(serverId);
    if (!server) {
        emitLaunchProgress(sender, {
            step: "error",
            serverId,
            progress: 0,
            message: "Server tidak ditemukan."
        });
        return false;
    }

    const config = getConfig();

    try {
        if (server.modProfile) {
            emitLaunchProgress(sender, {
                step: "mods",
                serverId: server.id,
                serverName: server.name,
                progress: 22,
                message: `Mengaktifkan profil mod "${server.modProfile}"...`
            });
            await switchModProfile(server.modProfile);
        }

        if (server.cacheProfile) {
            emitLaunchProgress(sender, {
                step: "cache",
                serverId: server.id,
                serverName: server.name,
                progress: 35,
                message: `Memuat profil cache "${server.cacheProfile}"...`
            });
            await loadCacheProfile(server.cacheProfile);
        }

        emitLaunchProgress(sender, {
            step: "launching",
            serverId: server.id,
            serverName: server.name,
            progress: 55,
            message: `Menjalankan FiveM.exe (Prioritas: ${config.priority.toUpperCase()})...`
        });

        launchFiveMProcess(config);
    } catch (err) {
        emitLaunchProgress(sender, {
            step: "error",
            serverId: server.id,
            serverName: server.name,
            progress: 0,
            message: err.message || "Gagal menjalankan FiveM."
        });
        throw err;
    }

    const joinUrl = server.connect.startsWith("http")
        ? server.connect
        : `https://${server.connect}`;

    const delayMs = config.launchDelay || 30000;
    const totalSeconds = Math.max(1, Math.ceil(delayMs / 1000));
    let remainingSeconds = totalSeconds;

    clearActiveLaunchSession();

    const finishConnect = () => {
        clearActiveLaunchSession();
        shell.openExternal(joinUrl);
        emitLaunchProgress(sender, {
            step: "connected",
            serverId: server.id,
            serverName: server.name,
            progress: 100,
            message: `Membuka koneksi ke ${server.name} di FiveM.`
        });
    };

    emitLaunchProgress(sender, {
        step: "countdown",
        serverId: server.id,
        serverName: server.name,
        remainingSeconds,
        totalSeconds,
        progress: 58,
        message: `Menunggu FiveM siap. Masuk ke ${server.name} dalam ${remainingSeconds}d`
    });

    const intervalId = setInterval(() => {
        remainingSeconds -= 1;

        if (remainingSeconds <= 0) {
            finishConnect();
            return;
        }

        const elapsedRatio = (totalSeconds - remainingSeconds) / totalSeconds;
        const progress = Math.min(98, Math.round(58 + elapsedRatio * 40));

        emitLaunchProgress(sender, {
            step: "countdown",
            serverId: server.id,
            serverName: server.name,
            remainingSeconds,
            totalSeconds,
            progress,
            message: `Menunggu FiveM siap. Masuk ke ${server.name} dalam ${remainingSeconds}d`
        });
    }, 1000);

    activeLaunchSession = {
        serverId: server.id,
        serverName: server.name,
        joinUrl,
        sender,
        intervalId,
        finishConnect
    };

    return true;
}

function connectNow() {
    if (!activeLaunchSession || typeof activeLaunchSession.finishConnect !== "function") {
        return false;
    }
    activeLaunchSession.finishConnect();
    return true;
}

function cancelLaunch() {
    if (!activeLaunchSession) {
        return false;
    }
    const { sender, serverId, serverName } = activeLaunchSession;
    clearActiveLaunchSession();
    emitLaunchProgress(sender, {
        step: "cancelled",
        serverId,
        serverName,
        progress: 0,
        message: `Koneksi otomatis ke ${serverName || "server"} dibatalkan.`
    });
    return true;
}

module.exports = {
    isFiveMRunning,
    launchFiveMProcess,
    launchServer,
    connectNow,
    cancelLaunch
};
