/* O365 */
function o365DecodeURL() {
  const link = document.getElementById('encoded').value;
  const url_parts = link.split('?')[1];
  const params = url_parts.split('&');
  let target_url = "Error:  couldn't find target URL.";
  for (let n = 0; n < params.length; n++) {
    const namval = params[n].split('=');
    if (namval[0] == 'url') target_url = namval[1];
  }

  const decode_url = decodeURIComponent(target_url);
  document.getElementById('decoded').value = decode_url;
}

/* Proofpoint */
function proofpointDecodeURL() {
  const encodedURL = document.getElementById('encoded');
  const decodedURL = document.getElementById('decoded');

  if (!encodedURL) {
    alert("Cannot find source textarea with id 'encoded'.");
    return false;
  }
  if (!decodedURL) {
    alert("Cannot find target <p> with id 'decoded'.");
    return false;
  }

  // Assumptions:
  // 1.  Defended URL is in the "u=" parameter of the full URL
  // 2.  Any parameters after u= can be stripped.

  const fullURL = encodedURL.value;

  const findRe = /.+?u=(.+?)(&.*)?$/;
  const matches = findRe.exec(fullURL);
  if (matches) {
    const defended = matches[1].replace(/_/g, '/'); // Regex with g flag to get all
    const defenseless = deHex(defended);

    decodedURL.textContent = defenseless;
  } else {
    decodedURL.textContent = fullURL;
  }

  return false;
}

function deHex(hexString) {
  const hexRe = /(.*)(-)([0-9A-F][0-9A-F])(.*)/;

  let result = hexString;
  let hexMatches = hexRe.exec(hexString);

  while (hexMatches && hexMatches.index !== null) {
    const character = String.fromCharCode(parseInt(hexMatches[3], 16));
    result = hexMatches[1] + character + hexMatches[4];
    hexMatches = hexRe.exec(result);
  }

  return result;
}
