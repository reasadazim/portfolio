document.querySelectorAll('[data-current-year]').forEach(element => {
  element.textContent = new Date().getFullYear();
});
const copyEmail = document.querySelector('.copy-email');
const copyStatus = document.querySelector('.copy-status');
copyEmail.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('riasadazim@gmail.com');
    copyStatus.textContent = 'Email copied.';
  } catch {
    copyStatus.textContent = 'Select the email address to copy it, or click it to send a message.';
  }
});
