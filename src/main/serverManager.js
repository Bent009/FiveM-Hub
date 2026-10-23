const path = require("path");
const fs = require("fs");
const {
    getAppRootDir,
    getUserDataDir,
    getConfig,
    saveConfig,
    isProOrDev
} = require("./configManager");
const { isValidProfileName, createProfile } = require("./cacheManager");
const { fetchFromCfxPublic, fetchFromFiveStats } = require("./serverStatusService");

function getUserServersPath() {
    return path.join(getUserDataDir(), "servers.json");
}

function getBundledServersPath() {
    return path.join(getAppRootDir(), "data", "servers.json");
}

function ensureServersInitialized() {
    const userServersPath = getUserServersPath();
    if (fs.existsSync(userServersPath)) {
        return userServersPath;
    }

    const dir = path.dirname(userServersPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const bundledPath = getBundledServersPath();
    if (fs.existsSync(bundledPath)) {
        fs.copyFileSync(bundledPath, userServersPath);
    } else {
        fs.writeFileSync(userServersPath, "[]", "utf8");
    }

    return userServersPath;
}

function getServers() {
    const serversPath = ensureServersInitialized();
    try {
        const parsed = JSON.parse(fs.readFileSync(serversPath, "utf8"));
        if (!Array.isArray(parsed)) return [];
        return parsed.map(s => {
            if (typeof s.logo === "string" && s.logo.includes("servers-frontend.fivem.net")) {
                s.logo = s.logo.replace(
                    "https://servers-frontend.fivem.net/",
                    "https://frontend.cfx-services.net/"
                );
            }
            return s;
        });
    } catch (err) {
        console.error("Gagal membaca servers.json:", err.message);
        return [];
    }
}

function saveServersList(servers) {
    const serversPath = ensureServersInitialized();
    fs.writeFileSync(serversPath, JSON.stringify(servers, null, 2), "utf8");
    return servers;
}

function getServerById(serverId) {
    const servers = getServers();
    return servers.find(s => s.id === serverId) || null;
}

function extractEndpoint(rawInput) {
    if (typeof rawInput !== "string") {
        return "";
    }

    const cleaned = rawInput
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^cfx\.re\/join\//i, "")
        .replace(/^servers\.fivem\.net\/servers\/detail\//i, "")
        .replace(/\/+$/, "")
        .trim()
        .toLowerCase();

    if (!cleaned || !/^[a-z0-9_-]{3,32}$/i.test(cleaned)) {
        return "";
    }

    return cleaned;
}

function generateSlugId(name, existingIds = []) {
    const base = String(name || "server")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 28) || "server";

    if (!existingIds.includes(base)) {
        return base;
    }

    let counter = 2;
    while (existingIds.includes(`${base}-${counter}`)) {
        counter += 1;
    }
    return `${base}-${counter}`;
}

async function resolveServerMetadataWithFallback(endpoint) {
    try {
        return await fetchFromCfxPublic(endpoint);
    } catch (cfxErr) {
        const config = getConfig();
        try {
            return await fetchFromFiveStats(endpoint, config.apiKey || "");
        } catch {
            throw cfxErr;
        }
    }
}

async function fetchCfxMetadataForForm(rawInput) {
    const endpoint = extractEndpoint(rawInput);
    if (!endpoint) {
        return {
            ok: false,
            endpoint: "",
            error: "Kode join atau URL Cfx.re tidak valid. Contoh: cfx.re/join/237yxy"
        };
    }

    try {
        const meta = await resolveServerMetadataWithFallback(endpoint);
        const suggestedSlug = generateSlugId(meta.hostname || endpoint, []);
        const resolvedLogo = meta.logoUrl || meta.iconUrl || meta.logo || "";

        const data = {
            endpoint,
            name: meta.hostname || `Server ${endpoint}`,
            build: meta.build || "-",
            cacheProfile: suggestedSlug,
            logo: resolvedLogo,
            logoUrl: resolvedLogo,
            iconFileUrl: meta.iconFileUrl || "",
            banner: meta.bannerDetail || meta.bannerConnecting || "",
            projectDesc: meta.projectDesc || "",
            ownerName: meta.ownerName || "",
            ownerAvatar: meta.ownerAvatar || "",
            onesync: meta.onesync || "",
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            resourcesCount: Number(meta.resourcesCount) || 0,
            players: Number(meta.players) || 0,
            maxPlayers: Number(meta.maxPlayers) || 0,
            playersList: Array.isArray(meta.playersList) ? meta.playersList : [],
            source: meta.source || "cfx"
        };

        return {
            ok: true,
            endpoint,
            data,
            ...data
        };
    } catch (err) {
        const status = err?.status || (String(err?.message || "").includes("404") ? 404 : null);
        const friendlyError =
            status === 404
                ? "Server tidak ditemukan atau sedang offline (404)"
                : `Server tidak dapat dijangkau (${err?.message || "Offline"})`;

        return {
            ok: false,
            endpoint,
            error: friendlyError
        };
    }
}

function syncServerMetadataFromStatus(endpoint, statusData) {
    if (!endpoint || !statusData || !statusData.online) {
        return null;
    }

    const servers = getServers();
    const idx = servers.findIndex(
        s => String(s.endpoint || "").toLowerCase() === String(endpoint).toLowerCase()
    );
    if (idx === -1) {
        return null;
    }

    const current = servers[idx];
    let changed = false;

    const persistableLogo = statusData.iconFileUrl || statusData.logoUrl || statusData.iconUrl || "";
    if (persistableLogo && current.logo !== persistableLogo) {
        if (
            !current.fallbackLogo &&
            current.logo &&
            !/^(https?:|file:|data:)/i.test(current.logo)
        ) {
            current.fallbackLogo = current.logo;
        }
        current.logo = persistableLogo;
        changed = true;
    }

    if (statusData.bannerDetail && current.banner !== statusData.bannerDetail) {
        current.banner = statusData.bannerDetail;
        changed = true;
    }

    if (
        statusData.build &&
        statusData.build !== "-" &&
        (statusData.source === "cfx" || !current.build || current.build === "-") &&
        current.build !== statusData.build
    ) {
        current.build = statusData.build;
        changed = true;
    }

    if (statusData.projectDesc && current.projectDesc !== statusData.projectDesc) {
        current.projectDesc = statusData.projectDesc;
        changed = true;
    }

    if (statusData.ownerName && current.ownerName !== statusData.ownerName) {
        current.ownerName = statusData.ownerName;
        changed = true;
    }

    if (statusData.onesync && current.onesync !== statusData.onesync) {
        current.onesync = statusData.onesync;
        changed = true;
    }

    if (Array.isArray(statusData.tags) && statusData.tags.length > 0) {
        const nextTags = statusData.tags;
        if (JSON.stringify(current.tags || []) !== JSON.stringify(nextTags)) {
            current.tags = nextTags;
            changed = true;
        }
    }

    if (
        typeof statusData.resourcesCount === "number" &&
        statusData.resourcesCount > 0 &&
        current.resourcesCount !== statusData.resourcesCount
    ) {
        current.resourcesCount = statusData.resourcesCount;
        changed = true;
    }

    if (changed) {
        servers[idx] = current;
        saveServersList(servers);
    }

    return current;
}

async function saveServer(payload) {
    const config = getConfig();
    if (!isProOrDev(config)) {
        throw new Error(
            "Manajemen server kustom memerlukan lisensi PRO atau Developer."
        );
    }

    if (!payload || typeof payload !== "object") {
        throw new Error("Data server tidak valid.");
    }

    const endpoint = extractEndpoint(payload.connect || payload.endpoint || "");
    if (!endpoint) {
        throw new Error(
            "Kode join atau URL Cfx.re tidak valid. Contoh: cfx.re/join/237yxy"
        );
    }

    let cfxMeta = null;
    try {
        cfxMeta = await resolveServerMetadataWithFallback(endpoint);
    } catch {}

    const name = String(payload.name || cfxMeta?.hostname || "").trim();
    if (!name) {
        throw new Error("Nama server wajib diisi.");
    }

    const build = String(payload.build || cfxMeta?.build || "-").trim() || "-";
    const rawCacheProfile = String(payload.cacheProfile || "").trim();

    if (rawCacheProfile && !isValidProfileName(rawCacheProfile)) {
        throw new Error(
            "Nama profil cache tidak valid. Hindari karakter garis miring atau '..'."
        );
    }

    const servers = getServers();
    const existingIds = servers.map(s => s.id);
    const isEditing = Boolean(payload.id && existingIds.includes(payload.id));

    const serverId = isEditing ? payload.id : generateSlugId(name, existingIds);
    const cacheProfile = rawCacheProfile || serverId;

    if (cacheProfile && isValidProfileName(cacheProfile)) {
        createProfile(cacheProfile);
    }

    const existingServer = isEditing ? servers.find(s => s.id === serverId) : null;
    const logo = String(
        cfxMeta?.iconFileUrl ||
            cfxMeta?.logoUrl ||
            cfxMeta?.iconUrl ||
            payload.logo ||
            existingServer?.logo ||
            ""
    ).trim();
    const banner = String(
        cfxMeta?.bannerDetail || payload.banner || existingServer?.banner || ""
    ).trim();

    const modProfile = String(
        payload.modProfile !== undefined
            ? payload.modProfile
            : existingServer?.modProfile || ""
    ).trim();

    const serverRecord = {
        id: serverId,
        name,
        build,
        logo,
        fallbackLogo: existingServer?.fallbackLogo || "",
        banner,
        projectDesc: cfxMeta?.projectDesc ?? existingServer?.projectDesc ?? "",
        ownerName: cfxMeta?.ownerName ?? existingServer?.ownerName ?? "",
        onesync: cfxMeta?.onesync ?? existingServer?.onesync ?? "",
        tags: cfxMeta?.tags ?? existingServer?.tags ?? [],
        resourcesCount: cfxMeta?.resourcesCount ?? existingServer?.resourcesCount ?? 0,
        connect: `cfx.re/join/${endpoint}`,
        endpoint,
        cacheProfile,
        modProfile
    };

    if (isEditing) {
        const idx = servers.findIndex(s => s.id === serverId);
        servers[idx] = serverRecord;
    } else {
        servers.push(serverRecord);
    }

    saveServersList(servers);
    return serverRecord;
}

function deleteServer(serverId) {
    const config = getConfig();
    if (!isProOrDev(config)) {
        throw new Error(
            "Menghapus server memerlukan lisensi PRO atau Developer."
        );
    }

    if (!serverId || typeof serverId !== "string") {
        throw new Error("ID server tidak valid.");
    }

    const servers = getServers();
    const filtered = servers.filter(s => s.id !== serverId);

    if (filtered.length === servers.length) {
        throw new Error("Server tidak ditemukan.");
    }

    saveServersList(filtered);

    if (Array.isArray(config.favorites) && config.favorites.includes(serverId)) {
        config.favorites = config.favorites.filter(id => id !== serverId);
        saveConfig(config);
    }

    return filtered;
}

module.exports = {
    ensureServersInitialized,
    getServers,
    getServerById,
    extractEndpoint,
    fetchCfxMetadataForForm,
    syncServerMetadataFromStatus,
    saveServer,
    deleteServer
};
