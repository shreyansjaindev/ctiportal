const url = '/activedirectory/';

function generateHTML(response) {
  const html = `
        <div class="col-12">
            <div class="card card-action">
                <div class="card-header">
                    <h4 class="card-action-title">AD Users</h4>
                    <div class="card-action-element">
                        <ul class="list-inline mb-0">
                            <li class="list-inline-item click"><a onclick="copyClipboard('clipboard-ad-users')" style="cursor: pointer;"><i class="ti ti-copy ti-sm"></i></a></li>
                        </ul>
                    </div>
                </div>
                <div class="card-body">
                    <pre id="clipboard-ad-users">${JSON.stringify(response.data, null, 2)}</pre>
                </div>
            </div>
        </div>`;

  $('#ad-users').html(html);
}

const $form = $('form');
const $button = $('button');
const $adUsers = $('#ad-users');

$form.submit(function (e) {
  e.preventDefault();
  $adUsers.empty();
  const query = $(this).find('textarea').val();
  if (query != '') {
    // Spinner
    $button
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
      }),
    })
      .then((response) => response.json())
      .then((data) => generateHTML(data))
      .finally(() => {
        $button.innerHTML = 'Search';
        $button.disabled = false;
      });
  }
});
