const formattedText = $('#formatted-text');
const form = $('form');
const url = '/textformatter/';

const options = [
  { id: 'iocs', value: 'iocs', label: 'Extract IOCs' },
  { id: 'fang', value: 'fang', label: 'Fang' },
  { id: 'defang', value: 'defang', label: 'Defang' },
  { id: 'domain', value: 'domain', label: 'Extract Domain' },
  { id: 'delimiter', value: 'comma', label: 'Add Delimiter ( , )' },
  { id: 'duplicates', value: 'duplicates', label: 'Remove Duplicates' },
  { id: 'lowercase', value: 'lowercase', label: 'Lower Case' },
  { id: 'uppercase', value: 'uppercase', label: 'Upper Case' },
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

function formatKey(key) {
  return key
    .split('_')
    .map((word) => word.toUpperCase())
    .join(' ');
}

function generateHTML(response) {
  $.each(response.data, (key, value) => {
    if (value.length === 0) return;

    const addDelimiter = response.checklist.includes('comma') && key === 'formatted_text' ? ', ' : '<br>';

    let html = value.join(addDelimiter);

    const fullHtml = `
      <div class="card card-action">
        <div class="card-header">
          <h5 class="card-action-title">${formatKey(key)}</h5>
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

    formattedText.append(
      `<div class="col-6">
          ${fullHtml}
        </div>`
    );
  });
}

$(document).ready(() => {
  document.querySelector('.list-unstyled').innerHTML = listItems;

  $('.list-unstyled').on('change', 'input[type="checkbox"]', function () {
    const { id, checked } = this;

    switch (id) {
      case 'fang':
        $('#defang').prop('checked', false);
        break;
      case 'defang':
        $('#fang, #domain').prop('checked', false);
        break;
      case 'lowercase':
        $('#uppercase').prop('checked', false);
        break;
      case 'uppercase':
        $('#lowercase').prop('checked', false);
        break;
      case 'domain':
        $('#fang').prop('checked', true);
        $('#defang').prop('checked', false);
        break;
      case 'iocs':
        $('#fang, #defang, #domain, #delimiter, #duplicates, #lowercase, #uppercase')
          .prop('checked', false)
          .prop('disabled', checked);
        break;
    }
  });
});

form.submit(function (e) {
  e.preventDefault();

  formattedText.empty();

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
