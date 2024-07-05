document.getElementById('logout')?.addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('/logout/', {
      method: 'POST',
      headers: { 'X-CSRFToken': window.CSRFToken },
      credentials: 'include',
    });

    if (response.ok) window.location.href = '/';
    else throw new Error('Logout failed');
  } catch (error) {
    console.error('Error:', error);
  }
});
