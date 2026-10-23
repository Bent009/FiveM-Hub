const fs = require("fs");
const path = require("path");
const net = require("net");
const { pathToFileURL } = require("url");
const { net: electronNet } = require("electron");
const { getConfig, getUserDataDir } = require("./configManager");

const BROWSER_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    Origin: "https://servers.fivem.net",
    Referer: "https://servers.fivem.net/"
};

// Cache in-memory untuk Data URI icon agar tidak mengunduh ulang setiap polling
const iconDataUriMemoryCache = new Map();

function cleanFiveMText(raw) {
    if (typeof raw !== "string") {
        return "";
    }
    return raw
        .replace(/\^[0-9a-zA-Z]/g, "")
        .replace(/~[a-zA-Z]+~/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

async function performBrowserFetch(url, extraHeaders = {}, timeoutMs = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const fetchFn =
        electronNet && typeof electronNet.fetch === "function"
            ? electronNet.fetch.bind(electronNet)
            : fetch;

    try {
        return await fetchFn(url, {
            method: "GET",
            headers: {
                ...BROWSER_HEADERS,
                ...extraHeaders
            },
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

function getServerIconsCacheDir() {
    const dir = path.join(getUserDataDir(), "server-icons");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

async function resolveAndCacheServerIcon(cleanEp, iconVersion) {
    if (iconVersion === undefined || iconVersion === null || iconVersion === "") {
        return { dataUri: "", fileUrl: "", remoteUrl: "" };
    }

    const remoteUrl = `https://frontend.cfx-services.net/api/servers/icon/${encodeURIComponent(cleanEp)}/${encodeURIComponent(String(iconVersion))}.png`;
    const cacheKey = `${cleanEp}:${iconVersion}`;

    if (iconDataUriMemoryCache.has(cacheKey)) {
        return iconDataUriMemoryCache.get(cacheKey);
    }

    const iconsDir = getServerIconsCacheDir();
    const iconFilePath = path.join(iconsDir, `${cleanEp}.png`);

    try {
        const response = await performBrowserFetch(
            remoteUrl,
            { Accept: "image/avif,image/webp,image/apng,image/png,image/*,*/*;q=0.8" },
            6000
        );

        if (response.ok) {
            const arrayBuf = await response.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            if (buf.length > 0) {
                try {
                    fs.writeFileSync(iconFilePath, buf);
                } catch {}
                const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
                const fileUrl = pathToFileURL(iconFilePath).href;
                const result = { dataUri, fileUrl, remoteUrl };
                iconDataUriMemoryCache.set(cacheKey, result);
                return result;
            }
        }
    } catch {}

    if (fs.existsSync(iconFilePath)) {
        try {
            const buf = fs.readFileSync(iconFilePath);
            if (buf.length > 0) {
                const dataUri = `data:image/png;base64,${buf.toString("base64")}`;
                const fileUrl = pathToFileURL(iconFilePath).href;
                return { dataUri, fileUrl, remoteUrl };
            }
        } catch {}
    }

    return { dataUri: remoteUrl, fileUrl: remoteUrl, remoteUrl };
}

function measureTcpPing(host, port, timeoutMs = 2000) {
    return new Promise(resolve => {
        if (!host || !port) return resolve(null);
        const start = Date.now();
        const socket = net.createConnection({
            host: String(host).trim(),
            port: Number(port),
            timeout: timeoutMs
        });
        socket.on("connect", () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve(latency);
        });
        socket.on("timeout", () => {
            socket.destroy();
            resolve(null);
        });
        socket.on("error", () => {
            socket.destroy();
            resolve(null);
        });
    });
}

async function fetchFromCfxPublic(endpoint) {
    const cleanEp = String(endpoint || "").trim().toLowerCase();
    const urls = [
        `https://frontend.cfx-services.net/api/servers/single/${encodeURIComponent(cleanEp)}`,
        `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(cleanEp)}`
    ];

    let response = null;
    let lastStatus = 404;
    let httpLatencyMs = null;

    for (const url of urls) {
        try {
            const fetchStart = Date.now();
            const res = await performBrowserFetch(url, {}, 6500);
            lastStatus = res.status;
            if (res.ok) {
                httpLatencyMs = Math.round(Date.now() - fetchStart);
                response = res;
                break;
            }
        } catch {}
    }

    if (!response || !response.ok) {
        const err = new Error(`Cfx.re HTTP ${lastStatus}`);
        err.status = lastStatus;
        throw err;
    }

    const json = await response.json();
    const serverData = json?.Data || json;

    if (!serverData || typeof serverData !== "object") {
        throw new Error("Invalid Cfx.re response payload");
    }

    let pingMs = httpLatencyMs;
    const endpoints = serverData.connectEndPoints;
    if (Array.isArray(endpoints) && endpoints.length > 0) {
        const rawEp = String(endpoints[0] || "").trim();
        const parts = rawEp.split(":");
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
            try {
                const tcpPing = await measureTcpPing(parts[0], Number(parts[1]), 1800);
                if (typeof tcpPing === "number") {
                    pingMs = tcpPing;
                }
            } catch {}
        }
    }

    const vars = serverData.vars && typeof serverData.vars === "object" ? serverData.vars : {};
    const iconVersion = serverData.iconVersion;
    const iconResolved = await resolveAndCacheServerIcon(cleanEp, iconVersion);
    const iconUrl = iconResolved.dataUri || iconResolved.remoteUrl || "";

    const bannerDetail = String(vars.banner_detail || vars.banner_connecting || "").trim();
    const bannerConnecting = String(vars.banner_connecting || vars.banner_detail || "").trim();
    const hostname = cleanFiveMText(vars.sv_projectName || serverData.hostname || "");
    const projectDesc = cleanFiveMText(vars.sv_projectDesc || "");
    const build = String(vars.sv_enforceGameBuild || serverData.server || "").trim() || "-";
    const onesync = String(vars.onesync_enabled || vars.onesync || "").trim();
    const tagsRaw = vars.tags || "";
    const tags = Array.isArray(tagsRaw)
        ? tagsRaw.map(t => String(t).trim()).filter(Boolean)
        : String(tagsRaw)
              .split(",")
              .map(tag => tag.trim())
              .filter(Boolean);

    const ownerName = String(serverData.ownerName || "").trim();
    const ownerAvatar = String(serverData.ownerAvatar || "").trim();
    const resourcesList = Array.isArray(serverData.resources) ? serverData.resources : [];
    const rawPlayers = Array.isArray(serverData.players) ? serverData.players : [];

    const playersList = rawPlayers.map(p => ({
        id: p.id ?? "-",
        name: cleanFiveMText(p.name || "Player"),
        ping: Number(p.ping) || 0
    }));

    return {
        online: true,
        endpoint: cleanEp,
        pingMs: typeof pingMs === "number" ? Math.max(1, pingMs) : null,
        players: Number(serverData.clients) || 0,
        maxPlayers: Number(serverData.sv_maxclients) || 0,
        hostname,
        projectDesc,
        build,
        iconVersion: iconVersion ?? null,
        iconUrl,
        logoUrl: iconUrl,
        logo: iconResolved.fileUrl || iconUrl,
        iconFileUrl: iconResolved.fileUrl || "",
        bannerDetail,
        bannerConnecting,
        onesync,
        tags,
        ownerName,
        ownerAvatar,
        resourcesCount: resourcesList.length,
        resources: resourcesList.slice(0, 150),
        playersList,
        playerList: playersList,
        source: "cfx"
    };
}

async function fetchFromFiveStats(endpoint, apiKey) {
    const cleanEp = String(endpoint || "").trim().toLowerCase();
    const url = `https://fivestats.io/api/servers/${encodeURIComponent(cleanEp)}`;
    const extraHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

    const fetchStart = Date.now();
    const response = await performBrowserFetch(url, extraHeaders, 5000);
    const httpLatencyMs = Math.round(Date.now() - fetchStart);

    if (!response.ok) {
        throw new Error(`FiveStats HTTP ${response.status}`);
    }

    const data = await response.json();
    const payload = data?.Data || data || {};
    const vars = payload.vars && typeof payload.vars === "object" ? payload.vars : {};

    const hostname = cleanFiveMText(
        payload.project_name ||
            vars.sv_projectName ||
            payload.clean_name ||
            payload.hostname ||
            payload.name ||
            ""
    );
    const projectDesc = cleanFiveMText(
        payload.project_desc || vars.sv_projectDesc || payload.projectDesc || ""
    );
    const build =
        String(vars.sv_enforceGameBuild || payload.build || payload.server_version || "").trim() ||
        "-";
    const iconVersion = payload.iconVersion ?? payload.icon_version ?? data?.icon_version;
    const iconResolved = await resolveAndCacheServerIcon(cleanEp, iconVersion);
    const iconUrl = iconResolved.dataUri || iconResolved.remoteUrl || "";

    const bannerDetail = String(
        payload.banner_detail || vars.banner_detail || vars.banner_connecting || ""
    ).trim();
    const bannerConnecting = String(
        vars.banner_connecting || payload.banner_detail || vars.banner_detail || ""
    ).trim();

    const tagsRaw = payload.tags || vars.tags || "";
    const tags = Array.isArray(tagsRaw)
        ? tagsRaw.map(t => String(t).trim()).filter(Boolean)
        : String(tagsRaw)
              .split(",")
              .map(tag => tag.trim())
              .filter(Boolean);

    const playersList = Array.isArray(payload.players)
        ? payload.players.map(p => ({
              id: p.id ?? "-",
              name: cleanFiveMText(p.name || "Player"),
              ping: Number(p.ping) || 0
          }))
        : [];

    return {
        online: true,
        endpoint: cleanEp,
        pingMs: Math.max(1, httpLatencyMs),
        players: Number(payload.clients ?? data?.clients) || 0,
        maxPlayers: Number(payload.sv_maxclients ?? data?.sv_maxclients) || 0,
        hostname,
        projectDesc,
        build,
        iconVersion: iconVersion ?? null,
        iconUrl,
        logoUrl: iconUrl,
        logo: iconResolved.fileUrl || iconUrl,
        iconFileUrl: iconResolved.fileUrl || "",
        bannerDetail,
        bannerConnecting,
        onesync: String(vars.onesync_enabled || vars.onesync || "").trim(),
        tags,
        ownerName: String(payload.ownerName || payload.owner_name || payload.owner || "").trim(),
        ownerAvatar: String(payload.ownerAvatar || payload.owner_profile || "").trim(),
        resourcesCount: Array.isArray(payload.resources) ? payload.resources.length : 0,
        resources: Array.isArray(payload.resources) ? payload.resources.slice(0, 150) : [],
        playersList,
        playerList: playersList,
        source: "fivestats"
    };
}

async function getServerStatus(endpoint) {
    if (!endpoint || typeof endpoint !== "string") {
        return { online: false, pingMs: null, players: 0, maxPlayers: 0 };
    }

    const cleanEndpoint = endpoint.trim().toLowerCase();
    const config = getConfig();

    try {
        return await fetchFromCfxPublic(cleanEndpoint);
    } catch {
        try {
            return await fetchFromFiveStats(cleanEndpoint, config.apiKey || "");
        } catch {}

        return {
            online: false,
            endpoint: cleanEndpoint,
            pingMs: null,
            players: 0,
            maxPlayers: 0
        };
    }
}

module.exports = {
    cleanFiveMText,
    fetchFromCfxPublic,
    fetchFromFiveStats,
    getServerStatus
};
