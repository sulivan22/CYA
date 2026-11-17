const form = document.querySelector('#rsvp-form');
const feedback = document.querySelector('#form-feedback');
const confirmationDialog = document.querySelector('#confirmation-dialog');
const confirmationMessage = document.querySelector('#confirmation-message');
confirmationDialog?.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', () => confirmationDialog.close());
});
confirmationDialog?.addEventListener('close', () => {
  document.documentElement.classList.remove('confirmation-open');
  submitButton?.focus({ preventScroll: true });
});

const submitButton = form?.querySelector('button[type="submit"]');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled || !form.reportValidity()) return;

  const payload = Object.fromEntries(new FormData(form).entries());
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando…';
  feedback.textContent = 'Estamos enviando tu respuesta.';

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('No se pudo enviar la respuesta.');
    feedback.textContent = '¡Gracias! Hemos recibido tu confirmación.';
    form.reset();
    if (confirmationDialog) {
      confirmationMessage.textContent = payload.asistencia === 'Lo siento, no podré'
        ? 'Gracias por avisarnos. Aunque no puedas acompañarnos, te tendremos muy presente en este día tan importante para nosotros.'
        : 'Gracias por confirmar la asistencia a este día tan importante para nosotros.';
      confirmationDialog.showModal();
      document.documentElement.classList.add('confirmation-open');
    }
  } catch {
    feedback.textContent = 'No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});
