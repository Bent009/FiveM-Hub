const crypto = require("crypto");

const LICENSE_SECRET =
    process.env.FIVEM_HUB_LICENSE_SECRET ||
    "FiveM-Hub-License-SecKey-2026-v2#SecureCrypt";

const PREFIX_TO_TIER = {
    FREE: "free",
    PRO: "pro",
    DEV: "developer"
};

const TIER_TO_PREFIX = {
    free: "FREE",
    pro: "PRO",
    developer: "DEV"
};

/**
 * Generate a cryptographically signed license activation token.
 * Format: TIER.PAYLOAD_BASE64.SIGNATURE_HEX
 * 
 * @param {"free"|"pro"|"developer"} tier
 * @param {Object} [options]
 * @param {string} [options.holder]
 * @param {number} [options.issuedAt] Unix timestamp in seconds
 * @param {number|null} [options.expiresAt] Unix timestamp in seconds or null (lifetime)
 * @param {string} [options.nonce]
 * @returns {string}
 */
function generateLicenseToken(tier, options = {}) {
    const normalizedTier = String(tier || "").trim().toLowerCase();
    if (!["free", "pro", "developer"].includes(normalizedTier)) {
        throw new Error(`Tier lisensi tidak valid: "${tier}". Pilihan: free, pro, developer.`);
    }

    const prefix = TIER_TO_PREFIX[normalizedTier];
    const defaultHolder =
        normalizedTier === "developer"
            ? "Core Developer License"
            : normalizedTier === "pro"
            ? "Pro Subscriber Lifetime"
            : "Free Community User";

    const payload = {
        sub: options.holder || defaultHolder,
        tier: normalizedTier,
        iat: options.issuedAt || Math.floor(Date.now() / 1000),
        exp: options.expiresAt || null,
        nonce: options.nonce || crypto.randomBytes(6).toString("hex")
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const dataToSign = `${prefix}.${payloadBase64}`;
    const signature = crypto
        .createHmac("sha256", LICENSE_SECRET)
        .update(dataToSign)
        .digest("hex");

    return `${prefix}.${payloadBase64}.${signature}`;
}

/**
 * Validate and unpack a cryptographic license token.
 * 
 * @param {string} tokenString
 * @returns {{ valid: boolean, tier: "free"|"pro"|"developer", holder: string, issuedAt: number, expiresAt: number|null }}
 */
function verifyLicenseToken(tokenString) {
    const raw = String(tokenString || "").trim();
    if (!raw) {
        throw new Error("Token aktivasi tidak boleh kosong.");
    }

    const parts = raw.split(".");
    if (parts.length !== 3) {
        throw new Error(
            "Format token lisensi tidak valid. Format yang diharapkan: TIER.PAYLOAD.SIGNATURE (contoh: PRO.ey...7a)."
        );
    }

    const [prefix, payloadBase64, signatureHex] = parts;
    const expectedTier = PREFIX_TO_TIER[prefix.toUpperCase()];
    if (!expectedTier) {
        throw new Error(
            `Prefix token lisensi "${prefix}" tidak dikenali. Gunakan prefix PRO, DEV, atau FREE.`
        );
    }

    const dataToSign = `${prefix.toUpperCase()}.${payloadBase64}`;
    const expectedSig = crypto
        .createHmac("sha256", LICENSE_SECRET)
        .update(dataToSign)
        .digest("hex");

    const sigBuffer = Buffer.from(signatureHex.toLowerCase(), "utf8");
    const expectedBuffer = Buffer.from(expectedSig.toLowerCase(), "utf8");

    if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
        throw new Error(
            "Tanda tangan lisensi (signature) tidak valid atau token telah dimanipulasi."
        );
    }

    let payload;
    try {
        const decodedJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
        payload = JSON.parse(decodedJson);
    } catch {
        throw new Error("Payload lisensi rusak atau tidak dapat didekode.");
    }

    if (!payload || typeof payload !== "object") {
        throw new Error("Data payload lisensi tidak valid.");
    }

    if (payload.tier !== expectedTier) {
        throw new Error(
            `Ketidakcocokan lisensi: prefix "${prefix}" tidak sesuai dengan isi payload tier "${payload.tier}".`
        );
    }

    if (typeof payload.exp === "number" && payload.exp > 0) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec > payload.exp) {
            const expDate = new Date(payload.exp * 1000).toLocaleDateString("id-ID");
            throw new Error(`Token lisensi telah kedaluwarsa pada ${expDate}.`);
        }
    }

    return {
        valid: true,
        tier: payload.tier,
        holder: payload.sub || "Licensed User",
        issuedAt: payload.iat || 0,
        expiresAt: payload.exp || null
    };
}

// Deterministic official test tokens for UI simulation and initial distribution
const OFFICIAL_SAMPLE_TOKENS = {
    FREE: generateLicenseToken("free", {
        holder: "Community Free User",
        issuedAt: 1700000000,
        nonce: "free000001"
    }),
    PRO: generateLicenseToken("pro", {
        holder: "FiveM-Hub Verified Pro Member",
        issuedAt: 1700000000,
        nonce: "pro9990001"
    }),
    DEVELOPER: generateLicenseToken("developer", {
        holder: "Core Architecture Developer",
        issuedAt: 1700000000,
        nonce: "dev8880001"
    })
};

module.exports = {
    generateLicenseToken,
    verifyLicenseToken,
    OFFICIAL_SAMPLE_TOKENS
};
