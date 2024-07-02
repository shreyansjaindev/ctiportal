document.querySelector('form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const user = document.querySelector('#user').value;
    const password = document.querySelector('#password').value;

    try {
        const response = await fetch('/api-login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', "X-CSRFToken": window.CSRFToken },
            body: JSON.stringify({ user, password })
        });

        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
