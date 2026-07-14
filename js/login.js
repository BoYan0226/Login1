const loginForm = document.querySelector('.login-form');
const phoneInput = document.querySelector('#login-phone');
const phoneMessage = document.querySelector('#phone-message');
const verificationArea = document.querySelector('.verification-area');
const codeInput = document.querySelector('#login-code');
const codeMessage = document.querySelector('#code-message');
const resendButton = document.querySelector('.verification-field__resend');
const submitButton = document.querySelector('.login-form__submit');
const submitButtonText = document.querySelector('.login-form__submit-text');

if (
	loginForm &&
	phoneInput &&
	phoneMessage &&
	verificationArea &&
	codeInput &&
	codeMessage &&
	resendButton &&
	submitButton &&
	submitButtonText
) {
	let countdownTimer = null;
	let isCodeStep = false;

	const isValidPhone = (value) => /^1\d{10}$/.test(value);
	const isValidCode = (value) => /^\d{6}$/.test(value);

	const updateResendButton = (seconds) => {
		resendButton.textContent = seconds > 0 ? `${seconds} 秒` : '重新获取';
		resendButton.disabled = seconds > 0;
	};

	const startCountdown = () => {
		let seconds = 60;
		updateResendButton(seconds);

		clearInterval(countdownTimer);
		countdownTimer = setInterval(() => {
			seconds -= 1;
			updateResendButton(seconds);

			if (seconds <= 0) {
				clearInterval(countdownTimer);
			}
		}, 1000);
	};

	const showCodeStep = () => {
		isCodeStep = true;
		loginForm.classList.add('login-form--code-visible');
		verificationArea.setAttribute('aria-hidden', 'false');
		codeInput.disabled = false;
		submitButton.disabled = false;
		submitButton.removeAttribute('aria-busy');
		submitButtonText.textContent = '登入';
		codeMessage.textContent = '';
		startCountdown();

		window.setTimeout(() => codeInput.focus(), 180);
	};

	const hideCodeStep = () => {
		isCodeStep = false;
		loginForm.classList.remove('login-form--code-visible');
		verificationArea.setAttribute('aria-hidden', 'true');
		codeInput.disabled = true;
		codeInput.value = '';
		codeMessage.textContent = '';
		submitButton.disabled = false;
		submitButton.removeAttribute('aria-busy');
		submitButtonText.textContent = '获取验证码';
		clearInterval(countdownTimer);
	};

	phoneInput.addEventListener('input', () => {
		phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 11);
		phoneMessage.textContent = '';

		if (isCodeStep) {
			hideCodeStep();
		}
	});

	codeInput.addEventListener('input', () => {
		codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
		codeMessage.textContent = '';
	});

	resendButton.addEventListener('click', () => {
		if (resendButton.disabled) {
			return;
		}

		codeInput.value = '';
		codeMessage.textContent = '';
		startCountdown();
		codeInput.focus();
	});

	loginForm.addEventListener('submit', (event) => {
		event.preventDefault();

		if (!isValidPhone(phoneInput.value)) {
			phoneMessage.textContent = '请输入正确的 11 位手机号码';
			phoneInput.focus();
			return;
		}

		if (!isCodeStep) {
			showCodeStep();
			return;
		}

		if (!isValidCode(codeInput.value)) {
			codeMessage.textContent = '请输入正确的 6 位验证码';
			codeInput.focus();
			return;
		}

		codeMessage.textContent = '';
		submitButton.disabled = true;
		submitButton.setAttribute('aria-busy', 'true');
		submitButtonText.textContent = '登入中';
	});
}
