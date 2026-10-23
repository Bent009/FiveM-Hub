const toastContainer = document.getElementById("toastContainer");
const confirmModal = document.getElementById("confirmModal");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const confirmModalCancel = document.getElementById("confirmModalCancel");
const confirmModalOk = document.getElementById("confirmModalOk");

const TOAST_TYPE_ICONS = {
    success: "ri-checkbox-circle-line",
    warning: "ri-error-warning-line",
    error: "ri-close-circle-line",
    info: "ri-information-line"
};

function showToast(message, type = "info", duration = 3500) {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconEl = document.createElement("i");
    iconEl.className = `${TOAST_TYPE_ICONS[type] || TOAST_TYPE_ICONS.info} toast-type-icon`;
    iconEl.setAttribute("aria-hidden", "true");

    const textSpan = document.createElement("span");
    textSpan.className = "toast-text";
    textSpan.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close";
    closeBtn.innerHTML = '<i class="ri-close-line"></i>';
    closeBtn.onclick = () => toast.remove();

    toast.appendChild(iconEl);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

function showConfirmModal({
    title = "Konfirmasi",
    message = "",
    confirmText = "Lanjutkan",
    cancelText = "Batal",
    danger = false
}) {
    return new Promise(resolve => {
        confirmModalTitle.innerHTML = `<i class="${danger ? "ri-alert-line" : "ri-question-line"}"></i> ${escapeHtml(title)}`;
        confirmModalMessage.textContent = message.trim();
        confirmModalOk.innerHTML = `<i class="${danger ? "ri-delete-bin-line" : "ri-check-line"}"></i> ${escapeHtml(confirmText)}`;
        confirmModalCancel.textContent = cancelText;

        confirmModalOk.className = danger ? "btn btn-danger" : "btn btn-primary";
        confirmModal.classList.remove("hidden");

        function cleanup(result) {
            confirmModal.classList.add("hidden");
            confirmModalOk.removeEventListener("click", onConfirm);
            confirmModalCancel.removeEventListener("click", onCancel);
            document.removeEventListener("keydown", onKeyDown);
            resolve(result);
        }

        function onConfirm() {
            cleanup(true);
        }

        function onCancel() {
            cleanup(false);
        }

        function onKeyDown(e) {
            if (e.key === "Escape") {
                cleanup(false);
            }
        }

        confirmModalOk.addEventListener("click", onConfirm);
        confirmModalCancel.addEventListener("click", onCancel);
        document.addEventListener("keydown", onKeyDown);
    });
}

const floatingGlassTooltip = document.getElementById("floatingGlassTooltip");

function positionFloatingTooltip(triggerEl) {
    if (!floatingGlassTooltip || !triggerEl) return;
    const text = triggerEl.getAttribute("data-tooltip");
    if (!text) return;

    floatingGlassTooltip.textContent = text;
    floatingGlassTooltip.classList.remove("hidden");

    const rect = triggerEl.getBoundingClientRect();
    const tipRect = floatingGlassTooltip.getBoundingClientRect();

    let top = rect.top - tipRect.height - 10;
    if (top < 44) {
        top = rect.bottom + 10;
    }

    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(12, Math.min(window.innerWidth - tipRect.width - 12, left));

    floatingGlassTooltip.style.top = `${Math.round(top)}px`;
    floatingGlassTooltip.style.left = `${Math.round(left)}px`;
}

function hideFloatingTooltip() {
    if (floatingGlassTooltip) {
        floatingGlassTooltip.classList.add("hidden");
    }
}

document.addEventListener("mouseover", event => {
    const trigger = event.target.closest(".info-tooltip-trigger");
    if (trigger) {
        positionFloatingTooltip(trigger);
    }
});

document.addEventListener("mouseout", event => {
    const trigger = event.target.closest(".info-tooltip-trigger");
    if (trigger) {
        hideFloatingTooltip();
    }
});

document.addEventListener("focusin", event => {
    const trigger = event.target.closest(".info-tooltip-trigger");
    if (trigger) {
        positionFloatingTooltip(trigger);
    }
});

document.addEventListener("focusout", event => {
    const trigger = event.target.closest(".info-tooltip-trigger");
    if (trigger) {
        hideFloatingTooltip();
    }
});

document.addEventListener(
    "click",
    event => {
        const trigger = event.target.closest(".info-tooltip-trigger");
        if (trigger) {
            event.stopPropagation();
            positionFloatingTooltip(trigger);
        }
    },
    true
);

let currentAccountTier = "free";

function hasProAccess() {
    return currentAccountTier === "pro" || currentAccountTier === "developer";
}

const titlebarTierBadge = document.getElementById("titlebarTierBadge");
const sidebarTierBtn = document.getElementById("sidebarTierBtn");
const sidebarTierLabel = document.getElementById("sidebarTierLabel");
const sidebarTierSub = document.getElementById("sidebarTierSub");
const settingsTierBadge = document.getElementById("settingsTierBadge");
const upgradeProModal = document.getElementById("upgradeProModal");
const upgradeProCloseBtn = document.getElementById("upgradeProCloseBtn");
const openUpgradeInfoBtn = document.getElementById("openUpgradeInfoBtn");
const modalActivationInput = document.getElementById("modalActivationInput");
const modalActivateBtn = document.getElementById("modalActivateBtn");
const activationCodeInput = document.getElementById("activationCodeInput");
const activateTierBtn = document.getElementById("activateTierBtn");
const quickTierButtons = document.querySelectorAll(".quick-tier-btn");

function openUpgradeProModal() {
    if (!upgradeProModal) return;
    upgradeProModal.classList.remove("hidden");
    if (modalActivationInput) {
        modalActivationInput.focus();
    }
}

function closeUpgradeProModal() {
    if (upgradeProModal) {
        upgradeProModal.classList.add("hidden");
    }
}

if (titlebarTierBadge) {
    titlebarTierBadge.addEventListener("click", openUpgradeProModal);
}
if (sidebarTierBtn) {
    sidebarTierBtn.addEventListener("click", openUpgradeProModal);
}
if (openUpgradeInfoBtn) {
    openUpgradeInfoBtn.addEventListener("click", openUpgradeProModal);
}
if (upgradeProCloseBtn) {
    upgradeProCloseBtn.addEventListener("click", closeUpgradeProModal);
}
if (upgradeProModal) {
    upgradeProModal.addEventListener("click", event => {
        if (event.target === upgradeProModal) {
            closeUpgradeProModal();
        }
    });
}

function applyAccountTierUI(tier) {
    const normalized = ["free", "pro", "developer"].includes(tier) ? tier : "free";
    currentAccountTier = normalized;
    const isUnlocked = hasProAccess();

    const badgeMap = {
        free: {
            short: '<i class="ri-user-line"></i> FREE',
            full: '<i class="ri-user-line"></i> FREE TIER',
            sub: "Buka akses PRO"
        },
        pro: {
            short: '<i class="ri-star-line"></i> PRO',
            full: '<i class="ri-star-line"></i> PRO SUBSCRIBER',
            sub: "Fitur Pro Aktif"
        },
        developer: {
            short: '<i class="ri-tools-line"></i> DEV',
            full: '<i class="ri-tools-line"></i> DEVELOPER MODE',
            sub: "Akses Penuh"
        }
    };
    const info = badgeMap[normalized];

    [titlebarTierBadge, settingsTierBadge].forEach(el => {
        if (!el) return;
        el.classList.remove("tier-free", "tier-pro", "tier-developer");
        el.classList.add(`tier-${normalized}`);
    });

    if (titlebarTierBadge) titlebarTierBadge.innerHTML = info.short;
    if (settingsTierBadge) settingsTierBadge.innerHTML = info.full;

    if (sidebarTierBtn) {
        sidebarTierBtn.classList.remove("tier-free", "tier-pro", "tier-developer");
        sidebarTierBtn.classList.add(`tier-${normalized}`);
    }
    if (sidebarTierLabel) sidebarTierLabel.innerHTML = info.full;
    if (sidebarTierSub) sidebarTierSub.textContent = info.sub;

    const addBtn = document.getElementById("addServerBtn");
    if (addBtn) {
        addBtn.innerHTML = isUnlocked
            ? '<i class="ri-add-line"></i> Tambah Server'
            : '<i class="ri-lock-line"></i> Tambah Server <span class="pro-lock-pill">PRO</span>';
    }

    const perCoreProBadge = document.getElementById("perCoreProBadge");
    if (perCoreProBadge) {
        perCoreProBadge.innerHTML = isUnlocked
            ? '<i class="ri-check-line"></i> AKTIF'
            : '<i class="ri-lock-line"></i> PRO';
    }

    const junctionProBadge = document.getElementById("junctionProBadge");
    if (junctionProBadge) {
        junctionProBadge.innerHTML = isUnlocked
            ? '<i class="ri-check-line"></i> PRO'
            : '<i class="ri-lock-line"></i> PRO';
    }

    document.querySelectorAll(".theme-pro-pill").forEach(pill => {
        pill.innerHTML = isUnlocked
            ? '<i class="ri-check-line"></i> PRO'
            : '<i class="ri-lock-line"></i> PRO';
    });

    document.querySelectorAll(".card-crud-btn").forEach(btn => {
        btn.classList.toggle("hidden", !isUnlocked);
    });
}

async function handleActivateCode(rawCode) {
    const inputToken = String(rawCode || "").trim();
    if (!inputToken) {
        showToast("Masukkan token lisensi terlebih dahulu.", "warning");
        return;
    }

    try {
        const result = await window.fivemAPI.activateAccountTier(inputToken);
        applyAccountTierUI(result.accountTier);
        applyThemeUI(result.theme || "obsidian");
        updateAffinityActiveUI(result.affinity || "");
        if (typeof updateCacheModeUI === "function") {
            updateCacheModeUI(result.cacheMode || "copy");
        }
        closeUpgradeProModal();

        const tierUpper = String(result.accountTier || "").toUpperCase();
        const holderSuffix = result.holder ? ` untuk ${result.holder}` : "";
        showToast(
            `Lisensi ${tierUpper} berhasil diverifikasi & diamankan via DPAPI${holderSuffix}.`,
            "success"
        );

        if (typeof loadProfiles === "function") {
            loadProfiles();
        }
        if (typeof loadModProfiles === "function") {
            loadModProfiles();
        }
    } catch (err) {
        showToast(err.message || "Token aktivasi tidak valid atau tanda tangan rusak.", "error");
    }
}

if (activateTierBtn && activationCodeInput) {
    activateTierBtn.addEventListener("click", () => {
        handleActivateCode(activationCodeInput.value);
    });
    activationCodeInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            handleActivateCode(activationCodeInput.value);
        }
    });
}

if (modalActivateBtn && modalActivationInput) {
    modalActivateBtn.addEventListener("click", () => {
        handleActivateCode(modalActivationInput.value);
    });
    modalActivationInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            handleActivateCode(modalActivationInput.value);
        }
    });
}

quickTierButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const code = btn.dataset.testCode;
        if (activationCodeInput) {
            activationCodeInput.value = code;
        }
        handleActivateCode(code);
    });
});

document.getElementById("winMinBtn").addEventListener("click", () => {
    window.fivemAPI.minimizeWindow();
});

document.getElementById("winMaxBtn").addEventListener("click", () => {
    window.fivemAPI.maximizeWindow();
});

document.getElementById("winCloseBtn").addEventListener("click", () => {
    window.fivemAPI.closeWindow();
});

const quickThemeSelect = document.getElementById("quickThemeSelect");
const themeCards = document.querySelectorAll(".theme-card");

const THEME_WATERMARK_LOGOS = {
    obsidian: "../assets/logo-Obsidian Cyber.png",
    midnight: "../assets/logo-Midnight Slate.png",
    crimson: "../assets/logo-Crimson Amber.png",
    monochrome: "../assets/logo-Clean Monochrome.png"
};

// Preload keempat logo watermark tema ke memori agar pergantian tema instan tanpa kedip
const preloadedThemeLogos = Object.values(THEME_WATERMARK_LOGOS).map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

const titlebarThemeLogoEl = document.getElementById("titlebarThemeLogo");

function applyThemeUI(themeName) {
    const normalizedTheme = THEME_WATERMARK_LOGOS[themeName] ? themeName : "obsidian";
    document.documentElement.setAttribute("data-theme", normalizedTheme);
    document.documentElement.style.setProperty(
        "--theme-watermark-logo",
        `url('${THEME_WATERMARK_LOGOS[normalizedTheme]}')`
    );
    if (titlebarThemeLogoEl) {
        titlebarThemeLogoEl.src = THEME_WATERMARK_LOGOS[normalizedTheme];
    }
    if (quickThemeSelect) {
        quickThemeSelect.value = normalizedTheme;
    }
    themeCards.forEach(card => {
        card.classList.toggle("active", card.dataset.themeChoice === normalizedTheme);
    });
}

async function setAndSaveTheme(themeName) {
    if (themeName !== "obsidian" && !hasProAccess()) {
        if (quickThemeSelect) {
            quickThemeSelect.value = "obsidian";
        }
        showToast("Tema tambahan memerlukan akun PRO atau DEVELOPER.", "warning");
        openUpgradeProModal();
        return;
    }

    try {
        const saved = await window.fivemAPI.saveTheme(themeName);
        applyThemeUI(saved);
        showToast(`Tema diubah ke ${saved.toUpperCase()}.`, "success");
    } catch (err) {
        showToast(err.message || "Gagal menyimpan tema.", "error");
    }
}

quickThemeSelect.addEventListener("change", () => {
    setAndSaveTheme(quickThemeSelect.value);
});

themeCards.forEach(card => {
    card.addEventListener("click", () => {
        setAndSaveTheme(card.dataset.themeChoice);
    });
});

(async () => {
    try {
        const [initialTier, initialTheme] = await Promise.all([
            window.fivemAPI.getAccountTier(),
            window.fivemAPI.getTheme()
        ]);
        applyAccountTierUI(initialTier || "free");
        applyThemeUI(initialTheme || "obsidian");
    } catch {
        applyAccountTierUI("free");
        applyThemeUI("obsidian");
    }
})();

const navButtons = document.querySelectorAll(".nav-btn");
const viewSections = document.querySelectorAll(".view-section");

function switchView(targetViewId) {
    navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === targetViewId));
    viewSections.forEach(sec => {
        const isTarget = sec.id === targetViewId;
        sec.classList.toggle("active", isTarget);
        sec.classList.toggle("hidden", !isTarget);
    });
    if (targetViewId === "viewCache" && typeof loadProfiles === "function") {
        loadProfiles();
    }
    if (targetViewId === "viewMods" && typeof loadModProfiles === "function") {
        loadModProfiles();
    }
    if (targetViewId === "viewSettings" && typeof updateCleanerStats === "function") {
        updateCleanerStats();
    }
}

navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        switchView(btn.dataset.view);
    });
});

const fivemProcessBadge = document.getElementById("fivemProcessBadge");
const fivemProcessText = document.getElementById("fivemProcessText");

async function updateFiveMProcessIndicator() {
    try {
        const running = await window.fivemAPI.isFiveMRunning();
        if (fivemProcessBadge && fivemProcessText) {
            fivemProcessBadge.classList.toggle("running", Boolean(running));
            fivemProcessBadge.classList.toggle("idle", !running);
            fivemProcessText.textContent = running ? "FiveM: Running" : "FiveM: Idle";
        }
    } catch {}
}

updateFiveMProcessIndicator();
setInterval(updateFiveMProcessIndicator, 5000);

const descriptions = {
    normal: "Pengaturan bawaan Windows.\n\n• Stabil\n• Aman untuk semua aplikasi",
    aboveNormal: "Memberikan prioritas di atas aplikasi standar.\n\n• Direkomendasikan\n• Frame time lebih stabil",
    high: "Alokasi prioritas tinggi untuk sesi bermain.\n\n• Cocok untuk server dengan banyak skrip\n• Aplikasi latar belakang mungkin sedikit melambat",
    realtime: "PERINGATAN: Priority Realtime dapat menyebabkan input mouse/keyboard atau sistem Windows tidak responsif saat beban CPU mencapai 100%."
};

const priorityButtons = document.querySelectorAll(".priority-btn");
const affinityButtons = document.querySelectorAll(".affinity-btn");
const cpuInfoTextEl = document.getElementById("cpuInfoText");
const cpuCoresGridEl = document.getElementById("cpuCoresGrid");
const customAffinityMaskDisplayEl = document.getElementById("customAffinityMaskDisplay");

let detectedLogicalCores = 8;
let currentAffinityMask = "";

function getAllCoresBitmask(coreCount) {
    return (1n << BigInt(Math.max(1, coreCount))) - 1n;
}

function parseAffinityToBigInt(affinityHex, coreCount) {
    const allMask = getAllCoresBitmask(coreCount);
    const cleaned = String(affinityHex || "").trim().toUpperCase();
    if (!cleaned || !/^[0-9A-F]+$/.test(cleaned)) {
        return allMask;
    }
    try {
        const parsed = BigInt("0x" + cleaned) & allMask;
        return parsed > 0n ? parsed : allMask;
    } catch {
        return allMask;
    }
}

function countActiveCores(maskBigInt, coreCount) {
    let count = 0;
    for (let i = 0; i < coreCount; i++) {
        if (((maskBigInt >> BigInt(i)) & 1n) === 1n) {
            count++;
        }
    }
    return count;
}

function renderCpuCoresGrid(coreCount) {
    if (!cpuCoresGridEl) return;
    cpuCoresGridEl.innerHTML = "";

    for (let i = 0; i < coreCount; i++) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "core-chip active";
        chip.dataset.coreIndex = String(i);
        chip.innerHTML = `
            <span>Core ${i}</span>
            <span class="core-chip-check"><i class="ri-check-line"></i></span>
        `;

        chip.addEventListener("click", async () => {
            if (!hasProAccess()) {
                showToast(
                    "Pengaturan Per-Core CPU Affinity memerlukan akun PRO atau DEVELOPER.",
                    "warning"
                );
                openUpgradeProModal();
                return;
            }

            const allMask = getAllCoresBitmask(detectedLogicalCores);
            let currentBigInt = parseAffinityToBigInt(currentAffinityMask, detectedLogicalCores);
            const bit = 1n << BigInt(i);
            const isCurrentlyActive = (currentBigInt & bit) !== 0n;

            if (isCurrentlyActive && countActiveCores(currentBigInt, detectedLogicalCores) <= 1) {
                showToast("Minimal 1 core CPU harus tetap aktif.", "warning");
                return;
            }

            const nextBigInt = isCurrentlyActive ? (currentBigInt & ~bit) : (currentBigInt | bit);
            const nextHex = nextBigInt === allMask ? "" : nextBigInt.toString(16).toUpperCase();

            try {
                await window.fivemAPI.saveAffinity(nextHex);
                updateAffinityActiveUI(nextHex);
                const activeCount = countActiveCores(nextBigInt, detectedLogicalCores);
                showToast(
                    nextHex === ""
                        ? `CPU Affinity diatur ke Semua Core (${detectedLogicalCores} Threads).`
                        : `CPU Affinity diatur ke ${activeCount} Core (Mask: 0x${nextHex}).`,
                    "success"
                );
            } catch (err) {
                showToast(err.message || "Gagal menyimpan CPU Affinity.", "error");
            }
        });

        cpuCoresGridEl.appendChild(chip);
    }
}

function updatePriorityActiveUI(priority) {
    document.getElementById("currentPriority").innerText = "Prioritas Aktif: " + priority;
    priorityButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.priority === priority);
    });
}

function updateAffinityActiveUI(affinity) {
    const cleaned = String(affinity || "").trim().toUpperCase();
    const allMask = getAllCoresBitmask(detectedLogicalCores);
    const activeBigInt = parseAffinityToBigInt(cleaned, detectedLogicalCores);
    const isAllCores = !cleaned || activeBigInt === allMask;
    const normalizedAffinity = isAllCores ? "" : activeBigInt.toString(16).toUpperCase();

    currentAffinityMask = normalizedAffinity;

    const activeCount = countActiveCores(activeBigInt, detectedLogicalCores);
    const labelMap = {
        "": `Semua Core (${detectedLogicalCores} Threads)`,
        "F": "4 Core (0xF)",
        "3F": "6 Core (0x3F)",
        "FF": "8 Core (0xFF)"
    };

    const currentAffinityEl = document.getElementById("currentAffinity");
    if (currentAffinityEl) {
        currentAffinityEl.innerText =
            labelMap[normalizedAffinity] || `${activeCount} Core (0x${normalizedAffinity})`;
    }

    if (customAffinityMaskDisplayEl) {
        customAffinityMaskDisplayEl.textContent = isAllCores
            ? `Hex Mask: Semua Core (0x${allMask.toString(16).toUpperCase()})`
            : `Hex Mask: 0x${normalizedAffinity} (${activeCount}/${detectedLogicalCores} Core Aktif)`;
    }

    affinityButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.affinity === normalizedAffinity);
    });

    if (cpuCoresGridEl) {
        const chips = cpuCoresGridEl.querySelectorAll(".core-chip");
        chips.forEach(chip => {
            const idx = Number(chip.dataset.coreIndex);
            const isCoreActive = ((activeBigInt >> BigInt(idx)) & 1n) === 1n;
            chip.classList.toggle("active", isCoreActive);
        });
    }
}

priorityButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        const priority = btn.dataset.priority;
        const confirmed = await showConfirmModal({
            title: `Ubah Priority ke ${priority.toUpperCase()}?`,
            message: descriptions[priority] || "Terapkan perubahan prioritas proses?",
            confirmText: "Terapkan",
            danger: priority === "realtime"
        });

        if (confirmed) {
            try {
                await window.fivemAPI.savePriority(priority);
                updatePriorityActiveUI(priority);
                showToast("Prioritas proses disimpan.", "success");
            } catch (err) {
                showToast(err.message || "Gagal menyimpan prioritas.", "error");
            }
        }
    });
});

(async () => {
    try {
        const [cpuInfo, priority, affinity] = await Promise.all([
            window.fivemAPI.getCpuInfo(),
            window.fivemAPI.getPriority(),
            window.fivemAPI.getAffinity()
        ]);

        if (cpuInfo && Number.isInteger(cpuInfo.logicalCores) && cpuInfo.logicalCores > 0) {
            detectedLogicalCores = Math.min(cpuInfo.logicalCores, 64);
            if (cpuInfoTextEl) {
                cpuInfoTextEl.textContent = `${cpuInfo.model} · ${cpuInfo.logicalCores} Threads`;
            }
        }

        renderCpuCoresGrid(detectedLogicalCores);
        updatePriorityActiveUI(priority || "normal");
        updateAffinityActiveUI(affinity || "");
    } catch (err) {
        console.error("Gagal memuat pengaturan performa:", err);
        renderCpuCoresGrid(detectedLogicalCores);
    }
})();

affinityButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        const affinity = btn.dataset.affinity;
        try {
            await window.fivemAPI.saveAffinity(affinity);
            updateAffinityActiveUI(affinity);
            showToast("Preset CPU Affinity disimpan.", "success");
        } catch (err) {
            showToast(err.message || "Gagal menyimpan affinity.", "error");
        }
    });
});

(async () => {
    const delay = await window.fivemAPI.getLaunchDelay();
    document.getElementById("launchDelay").value = delay;
})();

document.getElementById("saveDelay").addEventListener("click", async () => {
    const delay = parseInt(document.getElementById("launchDelay").value, 10);
    try {
        await window.fivemAPI.saveLaunchDelay(delay);
        showToast("Jeda peluncuran disimpan.", "success");
    } catch (err) {
        showToast(err.message || "Gagal menyimpan jeda peluncuran.", "error");
    }
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getServerInitials(name) {
    const words = String(name || "SV")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return String(words[0] || "SV").slice(0, 2).toUpperCase();
}

const serverSearchInput = document.getElementById("serverSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterPills = document.querySelectorAll(".filter-pill");
const refreshServersBtn = document.getElementById("refreshServersBtn");
const serversEmptyState = document.getElementById("serversEmptyState");

const countAllEl = document.getElementById("countAll");
const countFavoritesEl = document.getElementById("countFavorites");
const countOnlineEl = document.getElementById("countOnline");

const launchStatusBar = document.getElementById("launchStatusBar");
const launchSpinner = document.getElementById("launchSpinner");
const launchStepBadge = document.getElementById("launchStepBadge");
const launchStatusText = document.getElementById("launchStatusText");
const launchProgressFill = document.getElementById("launchProgressFill");
const launchConnectNowBtn = document.getElementById("launchConnectNowBtn");
const launchCancelBtn = document.getElementById("launchCancelBtn");

let indexedServers = [];
let currentFavorites = [];
let currentFilter = "all";
const cardMap = new Map();
const cardRefsMap = new Map();
const serverOnlineState = new Map();
const serverStatusCache = new Map();
const watchedSlotServers = new Set();
let hideLaunchBarTimeout = null;

function playSlotAvailableBeep() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch {}
}

function toggleSlotWatcher(server) {
    if (!hasProAccess()) {
        showToast(
            "Pemantau Slot memerlukan akun PRO atau DEVELOPER.",
            "warning"
        );
        openUpgradeProModal();
        return;
    }

    const isWatching = watchedSlotServers.has(server.id);
    if (isWatching) {
        watchedSlotServers.delete(server.id);
        showToast(`Pemantauan slot untuk "${server.name}" dihentikan.`, "info");
    } else {
        watchedSlotServers.add(server.id);
        showToast(
            `Memantau slot kosong di "${server.name}" setiap 10 detik.`,
            "success"
        );
    }

    const refs = cardRefsMap.get(server.id);
    if (refs && refs.slotWatchBtn) {
        refs.slotWatchBtn.classList.toggle("watching", watchedSlotServers.has(server.id));
    }

    if (activeDetailServer && activeDetailServer.id === server.id && detailSlotWatchBtn) {
        updateDetailWatchButtonState(server.id);
    }
}

setInterval(async () => {
    if (watchedSlotServers.size === 0 || !hasProAccess()) return;

    for (const serverId of Array.from(watchedSlotServers)) {
        const server = indexedServers.find(s => s.id === serverId);
        if (!server) {
            watchedSlotServers.delete(serverId);
            continue;
        }

        try {
            const status = await window.fivemAPI.getServerStatus(server.endpoint);
            serverStatusCache.set(server.id, status);
            setCardStatusResult(server.id, status);

            if (
                status &&
                status.online &&
                status.maxPlayers > 0 &&
                status.players < status.maxPlayers
            ) {
                watchedSlotServers.delete(serverId);
                const refs = cardRefsMap.get(server.id);
                if (refs && refs.slotWatchBtn) {
                    refs.slotWatchBtn.classList.remove("watching");
                }
                if (activeDetailServer && activeDetailServer.id === server.id) {
                    updateDetailWatchButtonState(server.id);
                }

                playSlotAvailableBeep();
                showToast(
                    `Slot tersedia di ${server.name} (${status.players}/${status.maxPlayers}).`,
                    "success",
                    6000
                );

                const joinNow = await showConfirmModal({
                    title: `Slot Tersedia: ${server.name}`,
                    message: `Kapasitas saat ini: ${status.players} / ${status.maxPlayers} pemain.\nJalankan FiveM dan hubungkan ke server sekarang?`,
                    confirmText: "Masuk Sekarang",
                    cancelText: "Nanti"
                });

                if (joinNow) {
                    await window.fivemAPI.launchServer(server.id);
                    updateFiveMProcessIndicator();
                }
            }
        } catch {}
    }
}, 10000);

function updateFilterCountBadges() {
    const totalCount = indexedServers.length;
    const favCount = indexedServers.filter(s => currentFavorites.includes(s.id)).length;
    const onlineCount = indexedServers.filter(s => Boolean(serverOnlineState.get(s.id))).length;

    if (countAllEl) countAllEl.textContent = String(totalCount);
    if (countFavoritesEl) countFavoritesEl.textContent = String(favCount);
    if (countOnlineEl) countOnlineEl.textContent = String(onlineCount);
}

function applyServerFilterAndSort() {
    const container = document.getElementById("serversContainer");
    const rawQuery = serverSearchInput?.value || "";
    const query = rawQuery.trim().toLowerCase();

    if (clearSearchBtn) {
        clearSearchBtn.classList.toggle("hidden", rawQuery.length === 0);
    }

    updateFilterCountBadges();

    const sorted = [...indexedServers].sort((a, b) => {
        const aFav = currentFavorites.includes(a.id);
        const bFav = currentFavorites.includes(b.id);

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.originalIndex - b.originalIndex;
    });

    let visibleCount = 0;

    sorted.forEach(server => {
        const card = cardMap.get(server.id);
        if (!card) return;

        const matchesSearch =
            !query ||
            String(server.name || "").toLowerCase().includes(query) ||
            String(server.build || "").toLowerCase().includes(query) ||
            String(server.cacheProfile || "").toLowerCase().includes(query) ||
            String(server.endpoint || "").toLowerCase().includes(query);

        const isFav = currentFavorites.includes(server.id);
        const isOnline = Boolean(serverOnlineState.get(server.id));

        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "favorites" && isFav) ||
            (currentFilter === "online" && isOnline);

        const isVisible = matchesSearch && matchesFilter;
        card.classList.toggle("hidden", !isVisible);
        if (isVisible) {
            visibleCount += 1;
        }
        container.appendChild(card);
    });

    if (serversEmptyState) {
        serversEmptyState.classList.toggle("hidden", visibleCount > 0 || indexedServers.length === 0);
    }
}

function setCardLoadingSkeleton(serverId) {
    const refs = cardRefsMap.get(serverId);
    if (!refs) return;

    refs.statusPill.className = "status-pill skeleton-shimmer";
    refs.statusText.textContent = "Memeriksa...";
    refs.capacitySection.classList.add("skeleton-shimmer");
    refs.capacityLabel.innerHTML = '<i class="ri-group-line"></i> Memuat pemain...';
    refs.capacityPercent.textContent = "--%";
    refs.capacityFill.style.width = "0%";
    refs.capacityFill.className = "capacity-fill";
}

function setCardStatusResult(serverId, status) {
    const refs = cardRefsMap.get(serverId);
    const server = indexedServers.find(s => s.id === serverId);
    if (!refs) return;

    refs.capacitySection.classList.remove("skeleton-shimmer");

    const isOnline = Boolean(status && status.online);
    const players = Math.max(0, Number(status?.players) || 0);
    const maxPlayers = Math.max(0, Number(status?.maxPlayers) || 0);
    const percentage = maxPlayers > 0 ? Math.min(100, Math.round((players / maxPlayers) * 100)) : 0;

    if (status && isOnline) {
        const liveLogo = resolveLogoUrl(status.logoUrl || status.iconUrl || status.logo);
        if (liveLogo && refs.logoImg && refs.fallbackAvatar) {
            refs.logoImg.referrerPolicy = "no-referrer";
            refs.logoImg.src = liveLogo;
            refs.logoImg.classList.remove("hidden");
            refs.fallbackAvatar.classList.add("hidden");
            if (server) server.logo = status.iconFileUrl || liveLogo;
        }

        const liveBanner = status.bannerDetail || status.bannerConnecting || "";
        if (liveBanner && refs.bannerStrip) {
            refs.bannerStrip.style.backgroundImage = `url("${liveBanner.replace(/"/g, '\\"')}")`;
            refs.bannerStrip.classList.remove("hidden");
            if (server) server.banner = liveBanner;
        }

        if (status.build && status.build !== "-" && refs.buildPill) {
            refs.buildPill.innerHTML = `<i class="ri-tools-line"></i> Build ${escapeHtml(status.build)}`;
            if (server) server.build = status.build;
        }

        if (server) {
            if (status.projectDesc) server.projectDesc = status.projectDesc;
            if (status.ownerName) server.ownerName = status.ownerName;
            if (status.onesync) server.onesync = status.onesync;
            if (Array.isArray(status.tags)) server.tags = status.tags;
            if (typeof status.resourcesCount === "number") server.resourcesCount = status.resourcesCount;
        }
    }

    if (isOnline) {
        refs.statusPill.className = "status-pill online";
        refs.statusText.textContent = "Online";
        refs.capacityLabel.innerHTML = `<i class="ri-group-line"></i> ${players} / ${maxPlayers} Pemain`;
        refs.capacityPercent.textContent = `${percentage}%`;
        refs.capacityFill.style.width = `${percentage}%`;

        let capClass = "cap-low";
        if (percentage > 90) {
            capClass = "cap-high";
        } else if (percentage >= 75) {
            capClass = "cap-mid";
        }
        refs.capacityFill.className = `capacity-fill ${capClass}`;
    } else {
        refs.statusPill.className = "status-pill offline";
        refs.statusText.textContent = "Offline";
        refs.capacityLabel.innerHTML = '<i class="ri-group-line"></i> 0 / 0 Pemain';
        refs.capacityPercent.textContent = "0%";
        refs.capacityFill.style.width = "0%";
        refs.capacityFill.className = "capacity-fill cap-low";
    }

    const pingMs = typeof status?.pingMs === "number" ? status.pingMs : null;
    if (refs.pingBadge) {
        if (isOnline && pingMs !== null) {
            refs.pingBadge.classList.remove("hidden");
            let pingClass = "ping-low";
            if (pingMs > 140) {
                pingClass = "ping-high";
            } else if (pingMs >= 70) {
                pingClass = "ping-mid";
            }
            refs.pingBadge.className = `server-ping-badge ${pingClass}`;
            refs.pingBadge.innerHTML = `<i class="ri-signal-tower-line"></i> ${pingMs}ms`;
            refs.pingBadge.title = `Latensi jaringan: ${pingMs} ms`;
        } else if (isOnline) {
            refs.pingBadge.classList.remove("hidden");
            refs.pingBadge.className = "server-ping-badge ping-muted";
            refs.pingBadge.innerHTML = '<i class="ri-signal-tower-line"></i> --';
            refs.pingBadge.title = "Latensi sedang diukur...";
        } else {
            refs.pingBadge.classList.add("hidden");
        }
    }
}

function resolveLogoUrl(logoValue) {
    const raw = String(logoValue ?? "").trim();
    if (!raw) {
        return "";
    }
    if (/^(file:\/\/|https?:\/\/|data:image\/)/i.test(raw)) {
        return raw.replace(
            "https://servers-frontend.fivem.net/",
            "https://frontend.cfx-services.net/"
        );
    }
    const safeLogoFile = encodeURIComponent(raw.replace(/^[/\\]+/, ""));
    return `../assets/${safeLogoFile}`;
}

function extractClientEndpointPreview(rawInput) {
    return String(rawInput || "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^cfx\.re\/join\//i, "")
        .replace(/^servers\.fivem\.net\/servers\/detail\//i, "")
        .replace(/\/+$/, "")
        .trim()
        .toLowerCase();
}

function createServerCard(server) {
    const card = document.createElement("div");
    card.className = "server-card";
    card.dataset.serverId = escapeHtml(server.id);
    card.tabIndex = 0;
    card.title = "Klik kartu untuk melihat detail server dan daftar pemain";

    const bannerStrip = document.createElement("div");
    bannerStrip.className = `server-card-banner-strip${server.banner ? "" : " hidden"}`;
    if (server.banner) {
        bannerStrip.style.backgroundImage = `url("${server.banner.replace(/"/g, '\\"')}")`;
    }

    const header = document.createElement("div");
    header.className = "server-header";

    const identity = document.createElement("div");
    identity.className = "server-identity";

    const logoWrap = document.createElement("div");
    logoWrap.className = "server-logo-wrap";

    const logoImg = document.createElement("img");
    logoImg.className = "server-logo";
    logoImg.referrerPolicy = "no-referrer";
    const resolvedLogoSrc = resolveLogoUrl(server.logo);
    logoImg.alt = escapeHtml(server.name);

    const fallbackAvatar = document.createElement("div");
    fallbackAvatar.className = "server-avatar-fallback hidden";
    fallbackAvatar.textContent = getServerInitials(server.name);

    logoImg.addEventListener("load", () => {
        logoImg.classList.remove("hidden");
        fallbackAvatar.classList.add("hidden");
    });

    logoImg.addEventListener("error", () => {
        if (server.fallbackLogo) {
            const localSrc = resolveLogoUrl(server.fallbackLogo);
            if (localSrc && logoImg.src !== localSrc) {
                logoImg.src = localSrc;
                return;
            }
        }
        logoImg.classList.add("hidden");
        fallbackAvatar.classList.remove("hidden");
    });

    if (resolvedLogoSrc) {
        logoImg.src = resolvedLogoSrc;
    } else {
        logoImg.classList.add("hidden");
        fallbackAvatar.classList.remove("hidden");
    }

    logoWrap.appendChild(logoImg);
    logoWrap.appendChild(fallbackAvatar);

    const titleGroup = document.createElement("div");
    titleGroup.className = "server-title-group";

    const titleEl = document.createElement("h2");
    titleEl.textContent = server.name ?? "Server Tanpa Nama";
    titleEl.title = server.name ?? "";

    const statusRow = document.createElement("div");
    statusRow.className = "server-status-row";

    const statusPill = document.createElement("div");
    statusPill.className = "status-pill skeleton-shimmer";

    const statusDot = document.createElement("span");
    statusDot.className = "status-dot";

    const statusText = document.createElement("span");
    statusText.textContent = "Memeriksa...";

    statusPill.appendChild(statusDot);
    statusPill.appendChild(statusText);

    const pingBadge = document.createElement("span");
    pingBadge.className = "server-ping-badge ping-muted hidden";
    pingBadge.innerHTML = '<i class="ri-signal-tower-line"></i> --';

    statusRow.appendChild(statusPill);
    statusRow.appendChild(pingBadge);

    titleGroup.appendChild(titleEl);
    titleGroup.appendChild(statusRow);

    identity.appendChild(logoWrap);
    identity.appendChild(titleGroup);

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "card-header-actions";

    const slotWatchBtn = document.createElement("button");
    slotWatchBtn.className = `card-icon-btn slot-watch-btn${watchedSlotServers.has(server.id) ? " watching" : ""}`;
    slotWatchBtn.title = "Pantau Slot Kosong (PRO)";
    slotWatchBtn.innerHTML = '<i class="ri-notification-3-line"></i>';

    const isFavInitial = currentFavorites.includes(server.id);
    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = `favorite-btn${isFavInitial ? " is-fav" : ""}`;
    favoriteBtn.dataset.server = escapeHtml(server.id);
    favoriteBtn.title = "Tandai Favorit";
    favoriteBtn.innerHTML = `<i class="${isFavInitial ? "ri-star-fill" : "ri-star-line"}"></i>`;

    const isUnlocked = hasProAccess();
    const editBtn = document.createElement("button");
    editBtn.className = `card-icon-btn card-crud-btn${isUnlocked ? "" : " hidden"}`;
    editBtn.title = "Edit Server";
    editBtn.innerHTML = '<i class="ri-edit-line"></i>';

    const deleteBtn = document.createElement("button");
    deleteBtn.className = `card-icon-btn danger card-crud-btn${isUnlocked ? "" : " hidden"}`;
    deleteBtn.title = "Hapus Server";
    deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';

    actionsWrap.appendChild(slotWatchBtn);
    actionsWrap.appendChild(favoriteBtn);
    actionsWrap.appendChild(editBtn);
    actionsWrap.appendChild(deleteBtn);

    header.appendChild(identity);
    header.appendChild(actionsWrap);

    const capacitySection = document.createElement("div");
    capacitySection.className = "capacity-section skeleton-shimmer";

    const capacityHeader = document.createElement("div");
    capacityHeader.className = "capacity-header";

    const capacityLabel = document.createElement("span");
    capacityLabel.className = "capacity-label";
    capacityLabel.innerHTML = '<i class="ri-group-line"></i> Memuat pemain...';

    const capacityPercent = document.createElement("span");
    capacityPercent.className = "capacity-percent";
    capacityPercent.textContent = "--%";

    capacityHeader.appendChild(capacityLabel);
    capacityHeader.appendChild(capacityPercent);

    const capacityTrack = document.createElement("div");
    capacityTrack.className = "capacity-track";

    const capacityFill = document.createElement("div");
    capacityFill.className = "capacity-fill";
    capacityTrack.appendChild(capacityFill);

    capacitySection.appendChild(capacityHeader);
    capacitySection.appendChild(capacityTrack);

    const metaPills = document.createElement("div");
    metaPills.className = "meta-pills";

    const buildPill = document.createElement("span");
    buildPill.className = "meta-pill";
    buildPill.innerHTML = `<i class="ri-tools-line"></i> Build ${escapeHtml(server.build || "-")}`;

    const cachePill = document.createElement("span");
    cachePill.className = "meta-pill";
    cachePill.innerHTML = `<i class="ri-database-2-line"></i> Cache: ${escapeHtml(server.cacheProfile || "None")}`;

    const endpointPill = document.createElement("span");
    endpointPill.className = "meta-pill";
    endpointPill.innerHTML = `<i class="ri-link"></i> ${escapeHtml(server.endpoint || "-")}`;

    metaPills.appendChild(buildPill);
    metaPills.appendChild(cachePill);

    if (server.modProfile) {
        const modPill = document.createElement("span");
        modPill.className = "meta-pill";
        modPill.innerHTML = `<i class="ri-puzzle-line"></i> ${escapeHtml(server.modProfile)}`;
        metaPills.appendChild(modPill);
    }

    metaPills.appendChild(endpointPill);

    const connectBtn = document.createElement("button");
    connectBtn.className = "connect-btn";
    connectBtn.dataset.server = escapeHtml(server.id);
    connectBtn.innerHTML = '<i class="ri-play-line"></i> MASUK';

    card.appendChild(bannerStrip);
    card.appendChild(header);
    card.appendChild(capacitySection);
    card.appendChild(metaPills);
    card.appendChild(connectBtn);

    card.addEventListener("click", event => {
        if (event.target.closest("button")) {
            return;
        }
        lastFocusedServerCard = card;
        openServerDetailModal(server);
    });

    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            if (event.target === card) {
                event.preventDefault();
                lastFocusedServerCard = card;
                openServerDetailModal(server);
            }
        }
    });

    slotWatchBtn.addEventListener("click", event => {
        event.stopPropagation();
        toggleSlotWatcher(server);
    });

    favoriteBtn.addEventListener("click", async event => {
        event.stopPropagation();
        try {
            const updated = await window.fivemAPI.toggleFavorite(server.id);
            currentFavorites = Array.isArray(updated) ? updated : [];
            const isNowFav = currentFavorites.includes(server.id);
            favoriteBtn.innerHTML = `<i class="${isNowFav ? "ri-star-fill" : "ri-star-line"}"></i>`;
            favoriteBtn.classList.toggle("is-fav", isNowFav);
            favoriteBtn.classList.remove("fav-pop");
            void favoriteBtn.offsetWidth;
            favoriteBtn.classList.add("fav-pop");

            applyServerFilterAndSort();
            showToast(
                isNowFav
                    ? `${server.name} ditambahkan ke Favorit.`
                    : `${server.name} dihapus dari Favorit.`,
                "info"
            );
        } catch (err) {
            showToast(err.message || "Gagal memperbarui favorit.", "error");
        }
    });

    editBtn.addEventListener("click", event => {
        event.stopPropagation();
        if (!hasProAccess()) {
            openUpgradeProModal();
            return;
        }
        openServerFormModal(server);
    });

    deleteBtn.addEventListener("click", async event => {
        event.stopPropagation();
        if (!hasProAccess()) {
            openUpgradeProModal();
            return;
        }

        const confirmed = await showConfirmModal({
            title: "Hapus Server?",
            message: `Hapus "${server.name}" dari daftar server?\n(Profil cache yang sudah tersimpan tidak ikut terhapus).`,
            confirmText: "Hapus Server",
            danger: true
        });

        if (!confirmed) return;

        try {
            await window.fivemAPI.deleteServer(server.id);
            showToast(`Server "${server.name}" dihapus.`, "success");
            await loadAndRenderServers();
        } catch (err) {
            showToast(err.message || "Gagal menghapus server.", "error");
        }
    });

    connectBtn.addEventListener("click", async event => {
        event.stopPropagation();
        connectBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Meluncurkan...';
        connectBtn.disabled = true;

        try {
            await window.fivemAPI.launchServer(server.id);
            updateFiveMProcessIndicator();
        } catch (err) {
            showToast(err.message || "Gagal meluncurkan server.", "error");
        } finally {
            connectBtn.innerHTML = '<i class="ri-play-line"></i> MASUK';
            connectBtn.disabled = false;
        }
    });

    return {
        card,
        refs: {
            bannerStrip,
            logoImg,
            fallbackAvatar,
            statusPill,
            statusText,
            pingBadge,
            capacitySection,
            capacityLabel,
            capacityPercent,
            capacityFill,
            buildPill,
            slotWatchBtn,
            connectBtn
        }
    };
}

const serverDetailModal = document.getElementById("serverDetailModal");
const detailBannerHeader = document.getElementById("detailBannerHeader");
const detailCloseBtn = document.getElementById("detailCloseBtn");
const detailLogoWrap = document.getElementById("detailLogoWrap");
const detailServerName = document.getElementById("detailServerName");
const detailStatusPill = document.getElementById("detailStatusPill");
const detailStatusText = document.getElementById("detailStatusText");
const detailHeaderPing = document.getElementById("detailHeaderPing");
const detailHeaderEndpoint = document.getElementById("detailHeaderEndpoint");
const detailPing = document.getElementById("detailPing");
const detailProjectDesc = document.getElementById("detailProjectDesc");
const detailPlayersCount = document.getElementById("detailPlayersCount");
const detailBuild = document.getElementById("detailBuild");
const detailOneSync = document.getElementById("detailOneSync");
const detailOwner = document.getElementById("detailOwner");
const detailResourcesCount = document.getElementById("detailResourcesCount");
const detailCacheProfile = document.getElementById("detailCacheProfile");
const detailTagsContainer = document.getElementById("detailTagsContainer");
const detailPlayersHeaderTitle = document.getElementById("detailPlayersHeaderTitle");
const detailPlayerSearchInput = document.getElementById("detailPlayerSearchInput");
const detailPlayersList = document.getElementById("detailPlayersList");
const detailSlotWatchBtn = document.getElementById("detailSlotWatchBtn");
const detailConnectBtn = document.getElementById("detailConnectBtn");

let activeDetailServer = null;
let activeDetailPlayers = [];
let lastFocusedServerCard = null;

function updateDetailWatchButtonState(serverId) {
    if (!detailSlotWatchBtn) return;
    const isWatching = watchedSlotServers.has(serverId);
    if (!hasProAccess()) {
        detailSlotWatchBtn.innerHTML =
            '<i class="ri-notification-3-line"></i> Pantau Slot <span class="pro-lock-pill"><i class="ri-lock-line"></i> PRO</span>';
        detailSlotWatchBtn.classList.remove("btn-primary");
        detailSlotWatchBtn.classList.add("btn-secondary");
        return;
    }

    if (isWatching) {
        detailSlotWatchBtn.innerHTML =
            '<i class="ri-notification-3-fill"></i> Memantau Slot (Klik untuk Berhenti)';
        detailSlotWatchBtn.classList.add("watching");
    } else {
        detailSlotWatchBtn.innerHTML =
            '<i class="ri-notification-3-line"></i> Pantau Slot Kosong';
        detailSlotWatchBtn.classList.remove("watching");
    }
}

function renderDetailPlayerList() {
    if (!detailPlayersList) return;
    const query = (detailPlayerSearchInput?.value || "").trim().toLowerCase();

    const filtered = activeDetailPlayers.filter(p =>
        !query || String(p.name || "").toLowerCase().includes(query)
    );

    if (detailPlayersHeaderTitle) {
        detailPlayersHeaderTitle.innerHTML = `<i class="ri-group-line"></i> Pemain Online (${filtered.length})`;
    }

    detailPlayersList.innerHTML = "";

    if (activeDetailPlayers.length === 0) {
        detailPlayersList.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 20px;">
                <p>Daftar pemain tidak dipublikasikan oleh server atau server sedang offline.</p>
            </div>
        `;
        return;
    }

    if (filtered.length === 0) {
        detailPlayersList.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 20px;">
                <p>Tidak ada nama pemain yang cocok dengan pencarian.</p>
            </div>
        `;
        return;
    }

    filtered.slice(0, 200).forEach(player => {
        const row = document.createElement("div");
        row.className = "player-row";

        const ping = Number(player.ping) || 0;
        let pingClass = "";
        if (ping > 120) {
            pingClass = "ping-high";
        } else if (ping >= 65) {
            pingClass = "ping-mid";
        }

        row.innerHTML = `
            <span class="player-name" title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</span>
            <span class="ping-badge ${pingClass}">${ping} ms</span>
        `;
        detailPlayersList.appendChild(row);
    });
}

function populateDetailModalUI(server, status) {
    if (!serverDetailModal) return;

    const isOnline = Boolean(status && status.online);
    const bannerUrl = status?.bannerDetail || status?.bannerConnecting || server.banner || "";
    const logoUrl = resolveLogoUrl(
        status?.logoUrl || status?.iconUrl || status?.logo || server.logo
    );

    if (detailBannerHeader) {
        detailBannerHeader.style.backgroundImage = bannerUrl
            ? `url("${bannerUrl.replace(/"/g, '\\"')}")`
            : "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-primary) 100%)";
    }

    if (detailLogoWrap) {
        detailLogoWrap.innerHTML = "";
        if (logoUrl) {
            const img = document.createElement("img");
            img.className = "server-logo";
            img.referrerPolicy = "no-referrer";
            img.src = logoUrl;
            img.alt = server.name;
            img.onerror = () => {
                if (server.fallbackLogo) {
                    const fallbackSrc = resolveLogoUrl(server.fallbackLogo);
                    if (fallbackSrc && img.src !== fallbackSrc) {
                        img.src = fallbackSrc;
                        return;
                    }
                }
                detailLogoWrap.innerHTML = `<div class="server-avatar-fallback">${escapeHtml(getServerInitials(server.name))}</div>`;
            };
            detailLogoWrap.appendChild(img);
        } else {
            detailLogoWrap.innerHTML = `<div class="server-avatar-fallback">${escapeHtml(getServerInitials(server.name))}</div>`;
        }
    }

    if (detailServerName) detailServerName.textContent = server.name || "Server Tanpa Nama";
    if (detailStatusPill && detailStatusText) {
        detailStatusPill.className = `status-pill ${isOnline ? "online" : "offline"}`;
        detailStatusText.textContent = isOnline ? "Online" : "Offline";
    }

    if (detailHeaderEndpoint) {
        const ep = server.endpoint || "-";
        detailHeaderEndpoint.textContent = ep.startsWith("cfx.re/") ? ep : `cfx.re/join/${ep}`;
    }

    const pingMs = typeof status?.pingMs === "number" ? status.pingMs : null;
    if (detailHeaderPing) {
        if (isOnline && pingMs !== null) {
            detailHeaderPing.classList.remove("hidden");
            let pingClass = "ping-low";
            if (pingMs > 140) {
                pingClass = "ping-high";
            } else if (pingMs >= 70) {
                pingClass = "ping-mid";
            }
            detailHeaderPing.className = `server-ping-badge ${pingClass}`;
            detailHeaderPing.innerHTML = `<i class="ri-signal-tower-line"></i> ${pingMs} ms`;
        } else if (isOnline) {
            detailHeaderPing.classList.remove("hidden");
            detailHeaderPing.className = "server-ping-badge ping-muted";
            detailHeaderPing.innerHTML = '<i class="ri-signal-tower-line"></i> --';
        } else {
            detailHeaderPing.classList.add("hidden");
        }
    }

    if (detailPing) {
        if (isOnline && pingMs !== null) {
            let label = "Cepat";
            let colorVar = "var(--accent-emerald, #10b981)";
            if (pingMs > 140) {
                label = "Tinggi";
                colorVar = "var(--accent-danger, #ef4444)";
            } else if (pingMs >= 70) {
                label = "Sedang";
                colorVar = "var(--accent-amber, #f59e0b)";
            }
            detailPing.innerHTML = `<i class="ri-signal-tower-line" style="color: ${colorVar};"></i> ${pingMs} ms <small style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(${label})</small>`;
        } else if (isOnline) {
            detailPing.innerHTML = '<i class="ri-signal-tower-line"></i> Mengukur...';
        } else {
            detailPing.innerHTML = '<i class="ri-signal-tower-line" style="color:var(--text-muted);"></i> Offline';
        }
    }

    const desc = status?.projectDesc || server.projectDesc || `Endpoint: cfx.re/join/${server.endpoint}`;
    if (detailProjectDesc) detailProjectDesc.textContent = desc;

    const players = Number(status?.players) || 0;
    const maxPlayers = Number(status?.maxPlayers) || 0;
    if (detailPlayersCount) {
        detailPlayersCount.textContent = isOnline ? `${players} / ${maxPlayers}` : "Offline";
    }

    if (detailBuild) detailBuild.textContent = status?.build || server.build || "-";
    if (detailOneSync) detailOneSync.textContent = status?.onesync || server.onesync || "Enabled";
    if (detailOwner) detailOwner.textContent = status?.ownerName || server.ownerName || "-";

    const resCount = status?.resourcesCount ?? server.resourcesCount ?? 0;
    if (detailResourcesCount) detailResourcesCount.textContent = `${resCount} Script`;
    if (detailCacheProfile) detailCacheProfile.textContent = server.cacheProfile || "-";

    const tags = Array.isArray(status?.tags) && status.tags.length > 0
        ? status.tags
        : Array.isArray(server.tags)
            ? server.tags
            : [];

    if (detailTagsContainer) {
        detailTagsContainer.innerHTML = tags
            .slice(0, 12)
            .map(tag => `<span class="meta-pill">#${escapeHtml(tag)}</span>`)
            .join("");
    }

    activeDetailPlayers = Array.isArray(status?.playersList)
        ? status.playersList
        : Array.isArray(status?.playerList)
            ? status.playerList
            : [];
    renderDetailPlayerList();
    updateDetailWatchButtonState(server.id);
}

async function openServerDetailModal(server) {
    if (!serverDetailModal) return;
    activeDetailServer = server;
    if (detailPlayerSearchInput) {
        detailPlayerSearchInput.value = "";
    }

    const cachedStatus = serverStatusCache.get(server.id) || null;
    populateDetailModalUI(server, cachedStatus);
    serverDetailModal.classList.remove("hidden");

    try {
        const freshStatus = await window.fivemAPI.getServerStatus(server.endpoint);
        serverStatusCache.set(server.id, freshStatus);
        serverOnlineState.set(server.id, Boolean(freshStatus && freshStatus.online));
        setCardStatusResult(server.id, freshStatus);
        if (activeDetailServer && activeDetailServer.id === server.id) {
            populateDetailModalUI(server, freshStatus);
        }
    } catch {}
}

function closeServerDetailModal() {
    if (serverDetailModal) {
        serverDetailModal.classList.add("hidden");
    }
    activeDetailServer = null;
    if (lastFocusedServerCard && typeof lastFocusedServerCard.focus === "function") {
        try {
            lastFocusedServerCard.focus();
        } catch {}
    }
}

if (detailCloseBtn) {
    detailCloseBtn.addEventListener("click", closeServerDetailModal);
}
if (serverDetailModal) {
    serverDetailModal.addEventListener("click", event => {
        if (event.target === serverDetailModal) {
            closeServerDetailModal();
        }
    });
}
if (detailPlayerSearchInput) {
    detailPlayerSearchInput.addEventListener("input", renderDetailPlayerList);
}
if (detailSlotWatchBtn) {
    detailSlotWatchBtn.addEventListener("click", () => {
        if (activeDetailServer) {
            toggleSlotWatcher(activeDetailServer);
        }
    });
}
if (detailConnectBtn) {
    detailConnectBtn.addEventListener("click", async () => {
        if (!activeDetailServer) return;
        const targetId = activeDetailServer.id;
        closeServerDetailModal();
        try {
            await window.fivemAPI.launchServer(targetId);
            updateFiveMProcessIndicator();
        } catch (err) {
            showToast(err.message || "Gagal meluncurkan server.", "error");
        }
    });
}

window.fivemAPI.onLaunchProgress(payload => {
    if (!launchStatusBar || !payload) return;

    if (hideLaunchBarTimeout) {
        clearTimeout(hideLaunchBarTimeout);
        hideLaunchBarTimeout = null;
    }

    launchStatusBar.classList.remove("hidden");

    const stepLabels = {
        checking: "CHECKING",
        mods: "MOD PROFILE",
        cache: "CACHE SYNC",
        launching: "STARTING FIVEM",
        countdown: "AUTO-JOIN DELAY",
        connected: "CONNECTED",
        cancelled: "CANCELLED",
        error: "ERROR"
    };

    if (launchStepBadge) {
        launchStepBadge.textContent = stepLabels[payload.step] || "LAUNCHING";
    }

    if (launchStatusText) {
        launchStatusText.textContent = payload.message || "Memproses peluncuran...";
    }

    if (launchProgressFill) {
        const pct = Math.max(0, Math.min(100, Number(payload.progress) || 0));
        launchProgressFill.style.width = `${pct}%`;
    }

    const isCountdown = payload.step === "countdown";
    if (launchConnectNowBtn) {
        launchConnectNowBtn.classList.toggle("hidden", !isCountdown);
    }
    if (launchCancelBtn) {
        launchCancelBtn.classList.toggle("hidden", !isCountdown);
    }

    const isDoneOrError = ["connected", "cancelled", "error"].includes(payload.step);
    if (launchSpinner) {
        launchSpinner.classList.toggle("hidden", isDoneOrError);
    }

    if (payload.step === "connected") {
        showToast(payload.message || "Menghubungkan ke server FiveM.", "success");
    } else if (payload.step === "cancelled") {
        showToast(payload.message || "Koneksi otomatis dibatalkan.", "warning");
    }

    if (isDoneOrError) {
        hideLaunchBarTimeout = setTimeout(() => {
            launchStatusBar.classList.add("hidden");
        }, 4500);
    }
});

if (launchConnectNowBtn) {
    launchConnectNowBtn.addEventListener("click", async () => {
        try {
            await window.fivemAPI.connectNow();
        } catch (err) {
            showToast(err.message || "Gagal menghubungkan langsung.", "error");
        }
    });
}

if (launchCancelBtn) {
    launchCancelBtn.addEventListener("click", async () => {
        try {
            await window.fivemAPI.cancelLaunch();
        } catch (err) {
            showToast(err.message || "Gagal membatalkan peluncuran.", "error");
        }
    });
}

async function refreshAllServerStatuses() {
    indexedServers.forEach(server => setCardLoadingSkeleton(server.id));

    await Promise.all(
        indexedServers.map(async server => {
            try {
                const status = await window.fivemAPI.getServerStatus(server.endpoint);
                const isOnline = Boolean(status && status.online);
                serverOnlineState.set(server.id, isOnline);
                serverStatusCache.set(server.id, status);
                setCardStatusResult(server.id, status);
            } catch {
                serverOnlineState.set(server.id, false);
                setCardStatusResult(server.id, { online: false, players: 0, maxPlayers: 0 });
            }
        })
    );

    applyServerFilterAndSort();
}

async function loadAndRenderServers() {
    const container = document.getElementById("serversContainer");
    container.innerHTML = "";
    cardMap.clear();
    cardRefsMap.clear();

    const [servers, initialFavorites] = await Promise.all([
        window.fivemAPI.getServers(),
        window.fivemAPI.getFavorites()
    ]);

    currentFavorites = Array.isArray(initialFavorites) ? [...initialFavorites] : [];
    indexedServers = servers.map((server, index) => ({
        ...server,
        originalIndex: index
    }));

    indexedServers.forEach(server => {
        const { card, refs } = createServerCard(server);
        cardMap.set(server.id, card);
        cardRefsMap.set(server.id, refs);
    });

    applyServerFilterAndSort();
    await refreshAllServerStatuses();
}

loadAndRenderServers();

const addServerBtn = document.getElementById("addServerBtn");
const serverFormModal = document.getElementById("serverFormModal");
const serverFormTitle = document.getElementById("serverFormTitle");
const serverFormCloseBtn = document.getElementById("serverFormCloseBtn");
const serverFormCancelBtn = document.getElementById("serverFormCancelBtn");
const serverCrudForm = document.getElementById("serverCrudForm");

const serverFormId = document.getElementById("serverFormId");
const serverFormName = document.getElementById("serverFormName");
const serverFormConnect = document.getElementById("serverFormConnect");
const fetchCfxDataBtn = document.getElementById("fetchCfxDataBtn");
const serverFormEndpointHint = document.getElementById("serverFormEndpointHint");
const serverFormBuild = document.getElementById("serverFormBuild");
const serverFormCacheProfile = document.getElementById("serverFormCacheProfile");
const serverFormModProfile = document.getElementById("serverFormModProfile");
const serverFormLogo = document.getElementById("serverFormLogo");
const serverFormBanner = document.getElementById("serverFormBanner");

const cfxFormPreviewCard = document.getElementById("cfxFormPreviewCard");
const cfxPreviewBanner = document.getElementById("cfxPreviewBanner");
const cfxPreviewLogo = document.getElementById("cfxPreviewLogo");
const cfxPreviewTitle = document.getElementById("cfxPreviewTitle");
const cfxPreviewMeta = document.getElementById("cfxPreviewMeta");

let autoFetchDebounceTimer = null;

function renderCfxFormPreview({ name, logo, logoUrl, banner, bannerDetail, players, maxPlayers, build }) {
    if (!cfxFormPreviewCard) return;
    const effectiveLogo = logoUrl || logo || "";
    const effectiveBanner = banner || bannerDetail || "";

    if (!name && !effectiveLogo && !effectiveBanner) {
        cfxFormPreviewCard.classList.add("hidden");
        return;
    }

    cfxFormPreviewCard.classList.remove("hidden");
    if (cfxPreviewBanner) {
        cfxPreviewBanner.style.backgroundImage = effectiveBanner
            ? `url("${effectiveBanner.replace(/"/g, '\\"')}")`
            : "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-primary) 100%)";
    }
    if (cfxPreviewLogo) {
        const resolved = resolveLogoUrl(effectiveLogo);
        if (resolved) {
            cfxPreviewLogo.referrerPolicy = "no-referrer";
            cfxPreviewLogo.src = resolved;
            cfxPreviewLogo.classList.remove("hidden");
        } else {
            cfxPreviewLogo.classList.add("hidden");
        }
    }
    if (cfxPreviewTitle) {
        cfxPreviewTitle.textContent = name || "Server Terdeteksi";
    }
    if (cfxPreviewMeta) {
        const playerInfo = maxPlayers
            ? `<i class="ri-group-line"></i> ${players}/${maxPlayers} Pemain · `
            : "";
        cfxPreviewMeta.innerHTML = `${playerInfo}<i class="ri-tools-line"></i> Build ${escapeHtml(build || "-")} · Logo &amp; Banner Cfx.re`;
    }
}

async function handleAutoFetchCfxMetadata(silent = false) {
    if (!serverFormConnect) return;
    const raw = serverFormConnect.value.trim();
    const ep = extractClientEndpointPreview(raw);
    if (!ep) {
        if (!silent) {
            showToast("Masukkan kode join atau tautan Cfx.re terlebih dahulu.", "warning");
        }
        return;
    }

    if (fetchCfxDataBtn) {
        fetchCfxDataBtn.disabled = true;
        fetchCfxDataBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Mengambil...';
    }
    if (serverFormEndpointHint) {
        serverFormEndpointHint.textContent = `Mengambil info Cfx.re untuk endpoint "${ep}"...`;
    }

    try {
        const result = await window.fivemAPI.fetchCfxMetadata(raw);
        if (!result || result.ok === false) {
            const errMsg =
                result?.error || "Server tidak ditemukan atau sedang offline (404)";
            if (serverFormEndpointHint) {
                serverFormEndpointHint.textContent = `Endpoint: ${ep} (${errMsg}, Anda tetap dapat mengisi nama secara manual).`;
            }
            if (!silent) {
                showToast(errMsg, "warning");
            }
            return;
        }

        const meta = result.data || result;
        if (serverFormName && (!serverFormName.value.trim() || !silent)) {
            serverFormName.value = meta.name || "";
        }
        if (serverFormBuild) {
            serverFormBuild.value = meta.build && meta.build !== "-" ? meta.build : "";
        }
        if (serverFormCacheProfile && !serverFormId.value) {
            serverFormCacheProfile.value = meta.cacheProfile || "";
        }
        if (serverFormLogo) {
            serverFormLogo.value = meta.iconFileUrl || meta.logoUrl || meta.logo || "";
        }
        if (serverFormBanner) {
            serverFormBanner.value = meta.banner || "";
        }

        renderCfxFormPreview(meta);
        if (serverFormEndpointHint) {
            serverFormEndpointHint.innerHTML = `<i class="ri-check-line"></i> Terhubung ke Cfx.re (${escapeHtml(ep)}) · Logo dan banner siap disimpan.`;
        }
        if (!silent) {
            showToast(`Data server "${meta.name}" dimuat dari Cfx.re.`, "success");
        }
    } catch (err) {
        if (serverFormEndpointHint) {
            serverFormEndpointHint.textContent = `Endpoint: ${ep} (Server sedang offline atau gagal diambil otomatis, Anda tetap dapat mengisi nama secara manual).`;
        }
        if (!silent) {
            showToast(err.message || "Gagal mengambil metadata Cfx.re.", "warning");
        }
    } finally {
        if (fetchCfxDataBtn) {
            fetchCfxDataBtn.disabled = false;
            fetchCfxDataBtn.innerHTML = '<i class="ri-search-line"></i> Ambil Info';
        }
    }
}

async function populateServerFormModProfileDropdown(selectedValue = "") {
    if (!serverFormModProfile) return;

    serverFormModProfile.innerHTML = `<option value="">Jangan Ubah (Gunakan Mod yang Sedang Aktif)</option>`;

    try {
        const modData = await window.fivemAPI.getModProfiles();
        const profiles = Array.isArray(modData?.profiles) ? modData.profiles : [];

        profiles.forEach(p => {
            const optionValue = p.isActive && modData.activeModOriginalName
                ? modData.activeModOriginalName
                : p.folderName;
            const opt = document.createElement("option");
            opt.value = optionValue;
            opt.textContent = p.isActive
                ? `[AKTIF] ${p.displayName} (${p.rpfCount} RPF · ${p.formattedSize})`
                : `${p.folderName} (${p.rpfCount} RPF · ${p.formattedSize})`;
            serverFormModProfile.appendChild(opt);
        });

        if (
            selectedValue &&
            !Array.from(serverFormModProfile.options).some(o => o.value === selectedValue)
        ) {
            const customOpt = document.createElement("option");
            customOpt.value = selectedValue;
            customOpt.textContent = selectedValue;
            serverFormModProfile.appendChild(customOpt);
        }

        serverFormModProfile.value = selectedValue || "";
    } catch {
        serverFormModProfile.value = "";
    }
}

async function openServerFormModal(server = null) {
    if (!hasProAccess()) {
        showToast("Manajemen server kustom memerlukan akun PRO atau DEVELOPER.", "warning");
        openUpgradeProModal();
        return;
    }

    if (!serverFormModal) return;

    if (server) {
        serverFormTitle.innerHTML = `<i class="ri-edit-line"></i> Edit Server: ${escapeHtml(server.name)}`;
        serverFormId.value = server.id || "";
        serverFormName.value = server.name || "";
        serverFormConnect.value = server.connect || server.endpoint || "";
        serverFormBuild.value = server.build && server.build !== "-" ? server.build : "";
        serverFormCacheProfile.value = server.cacheProfile || "";
        serverFormLogo.value = server.logo || "";
        serverFormBanner.value = server.banner || "";
        renderCfxFormPreview({
            name: server.name,
            logo: server.logo,
            banner: server.banner,
            build: server.build
        });
        await populateServerFormModProfileDropdown(server.modProfile || "");
    } else {
        serverFormTitle.innerHTML = '<i class="ri-add-circle-line"></i> Tambah Server';
        serverCrudForm.reset();
        serverFormId.value = "";
        serverFormLogo.value = "";
        serverFormBanner.value = "";
        renderCfxFormPreview({});
        await populateServerFormModProfileDropdown("");
    }

    if (serverFormEndpointHint) {
        const ep = extractClientEndpointPreview(serverFormConnect.value);
        serverFormEndpointHint.textContent = ep
            ? `Endpoint terdeteksi: ${ep} (cfx.re/join/${ep})`
            : "Masukkan kode join lalu klik 'Ambil Info' untuk mengisi otomatis dari Cfx.re.";
    }

    serverFormModal.classList.remove("hidden");
    serverFormConnect.focus();
}

function closeServerFormModal() {
    if (serverFormModal) {
        serverFormModal.classList.add("hidden");
    }
}

if (addServerBtn) {
    addServerBtn.addEventListener("click", () => openServerFormModal(null));
}

if (serverFormCloseBtn) {
    serverFormCloseBtn.addEventListener("click", closeServerFormModal);
}

if (serverFormCancelBtn) {
    serverFormCancelBtn.addEventListener("click", closeServerFormModal);
}

if (fetchCfxDataBtn) {
    fetchCfxDataBtn.addEventListener("click", () => handleAutoFetchCfxMetadata(false));
}

if (serverFormConnect) {
    serverFormConnect.addEventListener("input", () => {
        const ep = extractClientEndpointPreview(serverFormConnect.value);
        if (serverFormEndpointHint) {
            serverFormEndpointHint.textContent = ep
                ? `Endpoint terdeteksi: ${ep} (cfx.re/join/${ep})`
                : "Masukkan kode join lalu klik 'Ambil Info' untuk mengisi otomatis dari Cfx.re.";
        }
        if (autoFetchDebounceTimer) {
            clearTimeout(autoFetchDebounceTimer);
            autoFetchDebounceTimer = null;
        }
        if (/^[a-z0-9]{6,}$/i.test(ep)) {
            autoFetchDebounceTimer = setTimeout(() => {
                handleAutoFetchCfxMetadata(true);
            }, 600);
        }
    });
}

if (serverCrudForm) {
    serverCrudForm.addEventListener("submit", async event => {
        event.preventDefault();

        const payload = {
            id: serverFormId.value.trim(),
            name: serverFormName.value.trim(),
            connect: serverFormConnect.value.trim(),
            build: serverFormBuild.value.trim() || "-",
            cacheProfile: serverFormCacheProfile.value.trim(),
            modProfile: serverFormModProfile ? serverFormModProfile.value.trim() : "",
            logo: serverFormLogo.value.trim(),
            banner: serverFormBanner.value.trim()
        };

        try {
            const saved = await window.fivemAPI.saveServer(payload);
            closeServerFormModal();
            showToast(`Server "${saved.name}" disimpan.`, "success");
            await Promise.all([loadAndRenderServers(), loadProfiles(), loadModProfiles()]);
        } catch (err) {
            showToast(err.message || "Gagal menyimpan data server.", "error");
        }
    });
}

if (serverSearchInput) {
    serverSearchInput.addEventListener("input", () => {
        applyServerFilterAndSort();
    });
}

if (clearSearchBtn && serverSearchInput) {
    clearSearchBtn.addEventListener("click", () => {
        serverSearchInput.value = "";
        serverSearchInput.focus();
        applyServerFilterAndSort();
    });
}

filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
        currentFilter = pill.dataset.filter || "all";
        filterPills.forEach(p => p.classList.toggle("active", p === pill));
        applyServerFilterAndSort();
    });
});

if (refreshServersBtn) {
    refreshServersBtn.addEventListener("click", async () => {
        refreshServersBtn.disabled = true;
        refreshServersBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memuat...';
        await refreshAllServerStatuses();
        refreshServersBtn.innerHTML = '<i class="ri-refresh-line"></i> Segarkan Status';
        refreshServersBtn.disabled = false;
        showToast("Status server diperbarui.", "info");
    });
}

document.getElementById("browseBtn").addEventListener("click", async () => {
    try {
        const filePath = await window.fivemAPI.browseFiveM();
        if (filePath) {
            document.getElementById("fivemPath").innerText = filePath;
            showToast("Lokasi FiveM.exe diperbarui.", "success");
            await loadProfiles();
        }
    } catch (err) {
        showToast(err.message || "Gagal memilih file FiveM.exe.", "error");
    }
});

const profileNameInput = document.getElementById("profileName");
const profileSelectEl = document.getElementById("profileSelect");
const cacheProfilesGridEl = document.getElementById("cacheProfilesGrid");
const totalCacheDiskBadgeEl = document.getElementById("totalCacheDiskBadge");
const refreshCacheHubBtn = document.getElementById("refreshCacheHubBtn");
const activeCacheModeHintEl = document.getElementById("activeCacheModeHint");
const currentCacheModeBadgeEl = document.getElementById("currentCacheModeBadge");
const cacheModeButtons = document.querySelectorAll(".cache-mode-btn");

profileSelectEl.addEventListener("change", () => {
    if (profileSelectEl.value) {
        profileNameInput.value = profileSelectEl.value;
    }
});

function updateCacheModeUI(mode) {
    const normalized = mode === "junction" && hasProAccess() ? "junction" : "copy";
    const isJunction = normalized === "junction";

    if (currentCacheModeBadgeEl) {
        currentCacheModeBadgeEl.innerHTML = isJunction
            ? '<i class="ri-flashlight-line"></i> Fast Junction Mode'
            : '<i class="ri-file-copy-2-line"></i> Standard Copy Mode';
    }

    if (activeCacheModeHintEl) {
        activeCacheModeHintEl.innerHTML = isJunction
            ? '<i class="ri-flashlight-line"></i> Mode: Fast Junction'
            : '<i class="ri-file-copy-2-line"></i> Mode: Standard Copy';
    }

    cacheModeButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.cacheMode === normalized);
    });
}

cacheModeButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        const mode = btn.dataset.cacheMode;
        if (mode === "junction" && !hasProAccess()) {
            showToast(
                "Mode Fast Junction memerlukan akun PRO atau DEVELOPER.",
                "warning"
            );
            openUpgradeProModal();
            return;
        }

        try {
            const savedMode = await window.fivemAPI.saveCacheMode(mode);
            updateCacheModeUI(savedMode);
            showToast(
                savedMode === "junction"
                    ? "Mode cache diubah ke Fast Directory Junction."
                    : "Mode cache diubah ke Standard Copy.",
                "success"
            );
        } catch (err) {
            showToast(err.message || "Gagal menyimpan mode cache.", "error");
        }
    });
});

async function handleLoadCacheProfile(profileName) {
    if (!profileName) {
        showToast("Masukkan atau pilih profil terlebih dahulu.", "warning");
        return;
    }

    try {
        const result = await window.fivemAPI.loadCache(profileName);
        const isSuccess =
            typeof result === "object" && result !== null
                ? Boolean(result.success ?? result.loaded)
                : Boolean(result);
        const modeUsed = typeof result === "object" && result !== null ? result.mode : "";
        const errorMsg = typeof result === "object" && result !== null ? result.error : null;

        if (!isSuccess) {
            showToast(
                errorMsg ||
                    `Profil "${profileName}" belum memiliki data server-cache tersimpan. Cache aktif dipertahankan.`,
                "warning"
            );
        } else {
            const modeLabel =
                modeUsed === "junction"
                    ? " (via Fast Junction)"
                    : modeUsed === "copy"
                    ? " (via Mode Salin Standar)"
                    : "";
            showToast(`Profil cache "${profileName}" berhasil dimuat${modeLabel}.`, "success");
        }
        await loadProfiles();
    } catch (err) {
        showToast(err.message || "Gagal memuat cache.", "error");
    }
}

async function handleSaveCacheToProfile(profileName) {
    if (!profileName) {
        showToast("Masukkan atau pilih profil terlebih dahulu.", "warning");
        return;
    }

    try {
        await window.fivemAPI.saveCache(profileName);
        await loadProfiles();
        profileSelectEl.value = profileName;
        showToast(`Cache aktif FiveM disimpan ke profil "${profileName}".`, "success");
    } catch (err) {
        showToast(err.message || "Gagal menyimpan cache.", "error");
    }
}

async function handleDeleteCacheProfile(profileName) {
    if (!profileName) {
        showToast("Pilih profil yang ingin dihapus terlebih dahulu.", "warning");
        return;
    }

    const confirmDelete = await showConfirmModal({
        title: "Hapus Profil Cache?",
        message: `Hapus profil "${profileName}" beserta seluruh data cache di dalamnya secara permanen?`,
        confirmText: "Hapus Permanen",
        danger: true
    });

    if (!confirmDelete) {
        return;
    }

    try {
        await window.fivemAPI.deleteProfile(profileName);
        if (profileNameInput.value.trim() === profileName) {
            profileNameInput.value = "";
        }
        await loadProfiles();
        showToast(`Profil "${profileName}" dihapus.`, "success");
    } catch (err) {
        showToast(err.message || "Gagal menghapus profil.", "error");
    }
}

function createCacheProfileCard(profile) {
    const card = document.createElement("div");
    card.className = "cache-profile-card";
    if (profile.isActiveJunction) {
        card.classList.add("active-junction");
    }

    let statusBadgeClass = "status-empty";
    let statusBadgeHtml = '<i class="ri-inbox-line"></i> Kosong';
    if (profile.isActiveJunction) {
        statusBadgeClass = "status-active";
        statusBadgeHtml = '<i class="ri-flashlight-line"></i> Aktif (Junction)';
    } else if (profile.hasCache) {
        statusBadgeClass = "status-saved";
        statusBadgeHtml = '<i class="ri-check-line"></i> Tersimpan';
    }

    const linkedServers = Array.isArray(profile.linkedServers) ? profile.linkedServers : [];
    const linkedServersHtml = linkedServers.length > 0
        ? linkedServers
            .map(srv => `<span class="meta-pill"><i class="ri-gamepad-line"></i> ${escapeHtml(srv.name)}</span>`)
            .join("")
        : `<span class="meta-pill">Belum ditautkan ke server</span>`;

    card.innerHTML = `
        <div class="cache-profile-top">
            <div class="cache-profile-title-wrap">
                <h3 class="cache-profile-name" title="${escapeHtml(profile.name)}"><i class="ri-folder-3-line"></i> ${escapeHtml(profile.name)}</h3>
                <span class="cache-profile-size"><i class="ri-hard-drive-2-line"></i> ${escapeHtml(profile.formattedSize || "0 B")}</span>
            </div>
            <span class="profile-status-badge ${statusBadgeClass}">${statusBadgeHtml}</span>
        </div>

        <div class="cache-linked-servers">
            <span class="cache-linked-label">Server Terhubung (${linkedServers.length})</span>
            <div class="cache-linked-pills">${linkedServersHtml}</div>
        </div>

        <div class="cache-profile-actions">
            <button type="button" class="btn btn-primary btn-card-load" title="Muat cache profil ini ke FiveM">
                <i class="ri-folder-open-line"></i> Muat Cache
            </button>
            <button type="button" class="btn btn-secondary btn-card-save" title="Simpan cache aktif FiveM ke profil ini">
                <i class="ri-save-line"></i> Simpan Aktif
            </button>
            <button type="button" class="btn btn-danger btn-icon-only btn-card-delete" title="Hapus profil cache ini">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
    `;

    const loadBtn = card.querySelector(".btn-card-load");
    const saveBtn = card.querySelector(".btn-card-save");
    const deleteBtn = card.querySelector(".btn-card-delete");

    loadBtn.addEventListener("click", async () => {
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memuat...';
        await handleLoadCacheProfile(profile.name);
        loadBtn.disabled = false;
        loadBtn.innerHTML = '<i class="ri-folder-open-line"></i> Muat Cache';
    });

    saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Menyimpan...';
        await handleSaveCacheToProfile(profile.name);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="ri-save-line"></i> Simpan Aktif';
    });

    deleteBtn.addEventListener("click", async () => {
        await handleDeleteCacheProfile(profile.name);
    });

    return card;
}

async function loadProfiles() {
    try {
        const detailed = await window.fivemAPI.getProfilesDetailed();
        const profiles = detailed && Array.isArray(detailed.profiles) ? detailed.profiles : [];

        if (totalCacheDiskBadgeEl) {
            totalCacheDiskBadgeEl.innerHTML = `<i class="ri-hard-drive-2-line"></i> Total Disk: ${escapeHtml(detailed?.formattedTotalSize || "0 B")}`;
        }

        const previousSelected = profileSelectEl.value;
        profileSelectEl.innerHTML = "";

        if (profiles.length === 0) {
            const emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = "Belum ada profil";
            profileSelectEl.appendChild(emptyOption);
        } else {
            profiles.forEach(profile => {
                const option = document.createElement("option");
                option.value = profile.name;
                option.textContent = `${profile.name} (${profile.formattedSize || "0 B"})`;
                profileSelectEl.appendChild(option);
            });

            if (previousSelected && profiles.some(p => p.name === previousSelected)) {
                profileSelectEl.value = previousSelected;
            }
        }

        if (cacheProfilesGridEl) {
            cacheProfilesGridEl.innerHTML = "";

            if (profiles.length === 0) {
                cacheProfilesGridEl.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1; padding: 32px 20px;">
                        <div class="empty-state-icon"><i class="ri-folder-3-line"></i></div>
                        <h3>Belum Ada Profil Cache</h3>
                        <p>Buat profil cache baru di atas atau simpan cache FiveM yang sedang aktif.</p>
                    </div>
                `;
            } else {
                profiles.forEach(profile => {
                    cacheProfilesGridEl.appendChild(createCacheProfileCard(profile));
                });
            }
        }
    } catch (err) {
        console.error("Gagal memuat daftar profil:", err);
    }
}

if (refreshCacheHubBtn) {
    refreshCacheHubBtn.addEventListener("click", async () => {
        refreshCacheHubBtn.disabled = true;
        refreshCacheHubBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Menghitung...';
        await loadProfiles();
        refreshCacheHubBtn.innerHTML = '<i class="ri-refresh-line"></i> Hitung Ulang';
        refreshCacheHubBtn.disabled = false;
        showToast("Ukuran disk dan status profil cache diperbarui.", "info");
    });
}

document.getElementById("createProfile").addEventListener("click", async () => {
    const profileName = profileNameInput.value.trim();

    if (!profileName) {
        showToast("Masukkan nama profil terlebih dahulu.", "warning");
        return;
    }

    try {
        await window.fivemAPI.createProfile(profileName);
        await loadProfiles();
        profileSelectEl.value = profileName;
        showToast(`Profil "${profileName}" dibuat.`, "success");
    } catch (err) {
        showToast(err.message || "Gagal membuat profil.", "error");
    }
});

const saveCacheBtn = document.getElementById("saveCache");
if (saveCacheBtn) {
    saveCacheBtn.addEventListener("click", async () => {
        const profileName = profileNameInput.value.trim() || profileSelectEl.value;
        const originalHtml = saveCacheBtn.innerHTML;
        saveCacheBtn.disabled = true;
        saveCacheBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Menyimpan...';
        try {
            await handleSaveCacheToProfile(profileName);
        } finally {
            saveCacheBtn.disabled = false;
            saveCacheBtn.innerHTML = originalHtml;
        }
    });
}

const loadCacheBtn = document.getElementById("loadCache");
if (loadCacheBtn) {
    loadCacheBtn.addEventListener("click", async () => {
        const profileName = profileNameInput.value.trim() || profileSelectEl.value;
        const originalHtml = loadCacheBtn.innerHTML;
        loadCacheBtn.disabled = true;
        loadCacheBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memuat...';
        try {
            await handleLoadCacheProfile(profileName);
        } finally {
            loadCacheBtn.disabled = false;
            loadCacheBtn.innerHTML = originalHtml;
        }
    });
}

document.getElementById("deleteProfile").addEventListener("click", async () => {
    const profileName = profileSelectEl.value || profileNameInput.value.trim();
    await handleDeleteCacheProfile(profileName);
});

// Cleaner Hub Integration
const trashTotalSizeBadge = document.getElementById("trashTotalSizeBadge");
const cleanerCrashesStat = document.getElementById("cleanerCrashesStat");
const cleanerLogsStat = document.getElementById("cleanerLogsStat");
const scanTrashBtn = document.getElementById("scanTrashBtn");
const cleanTrashBtn = document.getElementById("cleanTrashBtn");

async function updateCleanerStats() {
    if (!trashTotalSizeBadge) return;
    trashTotalSizeBadge.textContent = "Memindai...";
    try {
        const stats = await window.fivemAPI.getCleanupStats();
        if (!stats.available) {
            trashTotalSizeBadge.textContent = "FiveM belum diatur";
            if (cleanerCrashesStat) cleanerCrashesStat.textContent = "-";
            if (cleanerLogsStat) cleanerLogsStat.textContent = "-";
            if (cleanTrashBtn) cleanTrashBtn.disabled = true;
            return;
        }

        trashTotalSizeBadge.textContent = `Total: ${stats.formattedTotalSize}`;
        if (cleanerCrashesStat) {
            cleanerCrashesStat.textContent = `${stats.formattedCrashesSize} (${stats.crashesCount} file)`;
        }
        if (cleanerLogsStat) {
            cleanerLogsStat.textContent = `${stats.formattedLogsSize} (${stats.logsCount} file)`;
        }
        if (cleanTrashBtn) {
            cleanTrashBtn.disabled = !stats.canClean;
        }
    } catch {
        trashTotalSizeBadge.textContent = "Gagal memindai";
    }
}

if (scanTrashBtn) {
    scanTrashBtn.addEventListener("click", async () => {
        const original = scanTrashBtn.innerHTML;
        scanTrashBtn.disabled = true;
        scanTrashBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memindai...';
        try {
            await updateCleanerStats();
            showToast("Pemindaian file sampah FiveM selesai.", "info");
        } finally {
            scanTrashBtn.disabled = false;
            scanTrashBtn.innerHTML = original;
        }
    });
}

if (cleanTrashBtn) {
    cleanTrashBtn.addEventListener("click", async () => {
        const stats = await window.fivemAPI.getCleanupStats();
        if (!stats.canClean) {
            showToast("Tidak ada file crash dump atau log sampah untuk dibersihkan.", "info");
            return;
        }

        const confirmed = await showConfirmModal({
            title: "Bersihkan Cache & Crash Dump",
            message: `Hapus ${stats.totalCount} file sampah (${stats.formattedTotalSize}) di FiveM.app/crashes dan FiveM.app/logs? Tindakan ini aman untuk melegakan disk dan menjaga stabilitas game.`,
            confirmText: "Bersihkan Sekarang",
            danger: true
        });

        if (!confirmed) return;

        cleanTrashBtn.disabled = true;
        cleanTrashBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Membersihkan...';
        try {
            const res = await window.fivemAPI.performCleanup();
            showToast(res.message, "success");
            await updateCleanerStats();
        } catch (err) {
            showToast(err.message || "Gagal membersihkan sampah FiveM.", "error");
        } finally {
            cleanTrashBtn.disabled = false;
            cleanTrashBtn.innerHTML = '<i class="ri-delete-bin-line"></i> Bersihkan Sampah';
        }
    });
}

(async () => {
    const [tier, filePath, cacheMode] = await Promise.all([
        window.fivemAPI.getAccountTier(),
        window.fivemAPI.getFiveMPath(),
        window.fivemAPI.getCacheMode()
    ]);
    applyAccountTierUI(tier || "free");
    document.getElementById("fivemPath").innerText = filePath;
    updateCacheModeUI(cacheMode || "copy");
    updateCleanerStats();
})();

document.getElementById("exportConfig").addEventListener("click", async () => {
    try {
        const success = await window.fivemAPI.exportConfig();
        if (success) {
            showToast("Konfigurasi diekspor.", "success");
        }
    } catch (err) {
        showToast(err.message || "Gagal mengekspor konfigurasi.", "error");
    }
});

document.getElementById("importConfig").addEventListener("click", async () => {
    try {
        const success = await window.fivemAPI.importConfig();
        if (success) {
            const [tier, theme, priority, affinity, delay, filePath, cacheMode] = await Promise.all([
                window.fivemAPI.getAccountTier(),
                window.fivemAPI.getTheme(),
                window.fivemAPI.getPriority(),
                window.fivemAPI.getAffinity(),
                window.fivemAPI.getLaunchDelay(),
                window.fivemAPI.getFiveMPath(),
                window.fivemAPI.getCacheMode()
            ]);
            applyAccountTierUI(tier || "free");
            applyThemeUI(theme || "obsidian");
            updatePriorityActiveUI(priority || "normal");
            updateAffinityActiveUI(affinity || "");
            updateCacheModeUI(cacheMode || "copy");
            document.getElementById("launchDelay").value = delay;
            document.getElementById("fivemPath").innerText = filePath;
            await Promise.all([loadProfiles(), loadModProfiles()]);
            showToast("Konfigurasi diimpor dan diterapkan.", "success");
        }
    } catch (err) {
        showToast(err.message || "Gagal mengimpor konfigurasi.", "error");
    }
});

loadProfiles();

const totalModsDiskBadgeEl = document.getElementById("totalModsDiskBadge");
const refreshModsHubBtn = document.getElementById("refreshModsHubBtn");
const newModProfileNameInput = document.getElementById("newModProfileName");
const createModProfileBtn = document.getElementById("createModProfileBtn");
const activeModOriginBadgeEl = document.getElementById("activeModOriginBadge");
const modsBaseDirTextEl = document.getElementById("modsBaseDirText");
const openActiveModsFolderBtn = document.getElementById("openActiveModsFolderBtn");
const modProfilesCountBadgeEl = document.getElementById("modProfilesCountBadge");
const modProfilesGridEl = document.getElementById("modProfilesGrid");

const modNoteModalEl = document.getElementById("modNoteModal");
const modNoteModalTitleEl = document.getElementById("modNoteModalTitle");
const modNoteCloseBtn = document.getElementById("modNoteCloseBtn");
const modNoteCancelBtn = document.getElementById("modNoteCancelBtn");
const modNoteForm = document.getElementById("modNoteForm");
const modNoteTargetProfileInput = document.getElementById("modNoteTargetProfile");
const modNoteInput = document.getElementById("modNoteInput");

function openModNoteModal(profile) {
    if (!modNoteModalEl || !profile) return;
    const targetKey = profile.canonicalProfileName || profile.folderName;
    if (modNoteTargetProfileInput) {
        modNoteTargetProfileInput.value = targetKey;
    }
    if (modNoteModalTitleEl) {
        const label =
            profile.isActive && profile.activeOriginLabel
                ? `${profile.folderName} (${profile.activeOriginLabel})`
                : profile.folderName;
        modNoteModalTitleEl.innerHTML = `<i class="ri-edit-line"></i> Catatan: ${escapeHtml(label)}`;
    }
    if (modNoteInput) {
        modNoteInput.value = profile.description || "";
    }
    modNoteModalEl.classList.remove("hidden");
    setTimeout(() => {
        if (modNoteInput) {
            modNoteInput.focus();
            modNoteInput.setSelectionRange(modNoteInput.value.length, modNoteInput.value.length);
        }
    }, 30);
}

function closeModNoteModal() {
    if (modNoteModalEl) {
        modNoteModalEl.classList.add("hidden");
    }
}

if (modNoteCloseBtn) {
    modNoteCloseBtn.addEventListener("click", closeModNoteModal);
}
if (modNoteCancelBtn) {
    modNoteCancelBtn.addEventListener("click", closeModNoteModal);
}
if (modNoteModalEl) {
    modNoteModalEl.addEventListener("click", e => {
        if (e.target === modNoteModalEl) {
            closeModNoteModal();
        }
    });
}
if (modNoteForm) {
    modNoteForm.addEventListener("submit", async e => {
        e.preventDefault();
        const targetProfile = modNoteTargetProfileInput ? modNoteTargetProfileInput.value.trim() : "";
        const noteText = modNoteInput ? modNoteInput.value.trim() : "";
        if (!targetProfile) return;

        try {
            await window.fivemAPI.saveModDescription(targetProfile, noteText);
            closeModNoteModal();
            await loadModProfiles();
            showToast(
                noteText
                    ? `Catatan untuk "${targetProfile}" disimpan.`
                    : `Catatan untuk "${targetProfile}" dihapus.`,
                "success"
            );
        } catch (err) {
            showToast(err.message || "Gagal menyimpan catatan folder mods.", "error");
        }
    });
}

function createModProfileCard(profile) {
    const card = document.createElement("div");
    card.className = `cache-profile-card mod-profile-card${profile.isActive ? " active-junction" : ""}`;

    const topRow = document.createElement("div");
    topRow.className = "cache-profile-top";

    const titleWrap = document.createElement("div");
    titleWrap.className = "cache-profile-title-wrap";

    const nameEl = document.createElement("h3");
    nameEl.className = "cache-profile-name";
    nameEl.innerHTML = `<i class="ri-puzzle-line"></i> ${escapeHtml(profile.folderName)}`;
    nameEl.title = profile.fullPath || profile.folderName;

    const statusBadge = document.createElement("span");
    if (profile.isActive) {
        statusBadge.className = "cache-status-badge status-active-junction";
        statusBadge.innerHTML = '<i class="ri-checkbox-circle-line status-icon-online"></i> AKTIF (Digunakan FiveM)';
    } else {
        statusBadge.className = "cache-status-badge status-saved";
        statusBadge.innerHTML = '<i class="ri-archive-line"></i> Siap Diaktifkan';
    }

    titleWrap.appendChild(nameEl);
    if (profile.isActive && profile.activeOriginLabel) {
        const originSub = document.createElement("span");
        originSub.className = "mod-origin-sub";
        originSub.textContent = `Profil Asal: ${profile.activeOriginLabel}`;
        titleWrap.appendChild(originSub);
    }
    titleWrap.appendChild(statusBadge);

    const sizeBadge = document.createElement("span");
    sizeBadge.className = "cache-size-badge";
    sizeBadge.innerHTML = `<i class="ri-hard-drive-2-line"></i> ${escapeHtml(profile.formattedSize || "0 B")}`;

    topRow.appendChild(titleWrap);
    topRow.appendChild(sizeBadge);

    const infoBox = document.createElement("div");
    infoBox.className = "cache-linked-servers";

    const rpfInfo = `<i class="ri-file-zip-line"></i> ${profile.rpfCount || 0} File .RPF (${profile.fileCount || 0} Total File)`;
    const serverInfo =
        Array.isArray(profile.linkedServers) && profile.linkedServers.length > 0
            ? ` · <i class="ri-link"></i> Server: ${escapeHtml(profile.linkedServers.join(", "))}`
            : "";
    infoBox.innerHTML = `${rpfInfo}${serverInfo}`;

    const noteBox = document.createElement("div");
    noteBox.className = "mod-note-box";

    const noteTextEl = document.createElement("div");
    if (profile.description) {
        noteTextEl.className = "mod-note-text";
        noteTextEl.innerHTML = `<i class="ri-sticky-note-line"></i> ${escapeHtml(profile.description)}`;
    } else {
        noteTextEl.className = "mod-note-text is-empty";
        noteTextEl.innerHTML = '<i class="ri-sticky-note-line"></i> Belum ada catatan mod.';
    }

    const editNoteBtn = document.createElement("button");
    editNoteBtn.type = "button";
    editNoteBtn.className = "mod-note-edit-btn";
    editNoteBtn.innerHTML = '<i class="ri-edit-line"></i> Catatan';
    editNoteBtn.title = "Tambah atau ubah catatan folder mods ini";
    editNoteBtn.addEventListener("click", () => {
        openModNoteModal(profile);
    });

    noteBox.appendChild(noteTextEl);
    noteBox.appendChild(editNoteBtn);

    const actionsRow = document.createElement("div");
    actionsRow.className = "cache-card-actions";

    if (profile.isActive) {
        const activeBtn = document.createElement("button");
        activeBtn.className = "btn btn-secondary btn-sm";
        activeBtn.disabled = true;
        activeBtn.innerHTML = '<i class="ri-check-line"></i> Sedang Digunakan';
        actionsRow.appendChild(activeBtn);
    } else {
        const switchBtn = document.createElement("button");
        switchBtn.className = "btn btn-primary btn-sm";
        switchBtn.innerHTML = '<i class="ri-flashlight-line"></i> Aktifkan Profil';
        switchBtn.addEventListener("click", async () => {
            await handleSwitchModProfile(profile.folderName, switchBtn);
        });
        actionsRow.appendChild(switchBtn);
    }

    const openBtn = document.createElement("button");
    openBtn.className = "btn btn-secondary btn-sm";
    openBtn.innerHTML = '<i class="ri-folder-open-line"></i> Buka Folder';
    openBtn.title = "Buka folder ini di File Explorer";
    openBtn.addEventListener("click", async () => {
        try {
            await window.fivemAPI.openModFolder(profile.folderName);
        } catch (err) {
            showToast(err.message || "Gagal membuka folder mods.", "error");
        }
    });
    actionsRow.appendChild(openBtn);

    card.appendChild(topRow);
    card.appendChild(infoBox);
    card.appendChild(noteBox);
    card.appendChild(actionsRow);

    return card;
}

async function handleSwitchModProfile(targetFolderName, triggerBtn = null) {
    if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Mengaktifkan...';
    }

    try {
        const res = await window.fivemAPI.switchModProfile(targetFolderName);
        await loadModProfiles();
        if (res && res.alreadyActive) {
            showToast(`Profil "${targetFolderName}" sudah aktif sebagai folder mods.`, "info");
        } else {
            const backupNote = res?.previousModsRenamedTo
                ? ` (mods sebelumnya disimpan ke "${res.previousModsRenamedTo}")`
                : "";
            showToast(
                `Profil "${targetFolderName}" diaktifkan menjadi folder "mods"${backupNote}.`,
                "success",
                4500
            );
        }
    } catch (err) {
        showToast(err.message || "Gagal mengganti profil mods.", "error");
        if (triggerBtn) {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = '<i class="ri-flashlight-line"></i> Aktifkan Profil';
        }
    }
}

async function loadModProfiles() {
    if (!modProfilesGridEl) return;

    try {
        const data = await window.fivemAPI.getModProfiles();
        const profiles = Array.isArray(data?.profiles) ? data.profiles : [];

        if (totalModsDiskBadgeEl) {
            totalModsDiskBadgeEl.innerHTML = `<i class="ri-hard-drive-2-line"></i> Total Mods: ${escapeHtml(data?.formattedTotalSize || "0 B")}`;
        }
        if (modsBaseDirTextEl) {
            modsBaseDirTextEl.textContent = data?.baseDir || "Direktori FiveM.app belum ditemukan";
        }
        if (modProfilesCountBadgeEl) {
            modProfilesCountBadgeEl.innerHTML = `<i class="ri-folder-3-line"></i> ${profiles.length} Folder`;
        }
        if (activeModOriginBadgeEl) {
            const activeItem = profiles.find(p => p.isActive);
            if (activeItem) {
                activeModOriginBadgeEl.innerHTML = data?.activeModOriginalName
                    ? `<i class="ri-checkbox-circle-line status-icon-online"></i> Aktif: mods (${escapeHtml(data.activeModOriginalName)})`
                    : '<i class="ri-checkbox-circle-line status-icon-online"></i> Aktif: mods';
            } else {
                activeModOriginBadgeEl.innerHTML =
                    '<i class="ri-close-circle-line"></i> Tidak ada folder \'mods\' aktif';
            }
        }

        modProfilesGridEl.innerHTML = "";

        if (profiles.length === 0) {
            modProfilesGridEl.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 32px 20px;">
                    <div class="empty-state-icon"><i class="ri-puzzle-line"></i></div>
                    <h3>Belum Ada Folder Mods</h3>
                    <p>Tidak ditemukan folder berawalan "mods" di direktori FiveM.app Anda. Gunakan tombol "Buat Folder" di atas untuk membuatnya.</p>
                </div>
            `;
            return;
        }

        profiles.forEach(profile => {
            modProfilesGridEl.appendChild(createModProfileCard(profile));
        });
    } catch (err) {
        console.error("Gagal memuat daftar profil mods:", err);
    }
}

if (refreshModsHubBtn) {
    refreshModsHubBtn.addEventListener("click", async () => {
        refreshModsHubBtn.disabled = true;
        refreshModsHubBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memindai...';
        await loadModProfiles();
        refreshModsHubBtn.innerHTML = '<i class="ri-refresh-line"></i> Pindai Ulang';
        refreshModsHubBtn.disabled = false;
        showToast("Daftar folder mods dan ukuran RPF diperbarui.", "info");
    });
}

if (createModProfileBtn && newModProfileNameInput) {
    createModProfileBtn.addEventListener("click", async () => {
        const rawName = newModProfileNameInput.value.trim();
        if (!rawName) {
            showToast("Masukkan nama folder mods baru terlebih dahulu.", "warning");
            newModProfileNameInput.focus();
            return;
        }

        try {
            const res = await window.fivemAPI.createModProfile(rawName);
            newModProfileNameInput.value = "";
            await loadModProfiles();
            showToast(`Folder "${res.folderName}" dibuat di FiveM.app.`, "success");
        } catch (err) {
            showToast(err.message || "Gagal membuat folder mods baru.", "error");
        }
    });
}

if (openActiveModsFolderBtn) {
    openActiveModsFolderBtn.addEventListener("click", async () => {
        try {
            await window.fivemAPI.openModFolder("mods");
        } catch (err) {
            showToast(err.message || "Folder 'mods' aktif belum tersedia.", "warning");
        }
    });
}

document.addEventListener("keydown", event => {
    // 1. ESC untuk menutup modal & tooltip
    if (event.key === "Escape") {
        hideFloatingTooltip();
        if (modNoteModalEl && !modNoteModalEl.classList.contains("hidden")) {
            closeModNoteModal();
        } else if (serverFormModal && !serverFormModal.classList.contains("hidden")) {
            closeServerFormModal();
        } else if (serverDetailModal && !serverDetailModal.classList.contains("hidden")) {
            closeServerDetailModal();
        } else if (upgradeProModal && !upgradeProModal.classList.contains("hidden")) {
            closeUpgradeProModal();
        }
        return;
    }

    // 2. Ctrl + F atau F3 untuk pencarian server
    if ((event.ctrlKey && (event.key === "f" || event.key === "F")) || event.key === "F3") {
        event.preventDefault();
        switchView("viewServers");
        const searchInput = document.getElementById("serverSearchInput");
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
        return;
    }

    // 3. Ctrl + R atau F5 untuk segarkan status server
    if ((event.ctrlKey && (event.key === "r" || event.key === "R")) || event.key === "F5") {
        event.preventDefault();
        const refreshBtn = document.getElementById("refreshServersBtn");
        if (refreshBtn) {
            refreshBtn.click();
        }
        return;
    }

    // 4. Ctrl + 1 s/d Ctrl + 5 untuk berpindah antar tab view
    if (event.ctrlKey && !event.shiftKey && !event.altKey && ["1", "2", "3", "4", "5"].includes(event.key)) {
        event.preventDefault();
        const viewMap = {
            "1": "viewServers",
            "2": "viewPerformance",
            "3": "viewCache",
            "4": "viewMods",
            "5": "viewSettings"
        };
        const targetView = viewMap[event.key];
        if (targetView) {
            switchView(targetView);
        }
        return;
    }
});

loadModProfiles();