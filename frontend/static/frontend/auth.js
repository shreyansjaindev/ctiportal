const logoutElement = document.getElementById('logout');

if (logoutElement) {
  logoutElement.addEventListener('click', async function (e) {
    e.preventDefault();

    try {
      const response = await fetch('/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRFToken,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success === true) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });
}
