const url = '/screenshot/';

function generateHTML(data) {
  let html = '';
  for (key in data) {
    const weburl = key;
    const image = data[key];
    html += `<div class="col-lg-3 col-md-4 col-6">
        <div class="d-block mb-4 h-100">
        <a href="data:image/png;base64, ${image}" data-fancybox="images" data-caption="${weburl}">
        <figure class="figure"><img src="data:image/png;base64, ${image}" class="img-thumbnail" alt="image">
        <figcaption class="figure-caption text-center">${weburl}</figcaption>
        </figure>
        </a>
        </div>
        </div>`;
  }
  return html;
}

$('#form-query').submit(function (e) {
  e.preventDefault();
  $('#weburl-screenshots').empty();
  const query = $(this).find('textarea').val();
  if (query) {
    // Show spinner and disable button
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
        query: query,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        document.querySelector('#weburl-screenshots').innerHTML += generateHTML(data['data']);
      })
      .finally(() => {
        // Enable button
        document.querySelector('button').innerHTML = 'Search';
        document.querySelector('button').disabled = false;
      });
  }
});
