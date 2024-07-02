document.getElementById('logout')?.addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('/logout/', {
      method: 'POST',
      headers: { 'X-CSRFToken': window.CSRFToken },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.success) window.location.href = '/';
    else throw new Error('Logout failed');
  } catch (error) {
    console.error('Error:', error);
  }
});
