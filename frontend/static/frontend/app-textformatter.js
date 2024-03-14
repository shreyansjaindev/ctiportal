const extractedIOCs = $('#extracted-iocs');
const formattedText = $('#formattedtext');
const form = $('form');
const url = '/textformatter/';

function generateHTML(response) {
  $.each(response.data, (key, value) => {
    const addDelimiter = response.checklist.includes('comma') && key === 'formattedtext' ? ', ' : '<br>';

    let html = value.join(addDelimiter);

    const fullHtml = `
      <div class="card card-action">
        <div class="card-header">
          <h4 class="card-action-title">${key}</h4>
          <div class="card-action-element">
            <ul class="list-inline mb-0">
              <li class="list-inline-item cursor-pointer">
                <a onclick="copyClipboard('clipboard-${key}')">
                  <i class="ti ti-copy ti-sm"></i>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="card-body">
          <p id="clipboard-${key}">
              ${html}
          </p>
        </div>
      </div>
    `;

    if (key === 'formattedtext') {
      formattedText.html(fullHtml);
    } else {
      extractedIOCs.append(
        `<div class="col-6">
          ${fullHtml}
        </div>`
      );
    }
  });
}

$(document).ready(() => {
  const fangCheckbox = document.getElementById('UncheckedFang');
  const defangCheckbox = document.getElementById('UncheckedDefang');
  const domainCheckbox = document.getElementById('UncheckedDomain');
  const lowercaseCheckbox = document.getElementById('UncheckedLowerCase');
  const uppercaseCheckbox = document.getElementById('UncheckedUpperCase');

  fangCheckbox.addEventListener('change', () => (defangCheckbox.checked = false));
  defangCheckbox.addEventListener('change', () => {
    fangCheckbox.checked = false;
    domainCheckbox.checked = false;
  });

  lowercaseCheckbox.addEventListener('change', () => (uppercaseCheckbox.checked = false));
  uppercaseCheckbox.addEventListener('change', () => (lowercaseCheckbox.checked = false));
  domainCheckbox.addEventListener('change', () => {
    fangCheckbox.checked = true;
    defangCheckbox.checked = false;
  });
});

form.submit(function (e) {
  e.preventDefault();

  extractedIOCs.empty();

  const checklist = [...form.find('input:checked')].map(({ value }) => value);
  const query = form.find('textarea').val();

  if (query && checklist.length) {
    // Spinner
    $('button')
      .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')
      .prop('disabled', true);

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRFToken,
      },
      body: JSON.stringify({
        query,
        checklist,
      }),
    })
      .then((response) => response.json())
      .then((data) => generateHTML(data))
      .finally(() => $('button').html('Search').prop('disabled', false));
  }
});
