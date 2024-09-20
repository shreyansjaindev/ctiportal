const generateCSVContent = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data. Expected an array with at least one object.');
  }

  const header = Object.keys(data[0]);
  const rows = data.map((obj) => header.map((key) => (Array.isArray(obj[key]) ? `"${obj[key].join(',')}"` : obj[key])));

  const csvContent = [header, ...rows].map((row) => row.join(',')).join('\n');
  return csvContent;
};

const downloadCSV = (data) => {
  if (!data) {
    console.error('No data provided for download');
    return;
  }

  try {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.href = url;

    a.download = `Domain-Monitoring_${new Date().getTime()}.csv`;

    // Trigger a click event to initiate the download
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error during CSV download', error);
  }
};

const generateExportButtons = (columns, url) => {
  const format = {
    body: (inner, coldex, rowdex) => {
      if (inner.length <= 0) return inner;
      const el = $.parseHTML(inner);
      let result = '';
      $.each(el, (index, item) => {
        if (item.classList !== undefined && item.classList.contains('user-name')) {
          result = result + item.lastChild.firstChild.textContent;
        } else if (item.innerText === undefined) {
          result = result + item.textContent;
        } else result = result + item.innerText;
      });
      return result;
    },
  };

  const exportOptions = {
    columns,
    format,
    modifier: {
      selected: true,
    },
  };

  return [
    {
      extend: 'collection',
      className: 'btn btn-label-primary dropdown-toggle ms-2',
      text: '<i class="ti ti-file-export me-sm-1"></i> <span class="d-sm-inline-block">Export</span>',
      buttons: [
        {
          extend: 'csv',
          text: '<i class="ti ti-file-text me-1"></i>Export Selected',
          className: 'dropdown-item',
          title: () => `Domain-Monitoring_${new Date().getTime()}`,
          exportOptions,
        },
        {
          extend: 'csv',
          text: '<i class="ti ti-file-text me-1"></i>Export All',
          className: 'dropdown-item',
          action: (e, dt, button, config) => {
            try {
              const data = dt.rows().data().toArray();
              if (!data || data.length === 0) {
                throw new Error('No data available for export.');
              }
              downloadCSV(generateCSVContent(data));
            } catch (error) {
              console.error('Error exporting data:', error);
              toastr.error('An error occurred while exporting data. Please try again.');
            }
          },
        },
      ],
    },
  ];
};

const initializeDataTable = (options) => {
  const defaultOptions = {
    select: {
      style: 'multi',
      selector: 'td:first-child',
      className: '',
    },
    ajax: {
      url: options.url || '',
      headers: options.headers || { 'Content-Type': 'application/json', 'X-CSRFToken': window.CSRFToken },
      data: options.data || (() => {}),
      dataSrc: options.dataSrc || 'results',
      type: options.type || 'GET',
      error:
        options.error ||
        ((jqXHR, textStatus, errorThrown) => {
          if (errorThrown !== 'abort') {
            toastr.error('An Error Occurred');
          }
        }),
    },
    processing: true,
    serverSide: options.serverSide || false,
    columns: options.columns || [],
    scrollX: options.scrollX || false,
    columnDefs: options.columnDefs || [],
    order: options.order || [[1, 'desc']],
    dom: options.dom || '',
    displayLength: options.displayLength || 10,
    lengthMenu: options.lengthMenu || [10, 25, 50, 75, 100],
    language: options.language || { search: '', searchPlaceholder: 'Search...' },
    buttons: options.buttons || [],
    initComplete: options.initComplete || (() => {}),
    drawCallback: options.drawCallback || (() => {}),
  };

  return $(options.selector).DataTable(defaultOptions);
};
