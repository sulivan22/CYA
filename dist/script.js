const form = document.querySelector('#rsvp-form');
const feedback = document.querySelector('#form-feedback');
const submitButton = form?.querySelector('button[type="submit"]');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

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
  } catch {
    feedback.textContent = 'No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});
