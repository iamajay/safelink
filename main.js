// On page load, check localStorage for theme preference
window.addEventListener('DOMContentLoaded', function () {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.body.classList.toggle('dark-theme', savedTheme === 'dark');
      document.getElementById('theamName').textContent = savedTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
      document.getElementById('themeToggle').checked = savedTheme === 'dark';
    }
  });
  
  // Save theme preference in localStorage when toggling
  document.getElementById('themeToggle').addEventListener('change', function () {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
    const currentTheme = isDarkTheme ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    document.getElementById('theamName').textContent = isDarkTheme ? 'Dark Mode' : 'Light Mode';
  });
  
  // Password Strength Checker
  document.getElementById('passwordInput').addEventListener('input', function () {
    const password = this.value;
    const strength = zxcvbn(password); // Now this should work
  
    const feedback = document.getElementById('passwordStrength');
    const scoreText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  
    feedback.textContent = password
      ? `Strength: ${scoreText[strength.score]}`
      : '';
  });
  
  
  // URL Validation
  function isValidURL(url) {
    const pattern = new RegExp('^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,6})?(:[0-9]{1,5})?(\/[a-zA-Z0-9#]+\/?)?$', 'i');
    return pattern.test(url);
  }
  
  // Encrypt URL
  async function encryptURL() {
    const url = document.getElementById('urlInput').value;
    const password = document.getElementById('passwordInput').value;
    const hint = document.getElementById('hintInput').value;
    const expirationMinutes = parseInt(document.getElementById('expirationSelect').value, 10);
  
    // URL Validation
    if (!url || !isValidURL(url)) {
      document.getElementById('urlError').classList.remove('hidden');
      return;
    } else {
      document.getElementById('urlError').classList.add('hidden');
    }
  
    if (!password) {
      alert("Both URL and password are required.");
      return;
    }
  
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
  
    const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
  
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(url)
    );
  
    const payload = {
      c: Array.from(new Uint8Array(encryptedData)),
      iv: Array.from(iv),
      s: Array.from(salt),
      h: hint || '',
      e: expirationMinutes ? (Date.now() + expirationMinutes * 60000) : null
    };
  
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    const link = `${location.origin}${location.pathname}#${encoded}`;
    const bookmarklet = `javascript:location.href='${link}'`;
  
    document.getElementById('encryptedLink').innerHTML = `
    <div class="link-box">
      <p class="success-message">Secure Link Generated!</p>
      <input type="text" id="generatedLink" class="generated-link" readonly value="${link}" />
      <button onclick="copyLink()" class="copy-btn">Copy</button>
    </div>
  `;
  
    document.getElementById('qrCanvas').classList.remove('hidden');
    QRCode.toCanvas(document.getElementById('qrCanvas'), link, function (error) {
      if (error) console.error(error);
    });
  
    showToast('🔗 QR Code generated successfully!');
  }
  
  // Copy link to clipboard
  function copyLink() {
    const input = document.getElementById('generatedLink');
    if (input) {
      input.select();
      input.setSelectionRange(0, 99999); // For mobile
      navigator.clipboard.writeText(input.value);
      showToast('🔗 Link copied to clipboard!');
    }
  }
  
  // Show Toast Notification
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hidden');
    }, 2500);
  }
  
  // Decrypt URL
  async function decryptURL() {
    const password = document.getElementById('decryptPassword').value;
    const data = window._encData;
    const enc = new TextEncoder();
  
    try {
      const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: new Uint8Array(data.s), iterations: 100000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
  
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(data.iv) },
        key,
        new Uint8Array(data.c)
      );
  
      const url = new TextDecoder().decode(decrypted);
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      window.location.href = finalUrl;
          } catch (e) {
      document.getElementById('errorText').textContent = "Incorrect password or corrupted data.";
    }
  }
  
  // On Page Load: Check for encrypted data in the URL
  window.addEventListener("DOMContentLoaded", () => {
    const hash = location.hash.slice(1);
    if (hash.length > 10) {
      document.getElementById('encryptForm').classList.add('hidden');
      document.getElementById('decryptForm').classList.remove('hidden');
  
      try {
        const raw = LZString.decompressFromEncodedURIComponent(hash);
        const data = JSON.parse(raw);
        window._encData = data;
  
        if (data.e && Date.now() > data.e) {
          document.getElementById('errorText').textContent = "This link has expired.";
          return;
        }
  
        if (data.h) {
          document.getElementById('hintText').textContent = `Hint: ${data.h}`;
        }
      } catch (e) {
        document.getElementById('errorText').textContent = "Unable to parse encrypted data.";
      }
    }
  });
  
  // Clear Form Functionality
  function clearForm() {
    document.getElementById('urlInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('hintInput').value = '';
    document.getElementById('expirationSelect').value = '';
    document.getElementById('passwordStrength').textContent = '';
    document.getElementById('urlError').classList.add('hidden');
    document.getElementById('encryptedLink').innerHTML = '';
  
    // Clear QR Canvas
    const qrCanvas = document.getElementById('qrCanvas');
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    qrCanvas.classList.add('hidden');
    qrCanvas.width = 0;
    qrCanvas.height = 0;
    qrCanvas.style.border = 'none'; // 🔥 remove any inline border
  }
  