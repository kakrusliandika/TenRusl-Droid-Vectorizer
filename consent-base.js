/* Google Consent Mode v2 baseline — default: denied.
   Muat file INI lebih dulu (sebelum GTM/GA/Adsense) agar default diterapkan. */

window.dataLayer = window.dataLayer || [];
function gtag() {
    dataLayer.push(arguments);
}

// Default: semua denied (kecuali security_storage)
gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    security_storage: "granted",
});

// Dipanggil CMP setelah user memilih
window.updateConsent = function (consent = {}) {
    gtag(
        "consent",
        "update",
        Object.assign(
            {
                ad_storage: "granted",
                ad_user_data: "granted",
                ad_personalization: "granted",
                analytics_storage: "granted",
            },
            consent
        )
    );
};
