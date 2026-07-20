const guestSessionKey = 'onyx:continue-as-guest';

const getComponent = selector => document.querySelector(selector);

function closeGate(gate) {
    gate.classList.add('is-leaving');
    window.setTimeout(() => gate.remove(), 350);
}

function initOnyxLogin() {
    const gate = getComponent('[data-onyx-login-gate]');
    if (!gate) return;

    if (window.sessionStorage.getItem(guestSessionKey) === '1') {
        gate.remove();
        return;
    }

    gate.querySelector('[data-onyx-continue-guest]')?.addEventListener('click', () => {
        window.sessionStorage.setItem(guestSessionKey, '1');
        closeGate(gate);
    });

    gate.querySelector('[data-onyx-change-language]')?.addEventListener('click', () => {
        const localization = getComponent('salla-localization-modal');
        if (localization && typeof localization.open === 'function') {
            localization.open();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnyxLogin, {once: true});
} else {
    initOnyxLogin();
}
