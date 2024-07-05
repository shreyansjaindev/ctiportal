const url = '/threatstream/';

function downloadCSV(response) {
  let csvContent = response.data.join('\n');
  let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  let url = URL.createObjectURL(blob);
  let pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', 'threatstream_export.csv');
  pom.click();
}

const myDropzone = new Dropzone('#dropzone-basic', {
  url,
  method: 'post',
  parallelUploads: 1,
  maxFilesize: 5,
  addRemoveLinks: true,
  maxFiles: 1,
  autoProcessQueue: false,
  acceptedFiles:
    '.csv, text/csv, application/vnd.ms-excel, application/csv, text/x-csv, application/x-csv, text/comma-separated-values, text/x-comma-separated-values',
});
myDropzone.on('addedfile', function (file) {
  const formData = new FormData();
  formData.append('file', file);

  fetch(url, {
    method: 'POST',
    headers: {
      'X-CSRFToken': window.CSRFToken,
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((response) => {
      downloadCSV(response);
      myDropzone.removeFile(file);
    })
    .catch((error) => console.log('Error uploading file', error));
});

$('.form-horizontal').submit(function (e) {
  e.preventDefault();

  $('#btn-search')
    .html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>')
    .prop('disabled', true);

  filters = {};

  temp = ['type', 'meta.severity', 'status', 'tlp'];
  $.each(temp, function (index, value) {
    temp_val = $(`select[name='${value}']`).val();
    if (temp_val != '') {
      filters[value] = temp_val;
    }
  });

  temp = $("input[type='text']");

  temp.each(function () {
    element_name = $(this).attr('name');
    element_value = $(this).val();

    if (element_value != '') {
      element_type = $(`select[name="${element_name}"]`).val();
      filters[element_name + '__' + element_type] = element_value;
    }
  });

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': window.CSRFToken,
    },
    body: JSON.stringify({ filters }),
  })
    .then((response) => response.json())
    .then((response) => {
      if (response.error) {
        toastr.error(response.error);
        return;
      }
      downloadCSV(response);
    })
    .catch(() => {
      toastr.error('An Error Occurred');
    })
    .finally(() => {
      document.querySelector('#btn-search').innerHTML = 'Search';
      document.querySelector('#btn-search').disabled = false;
    });
});
