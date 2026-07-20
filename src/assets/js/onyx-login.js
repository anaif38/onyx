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

    const form = gate.querySelector('[data-onyx-phone-form]');
    const phoneStep = gate.querySelector('[data-onyx-phone-step]');
    const codeStep = gate.querySelector('[data-onyx-code-step]');
    const phoneInput = gate.querySelector('[data-onyx-phone-input]');
    const codeInput = gate.querySelector('[data-onyx-code-input]');
    const message = gate.querySelector('[data-onyx-message]');
    const sendButton = gate.querySelector('[data-onyx-send-code]');
    const verifyButton = gate.querySelector('[data-onyx-verify-code]');
    let mobile = '';

    const toEnglishDigits = value => value
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

    const normalizePhone = value => {
        let digits = toEnglishDigits(value).replace(/\D/g, '');
        if (digits.startsWith('966')) digits = digits.slice(3);
        if (digits.startsWith('0')) digits = digits.slice(1);
        return digits;
    };

    const setMessage = (text = '', isError = false) => {
        message.textContent = text;
        message.classList.toggle('is-error', isError);
    };

    const setBusy = (button, busy) => {
        button.disabled = busy;
        button.classList.toggle('is-loading', busy);
    };

    const showCodeStep = () => {
        phoneStep.hidden = true;
        codeStep.hidden = false;
        gate.querySelector('[data-onyx-code-hint]').textContent = `تم إرسال الرمز إلى +966 ${mobile}`;
        codeInput.focus();
    };

    phoneInput?.addEventListener('input', () => {
        const digits = toEnglishDigits(phoneInput.value).replace(/\D/g, '').slice(0, 10);
        phoneInput.value = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
        setMessage();
    });

    codeInput?.addEventListener('input', () => {
        codeInput.value = toEnglishDigits(codeInput.value).replace(/\D/g, '').slice(0, 6);
        setMessage();
    });

    form?.addEventListener('submit', async event => {
        event.preventDefault();

        if (!phoneStep.hidden) {
            mobile = normalizePhone(phoneInput.value);
            if (!/^5\d{8}$/.test(mobile)) {
                setMessage('أدخل رقم جوال سعودي صحيح يبدأ بالرقم 5', true);
                phoneInput.focus();
                return;
            }

            setBusy(sendButton, true);
            setMessage('جاري إرسال رمز التحقق…');
            try {
                await salla.auth.login({type: 'mobile', phone: mobile, country_code: 'SA'});
                setMessage();
                showCodeStep();
            } catch (error) {
                setMessage(error?.response?.data?.message || error?.message || 'تعذر إرسال الرمز، حاول مرة أخرى', true);
            } finally {
                setBusy(sendButton, false);
            }
            return;
        }

        const code = toEnglishDigits(codeInput.value).replace(/\D/g, '');
        if (!/^\d{4,6}$/.test(code)) {
            setMessage('أدخل رمز التحقق المرسل إلى جوالك', true);
            codeInput.focus();
            return;
        }

        setBusy(verifyButton, true);
        setMessage('جاري التحقق…');
        try {
            const response = await salla.auth.verify({type: 'mobile', code, phone: mobile, country_code: 'SA'}, true);
            const data = response?.data || {};
            if (data.case === 'new_customer') {
                setMessage('هذا الرقم يحتاج إلى إكمال التسجيل', true);
                const login = getComponent('salla-login-modal');
                if (login && typeof login.open === 'function') login.open();
                return;
            }
            window.location.assign(data.redirect_url || window.location.href);
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || 'رمز التحقق غير صحيح', true);
        } finally {
            setBusy(verifyButton, false);
        }
    });

    gate.querySelector('[data-onyx-change-phone]')?.addEventListener('click', () => {
        codeStep.hidden = true;
        phoneStep.hidden = false;
        codeInput.value = '';
        setMessage();
        phoneInput.focus();
    });

    gate.querySelector('[data-onyx-resend-code]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        setBusy(button, true);
        setMessage('جاري إعادة إرسال الرمز…');
        try {
            await salla.auth.resend({type: 'mobile', phone: mobile, country_code: 'SA'});
            setMessage('تم إرسال رمز جديد');
        } catch (error) {
            setMessage(error?.response?.data?.message || error?.message || 'تعذر إعادة إرسال الرمز', true);
        } finally {
            setBusy(button, false);
        }
    });

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
