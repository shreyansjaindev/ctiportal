const extractedIOCs = $('#extracted-iocs');
const formattedText = $('#formattedtext');
const form = $('form');
const url = '/textformatter/';

const options = [
  { id: 'extractIOCs', value: 'iocs', label: 'Extract IOCs', disabled: true },
  { id: 'uncheckedFang', value: 'fang', label: 'Fang' },
  { id: 'uncheckedDefang', value: 'defang', label: 'Defang' },
  { id: 'uncheckedDomain', value: 'domain', label: 'Extract Domain' },
  { id: 'delimiter', value: 'comma', label: 'Add Delimiter ( , )' },
  { id: 'duplicates', value: 'duplicates', label: 'Remove Duplicates' },
  { id: 'uncheckedLowerCase', value: 'lowercase', label: 'Lower Case' },
  { id: 'uncheckedUpperCase', value: 'uppercase', label: 'Upper Case' },
];

const listItems = options
  .map(
    ({ id, value, label, disabled }) => `
  <li class="d-inline-block me-2">
    <div class="form-check">
      <input class="form-check-input"
             type="checkbox"
             id="${id}"
             name="checklist"
             value="${value}"
             ${disabled ? 'disabled' : ''}>
      <label class="form-check-label" for="${id}">${label}</label>
    </div>
  </li>
`
  )
  .join('');

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
  document.querySelector('.list-unstyled').innerHTML = listItems;

  $('.list-unstyled').on('change', 'input[type="checkbox"]', function () {
    const { id, checked } = this;

    switch (id) {
      case 'uncheckedFang':
        $('#uncheckedDefang').prop('checked', false);
        break;
      case 'uncheckedDefang':
        $('#uncheckedFang, #uncheckedDomain').prop('checked', false);
        break;
      case 'uncheckedLowerCase':
        $('#uncheckedUpperCase').prop('checked', false);
        break;
      case 'uncheckedUpperCase':
        $('#uncheckedLowerCase').prop('checked', false);
        break;
      case 'uncheckedDomain':
        $('#uncheckedFang').prop('checked', true);
        $('#uncheckedDefang').prop('checked', false);
        break;
    }
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
