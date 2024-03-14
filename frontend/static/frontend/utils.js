const getCookie = (name) => {
  if (!document.cookie) {
    return null;
  }

  const cookies = document.cookie.split(';');
  const cookieIndex = cookies.findIndex((cookie) => cookie.trim().startsWith(`${name}=`));

  if (cookieIndex !== -1) {
    return decodeURIComponent(cookies[cookieIndex].trim().substring(name.length + 1));
  }

  return null;
};

const textCapitalize = (text) =>
  text
    .match(/\b\w+\b/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const convertToCamelCase = (str) => str.replace(/-([a-z])/g, (g, letter) => letter.toUpperCase());

const copyClipboard = async (id) => {
  const copy = document.querySelector(`#${id}`);

  if (!copy) {
    console.error(`Element with id "${id}" not found.`);
    return;
  }

  const textToCopy = copy.innerText || '';
  if (!textToCopy) {
    toastr.error('No text to copy.');
    return;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    toastr.success('Copied to clipboard');
  } catch (err) {
    toastr.error('Failed to copy content to clipboard:', err);
  }
};
