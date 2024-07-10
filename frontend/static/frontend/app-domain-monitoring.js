const $datatableLookalikeDomains = $('#datatable-lookalike-domains');
const $datatableMonitoredDomains = $('#datatable-monitored-domains');
const $datatableResources = $('#datatable-resources');

const headers = {
  'Content-Type': 'application/json',
  'X-CSRFToken': window.CSRFToken,
};

const tabsInfo = {
  alerts: {
    tab: $('#alerts'),
    count: $('#alerts-tab span'),
    url: urls.alerts,
  },
  'lookalike-domains': {
    tab: $('#lookalike-domains'),
    count: $('#lookalike-domains-tab span'),
    url: urls.lookalikeDomains,
  },
  'monitored-domains': {
    tab: $('#monitored-domains'),
    count: $('#monitored-domains-tab span'),
    url: urls.monitoredDomains,
  },
  resources: {
    tab: $('#resources'),
    count: $('#resources-tab span'),
    url: urls.watchedResources,
  },
};

const statusObj = {
  open: { title: 'Open', color: 'primary' },
  closed: { title: 'Closed', color: 'success' },
  acknowledged: { title: 'Acknowledged', color: 'success' },
  monitoring: { title: 'Monitoring', color: 'success' },
  takedown: { title: 'Takedown Requested', color: 'warning' },
  not_relevant: { title: 'Not Relevant', color: 'secondary' },
  '': { title: '', color: 'secondary' },
  active: { title: 'Active', color: 'success' },
  inactive: { title: 'Inactive', color: 'secondary' },
};

const riskObj = {
  '': { title: 'Unknown', color: 'info' },
  low: { title: 'Low', color: 'success' },
  medium: { title: 'Medium', color: 'warning' },
  high: { title: 'High', color: 'danger' },
  critical: { title: 'Critical', color: 'danger' },
};

const renderStatusBadge = (data) =>
  `<span class="badge bg-label-${statusObj[data].color}">${statusObj[data].title}</span>`;
const renderRiskBadge = (data) => `<span class="badge bg-label-${riskObj[data].color}">${riskObj[data].title}</span>`;
const renderCursorPointer = (data) => `<span class="fw-bolder cursor-pointer">${data}</span>`;

const keyDisplayNameMapping = {
  value: {
    displayName: 'Domain Name',
  },
  domain_name: {
    displayName: 'Domain Name',
  },
  status: {
    displayName: 'Review Status',
    className: (value) => statusObj[value].color,
    format: (value) => textCapitalize(value),
  },
  is_monitored: {
    displayName: 'Monitoring Status',
    className: (value) => statusObj[value].color,
    format: (value) => textCapitalize(value),
  },
  potential_risk: {
    displayName: 'Potential Risk',
    className: (value) => riskObj[value].color,
    format: (value) => textCapitalize(value),
  },
  source_date: {
    displayName: 'Source Date',
    format: (value) => new Date(value).toLocaleString(),
  },
  created: {
    displayName: 'Date Added',
    format: (value) => new Date(value).toLocaleString(),
  },
  last_modified: {
    displayName: 'Last Modified',
    format: (value) => new Date(value).toLocaleString(),
  },
  watched_resource: {
    displayName: 'Watched Resource',
  },
  a_record: {
    displayName: 'A Record',
  },
  mx_record: {
    displayName: 'MX Record',
  },
  spf_record: {
    displayName: 'SPF Record',
  },
  subdomains: {
    displayName: 'Subdomains',
  },
  website_url: {
    displayName: 'Website URL',
  },
  website_status_code: {
    displayName: 'Website Status Code',
  },
  website_certificate: {
    displayName: 'Website Certificate',
  },
  website_screenshot: {
    displayName: 'Website Screenshot',
  },
  company: {
    displayName: 'Company',
  },
};

const resourceProperties = [
  {
    value: 'typo_match',
    displayName: 'Typo Match',
  },
  {
    value: 'noise_reduction',
    displayName: 'Noise Reduction',
  },
];

const AlertsFormFields = [
  {
    type: 'date',
    label: 'Date',
    id: 'alerts-date-range',
    placeholder: 'YYYY-MM-DD to YYYY-MM-DD',
    name: 'alert_date',
  },
  { type: 'text', label: 'Domain Name', placeholder: 'Search Domain Name', name: 'value' },
];

const lookalikeDomainsFormFields = [
  {
    type: 'date',
    label: 'Date',
    id: 'lookalike-domains-date-range',
    placeholder: 'YYYY-MM-DD to YYYY-MM-DD',
    name: 'source_date',
  },
  { type: 'text', label: 'Domain Name', placeholder: 'Search Domain Name', name: 'value' },
  { type: 'text', label: 'Watched Resource', placeholder: 'Search Watched Resource', name: 'watched_resource' },
  {
    type: 'select',
    label: 'Review Status',
    name: 'status',
    options: [
      { displayName: 'Open', value: 'open' },
      { displayName: 'Closed', value: 'closed' },
      { displayName: 'Takedown Requested', value: 'takedown' },
      { displayName: 'Not Relevant', value: 'not_relevant' },
      { displayName: 'All', value: '' },
    ],
  },
];

const resourcesFormFields = [
  {
    type: 'text',
    id: 'resource-id',
    name: 'id',
    label: 'ID',
    hidden: true,
  },
  {
    type: 'text',
    id: 'resource-value',
    name: 'value',
    label: 'Resource',
    placeholder: 'Enter a keyword or domain',
    pattern: '^[a-zA-Z0-9\\-]+\\.{0,1}[a-zA-Z]{2,}$',
    required: true,
    invalidFeedback: 'Please enter a valid keyword or domain',
  },
  {
    type: 'text',
    id: 'resource-type',
    name: 'resource_type',
    hidden: true,
  },
  {
    type: 'checkbox',
    id: 'resource-property',
    name: 'properties',
    label: '',
    options: resourceProperties,
    disabled: true,
  },
  {
    type: 'text',
    id: 'resource-exclude-keywords',
    name: 'exclude_keywords',
    label: '',
    placeholder: 'Enter keywords to exclude',
  },
  {
    type: 'select',
    id: 'watched-resource-company',
    name: 'company',
    label: 'Company',
    options: [],
    required: true,
  },
];

const monitoredDomainsFormFields = [
  {
    type: 'text',
    id: 'domain-name',
    name: 'domain_name',
    label: 'Domain Name',
    pattern: '^[a-zA-Z0-9\\-]+\\.{1}[a-zA-Z]{2,}$',
    placeholder: 'Enter a Domain',
    required: true,
    invalidFeedback: 'Please enter a valid domain.',
  },
  {
    type: 'select',
    id: 'monitored-domain-company',
    name: 'company',
    label: 'Company',
    options: [],
    required: true,
  },
];

const handleTotalCount = async (url, countElement, status) => {
  const params = {
    status,
  };

  const urlParams = new URLSearchParams(params);

  try {
    const response = await fetch(`${url}?${urlParams}`, { method: 'GET', headers });
    const data = await response.json();
    countElement.text(data.count);
  } catch (error) {
    countElement.text('?');
  }
};

const deleteSelectedRowsFromForm = async (tabName, url, dt) => {
  const countElement = $(`#${tabName}-tab span`);
  const confirmationModal = $(`#${tabName}-confirmation-modal`);
  const ids = dt
    .rows({ selected: true })
    .nodes()
    .toArray()
    .map((row) => $(row).find('.dt-checkboxes').val());

  const deletePromises = ids.map((id) => {
    return fetch(`${url}${id}/`, {
      method: 'DELETE',
      headers: headers,
    });
  });

  // Wait for all the delete requests to complete
  const responses = await Promise.allSettled(deletePromises);

  // Count the successful deletes
  const successCount = responses.filter(({ status }) => status === 'fulfilled').length;

  // Show a success message, reload the DataTable, and update the count element and delete button
  toastr.success(`${successCount} row(s) deleted`);
  dt.ajax.reload();
  countElement.text(parseInt(countElement.text()) - successCount);
  confirmationModal.modal('hide');
};

const addDomainsToMonitoring = async (selectedData) => {
  const url = urls.monitoredDomains;
  const status = 'active';
  let successCount = 0;

  await Promise.all(
    selectedData.map(async ({ domain_name, company }) => {
      if (domain_name) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              value: domain_name,
              company,
              status,
            }),
          });

          if (!response.ok) {
            if (response.status === 400) {
              toastr.warning(`Domain ${domain_name} is already being monitored`);
            } else {
              toastr.error(response.statusText);
            }
          } else {
            successCount++;
            await response.json();
          }
        } catch (error) {
          toastr.error(error.message);
        }
      }
    })
  );

  if (successCount > 0) {
    toastr.success(`${successCount} domain(s) added to monitoring`);

    $datatableMonitoredDomains.DataTable().ajax.reload();
    $datatableLookalikeDomains.DataTable().ajax.reload();
  }
};

const blockDomains = async (selectedData) => {
  const url = urls.lookalikeDomainsBlock;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRFToken,
      },
      body: JSON.stringify({ domains: selectedData.map(({ domain_name }) => domain_name) }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error sending POST request:', error);
  }
};

const generateDom = (button = '') => {
  return `<"row"<"col-sm-12 col-md-3"l><"col-sm-12 col-md-9 d-flex justify-content-center align-items-center justify-content-md-end"${
    button ? `<"${button}">` : ''
  }<"dt-action-buttons text-end ms-2"B>f>>t<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>`;
};

const generateCheckboxColumnDef = () => ({
  targets: 0,
  orderable: false,
  checkboxes: {
    selectRow: true,
    selectAllRender: '<input class="form-check-input" type="checkbox">',
  },
  render: (data) => `<input class="form-check-input dt-checkboxes" type="checkbox" value="${data}">`,
});

const generateDateColumnDef = (targets) => ({
  targets,
  type: 'date',
  dateFormat: 'mm/dd/yyyy, hh:mm:ss A',
  render: (data) => new Date(data).toLocaleString(),
});

const handleInputChange = () => {
  const inputValue = $('#resource-value').val();
  const domainPattern = new RegExp('^[a-zA-Z0-9-]+\\.{1}[a-zA-Z]{2,}$');
  const keywordPattern = new RegExp('^[a-zA-Z0-9-]+$');

  let isDomain = domainPattern.test(inputValue);
  let isKeyword = keywordPattern.test(inputValue);

  $('#resource-type').val(isDomain ? 'domain' : isKeyword ? 'keyword' : '');

  const checkbox1 = $('#resource-property-1');
  const checkbox2 = $('#resource-property-2');

  checkbox1.prop('disabled', !isDomain);

  if (checkbox1.prop('disabled')) {
    checkbox1.prop('checked', false).trigger('change');
  }

  checkbox1.on('change', function () {
    checkbox2.prop('disabled', !this.checked);
    if (checkbox2.prop('disabled')) {
      checkbox2.prop('checked', false);
    }
  });
};

const generateBasicHtml = (inputData) => {
  const keysToExclude = ['id', 'comments', 'website_screenshot'];

  const filteredDataItems = Object.keys(inputData)
    .filter((key) => !keysToExclude.includes(key))
    .map((key) => {
      const value = inputData[key];
      const { displayName, format, className } = keyDisplayNameMapping[key];
      const formattedValue = format ? format(value) : value;
      const htmlValue = `<span class="fw-bolder text-${className ? className(value) : ''}">${formattedValue}</span>`;
      return { displayName, htmlValue };
    });

  const htmlString = filteredDataItems
    .map(({ displayName, htmlValue }) => `<p class="text-break">${displayName}: ${htmlValue}</p>`)
    .join('');

  return htmlString;
};

const handleDatatableSpanClick = (dt, tabName) => {
  dt.on('click', 'span.cursor-pointer', async function () {
    const data = dt.row($(this).parents('tr')).data();
    const id = data.id;

    try {
      const response = await fetch(tabsInfo[tabName].url + id, {
        method: 'GET',
        headers,
      });
      const data = await response.json();

      const basicHtml = generateBasicHtml(data);

      const commentsHtml = data.comments
        .reverse()
        .map(
          (comment) => `
          <div id="${tabName}-comment-${comment.id}" class="row comment bg-lighter rounded p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">${comment.username}</small>
              <small class="text-muted">${new Date(comment.created).toLocaleString()}</small>
            </div>
            <div class="col">
              ${comment.text}
            </div>
            <div class="col text-end">
              <i class="ti ti-trash ti-sm delete-comment cursor-pointer"></i>
            </div>
          </div>
        `
        )
        .join('');

      if (tabName == 'alerts') {
        const website_screenshot = data.website_screenshot;
        const websiteScreenshotHtml = website_screenshot
          ? `<img class="d-block w-100 border" src="/media/website_screenshots/${website_screenshot}" alt="${website_screenshot}">`
          : 'Not Available';
        $(`#${tabName}-website-screenshot`).html(websiteScreenshotHtml).removeClass('d-none');
      }

      $(`#${tabName}-detail-modal-label`).text(`Alert ID: #${data.id}`).attr('value', data.id);
      $(`#${tabName}-detail-content`).html(basicHtml);
      $(`#${tabName}-comments`).html(commentsHtml);
    } catch (error) {
      toastr.error(error.message);
    }
    $(`#${tabName}-detail-modal`).modal('show');
  });
};

const updateStatus = (url, status) => async (e, dt, node, config) => {
  const selectedRows = dt.rows({ selected: true });
  const ids = selectedRows
    .nodes()
    .toArray()
    .map((row) => $(row).find('.dt-checkboxes').val());

  const promises = ids.map(async (id) => {
    try {
      const response = await fetch(`${url}${id}/`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        toastr.error(response.statusText);
      }
    } catch (error) {
      toastr.error(error.message);
    }
  });

  await Promise.allSettled(promises);
  dt.ajax.reload();
  selectedRows.deselect();
};

const generateStatusButtons = (url, statusOptions) => {
  return statusOptions
    .filter((option) => option.text !== 'All')
    .map((option) => ({
      text: option.text,
      className: 'dropdown-item',
      action: updateStatus(url, option.value),
    }));
};

const addComment = async (url, datatableId, modalId) => {
  const $addComment = $(`#${datatableId}-add-comment`);
  const commentText = $addComment.val();

  if (!commentText) return;

  $addComment.val('');
  const id = $(modalId).attr('value');

  let data = {
    text: commentText,
    user: '',
  };

  if (datatableId == 'alerts') {
    data.alert = id;
  } else if (datatableId == 'lookalike-domains') {
    data.lookalike_domain = id;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    const { id: commentId, username, created, text } = await response.json();
    toastr.success('Comment updated');

    const comments_html = `
      <div id="${datatableId}-comment-${commentId}" class="row comment bg-lighter rounded p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">${username}</small>
          <small class="text-muted">${new Date(created).toLocaleString()}</small>
        </div>
        <div class="col">
          ${text}
        </div>
        <div class="col text-end">
          <i class="ti ti-trash ti-sm delete-comment cursor-pointer"></i>
        </div>
      </div>
    `;

    $(`#${datatableId}-comments`).prepend(comments_html);
  } catch (error) {
    toastr.error(error);
  }
};

const deleteComment = async (url, datatableId) => {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: headers,
    });

    if (response.ok) {
      toastr.success('Comment deleted');
      $(datatableId).remove();
    } else {
      toastr.error('Failed to delete comment');
    }
  } catch (error) {
    toastr.error(error.message);
  }
};

const addCommentManagementToModal = (tabName) => {
  const detailsForm = $(`#${tabName}-detail-form`);
  const variableName = convertToCamelCase(tabName).slice(0, -1) + 'Comments';
  const modalId = `#${tabName}-detail-modal-label`;

  // Add Comment
  detailsForm.on('submit', async (e) => {
    e.preventDefault();
    addComment(urls[variableName], tabName, modalId);
  });

  // Delete Comment
  detailsForm.on('click', '.delete-comment', async (e) => {
    const id = $(e.target).closest('.comment').attr('id').split('-').pop();
    deleteComment(`${urls[variableName]}${id}/`, `#${tabName}-comment-${id}`);
  });
};

const initializeAlertsDatatable = (url) => {
  const statusOptions = [
    { value: '', text: 'All' },
    { value: 'open', text: 'Open', selected: true },
    { value: 'closed', text: 'Closed' },
  ];

  const buttons = [
    {
      extend: 'collection',
      text: '<span class="d-sm-inline-block">Set Status as</span>',
      className: 'btn btn-label-dark dropdown-toggle alerts-btn-status btn-toggle ms-2',
      autoClose: true,
      buttons: generateStatusButtons(url, statusOptions),
    },
    ...generateExportButtons([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], url),
  ];

  const options = {
    selector: '#datatable-alerts',
    url: url,
    data: () => {
      const status = $('#alert-status-select').val();
      const query = {
        status: status === undefined ? 'open' : status,
      };
      const queryString = $.param(query);
      return queryString;
    },
    columns: [
      { data: 'id' },
      { data: 'id', render: (data) => `#${data}` },
      { data: 'created' },
      { data: 'domain_name', render: renderCursorPointer },
      { data: 'a_record' },
      { data: 'mx_record' },
      { data: 'spf_record' },
      { data: 'website_url' },
      { data: 'website_status_code' },
      { data: 'subdomains' },
      { data: 'website_screenshot' },
      { data: 'website_certificate' },
      { data: 'status', render: renderStatusBadge },
    ],
    scrollX: false,
    columnDefs: [
      generateCheckboxColumnDef(),
      generateDateColumnDef(2),
      {
        // Website Screenshot
        targets: 10,
        render: (data) =>
          data ? `<a href="/media/website_screenshots/${data}" target="_blank"><i class="ti ti-photo"></i></a>` : data,
      },
    ],
    dom: generateDom('alert-status'),
    buttons: buttons,
    drawCallback: () => handleTotalCount(url, tabsInfo['alerts'].count, 'open'),
  };

  const dt = initializeDataTable(options);

  const statusOptionsHTML = statusOptions
    .map((option) => `<option value="${option.value}" ${option.selected ? 'selected' : ''}>${option.text}</option>`)
    .join('');

  const alertStatusDropdown = $(`<select id="alert-status-select" class="form-select">${statusOptionsHTML}</select>`);
  $('.alert-status').append(alertStatusDropdown);

  $('#alert-status-select').on('change', () => dt.ajax.reload());

  return dt;
};

const initializeLookalikeDomainsDatatable = (url, filters) => {
  const statusOptions = [
    { value: 'open', text: 'Open' },
    { value: 'closed', text: 'Closed' },
    { value: 'takedown', text: 'Takedown Requested' },
    { value: 'not_relevant', text: 'Not Relevant' },
  ];

  const buttons = [
    {
      text: 'Block and Add to Monitoring',
      className: 'lookalike-domains-btn-add btn btn-primary btn-toggle ms-2',
    },
    {
      extend: 'collection',
      text: '<span class="d-sm-inline-block">Set Status as</span>',
      className: 'btn btn-label-dark dropdown-toggle lookalike-domains-btn-status btn-toggle ms-2',
      autoClose: true,
      buttons: generateStatusButtons(url, statusOptions),
    },
    ...generateExportButtons([1, 2, 3, 4, 5, 6, 7], `${url}?${filters}`),
  ];

  const options = {
    selector: '#datatable-lookalike-domains',
    url: `${url}?${filters}`,
    columns: [
      { data: 'id' },
      { data: 'source_date' },
      { data: 'created' },
      { data: 'value', render: renderCursorPointer },
      { data: 'watched_resource' },
      { data: 'company' },
      { data: 'status', render: renderStatusBadge },
      { data: 'is_monitored', render: renderStatusBadge },
    ],
    columnDefs: [generateCheckboxColumnDef(), generateDateColumnDef(2)],
    order: [[2, 'desc']],
    dom: generateDom(),
    buttons: buttons,
    drawCallback: () => handleTotalCount(url, tabsInfo['lookalike-domains'].count, 'open'),
  };

  return initializeDataTable(options);
};

const initializeNewSslDatatable = (url) => {
  const options = {
    selector: '#datatable-new-ssl',
    url: `${url}?ordering=-created`,
    columns: [
      { data: 'id' },
      { data: 'created' },
      { data: 'cert_index' },
      { data: 'cert_domain' },
      { data: 'watched_domain' },
      { data: 'company' },
    ],
    columnDefs: [generateCheckboxColumnDef(), generateDateColumnDef(1)],
    dom: generateDom(),
    buttons: generateExportButtons([1, 2, 3, 4, 5], url),
  };

  return initializeDataTable(options);
};

const initializeMonitoredDomainsDatatable = (url) => {
  const buttons = [
    {
      text: 'Add New Domain',
      className: 'monitored-domains-btn-add btn btn-primary ms-2',
      attr: {
        'data-bs-toggle': 'modal',
        'data-bs-target': '#monitored-domains-input-modal',
      },
    },
    {
      text: 'Delete',
      className: 'btn btn-danger btn-toggle ms-2',
      attr: {
        'data-bs-toggle': 'modal',
        'data-bs-target': '#monitored-domains-confirmation-modal',
      },
    },
    ...generateExportButtons([1, 2, 3, 4, 5], url),
  ];

  const options = {
    selector: '#datatable-monitored-domains',
    url: url,
    columns: [
      { data: 'id' },
      { data: 'created' },
      { data: 'last_checked', render: (data) => (data !== '1900-01-01' ? data : 'Never') },
      { data: 'value', render: (data) => `<span class="fw-bolder">${data}</span>` },
      { data: 'company' },
      { data: 'status', render: renderStatusBadge },
    ],
    columnDefs: [generateCheckboxColumnDef(), generateDateColumnDef(1)],
    dom: generateDom(),
    buttons: buttons,
    drawCallback: () => handleTotalCount(url, tabsInfo['monitored-domains'].count, 'active'),
  };

  return initializeDataTable(options);
};

const initializeResourcesDatatable = (url) => {
  const buttons = [
    {
      text: 'Add New Resource',
      className: 'resources-btn-add btn btn-primary ms-2',
      attr: {
        'data-bs-toggle': 'modal',
        'data-bs-target': '#resources-input-modal',
      },
    },
    {
      text: 'Delete',
      className: 'btn btn-danger btn-toggle ms-2',
      attr: {
        'data-bs-toggle': 'modal',
        'data-bs-target': '#resources-confirmation-modal',
      },
    },
    ...generateExportButtons([1, 2, 3, 4, 5, 6], url),
  ];

  const options = {
    selector: '#datatable-resources',
    url: url,
    columns: [
      { data: 'id' },
      { data: 'created' },
      { data: 'value', render: renderCursorPointer },
      { data: 'resource_type', render: textCapitalize },
      { data: 'exclude_keywords' },
      { data: 'company' },
      { data: 'status', render: renderStatusBadge },
      { data: 'properties' },
    ],
    columnDefs: [
      generateCheckboxColumnDef(),
      generateDateColumnDef(1),
      {
        // Properties
        targets: 6,
        render: (data) => {
          if (Array.isArray(data)) {
            return data
              .map((item) => {
                item = item
                  .split('_')
                  .map((word) => textCapitalize(word))
                  .join(' ');
                return `<span class="badge bg-label-primary m-1">${item}</span>`;
              })
              .join('');
          }
          return data;
        },
      },
    ],
    dom: generateDom(),
    buttons: buttons,
    drawCallback: () => handleTotalCount(url, tabsInfo['resources'].count, 'active'),
  };

  return initializeDataTable(options);
};

const generateSearchQuery = (formElement) => {
  const urlParams = new $.param();

  $(formElement)
    .find(':input')
    .each(function () {
      const element = $(this);
      const name = element.attr('name');
      const value = element.val();
      const type = element.prop('type');

      if (type === 'select-one') {
        urlParams[name] = value;
      } else if (name.includes('date')) {
        const [startDate, endDate = startDate] = value.split(' to ');
        urlParams['source_date__gte'] = startDate;
        urlParams['source_date__lte'] = endDate;
      } else {
        urlParams[name + '__icontains'] = value;
      }
    });

  return $.param(urlParams);
};

$(() => {
  'use strict';

  const today = Date.now();
  const yesterday = today - 86400000;
  const before_yesterday = today - 172800000;
  const maxDate = today > new Date(today).setUTCHours(4, 0, 0, 0) ? yesterday : before_yesterday;

  const flatpickrConfig = (elementId, maxDate) => {
    flatpickr(document.getElementById(elementId), {
      mode: 'range',
      minDate: '2020-08-02',
      maxDate: new Date(maxDate),
    });
  };

  const monitoredDomainsInputModal = window.createInputModal(
    'monitored-domain',
    'Add New Domain',
    monitoredDomainsFormFields
  );

  fetch(urls.companies, {
    method: 'GET',
    headers,
  })
    .then((response) => response.json())
    .then((data) => {
      const selectElements = document.getElementsByName('company');
      data.results.forEach((company) => {
        const optionElement = document.createElement('option');
        optionElement.text = company.name;
        optionElement.value = company.name;
        selectElements.forEach((selectElement) => {
          selectElement.add(optionElement.cloneNode(true));
        });
      });
    })
    .catch((error) => console.error('Error:', error));

  const monitoredDomainsConfirmationModal = window.createConfirmationModal('monitored-domain');
  const resourceInputModal = window.createInputModal('resource', 'Add New Resource', resourcesFormFields);
  const resourceConfirmationModal = window.createConfirmationModal('resource');

  tabsInfo['alerts'].tab.append(window.createDetailModal('alerts'));
  tabsInfo['lookalike-domains'].tab.append(window.createDetailModal('lookalike-domains'));
  tabsInfo['monitored-domains'].tab.append(monitoredDomainsInputModal, monitoredDomainsConfirmationModal);
  tabsInfo['resources'].tab.append(resourceInputModal, resourceConfirmationModal);

  addCommentManagementToModal('alerts');
  addCommentManagementToModal('lookalike-domains');

  let alertsDatatable = initializeAlertsDatatable(urls.alerts);
  let lookalikeDomainsDatatable = initializeLookalikeDomainsDatatable(urls.lookalikeDomains, 'status=open');
  initializeNewSslDatatable(urls.sslCertificates);
  let monitoredDomainsDatatable = initializeMonitoredDomainsDatatable(urls.monitoredDomains);

  let resourcesDatatable = initializeResourcesDatatable(urls.watchedResources);

  tabsInfo['alerts'].datatable = alertsDatatable;
  tabsInfo['lookalike-domains'].datatable = lookalikeDomainsDatatable;
  tabsInfo['monitored-domains'].datatable = monitoredDomainsDatatable;
  tabsInfo['resources'].datatable = resourcesDatatable;

  // Add Record
  tabsInfo['lookalike-domains'].tab.on('click', '.lookalike-domains-btn-add', (e) => {
    e.preventDefault();

    const selectedRows = lookalikeDomainsDatatable.rows({ selected: true });
    const selectedData = selectedRows
      .data()
      .map((row) => ({ domain_name: row.value, company: row.company }))
      .toArray();

    addDomainsToMonitoring(selectedData);
    blockDomains(selectedData);
    selectedRows.deselect();
  });

  const addDomainModal = $('#monitored-domains-input-modal');
  addDomainModal.on('submit', '#monitored-domains-form', function (e) {
    if (e.target.checkValidity()) {
      addDomainModal.modal('hide');
      const [{ value: domain_name }, { value: company }] = $(this).serializeArray();
      blockDomains([{ domain_name, company }]);
      addDomainsToMonitoring([{ domain_name, company }]);
    }
  });

  // Start of Resources
  // Add/Update Record
  const el = $('#resources-input-modal');
  el.on('submit', '#resources-form', async function (e) {
    e.preventDefault();

    const form = e.target;
    if (!form.checkValidity()) return;

    el.modal('hide').data('bs.modal', null);
    let serializedArray = $(form).serializeArray();

    const formData = serializedArray.reduce(
      (acc, { name, value }) => {
        if (name === 'exclude_keywords') {
          if (value !== '') {
            acc[name] = JSON.parse(value).map((item) => item.value);
          } else {
            acc[name] = [];
          }
        } else if (Array.isArray(acc[name])) {
          acc[name].push(value);
        } else {
          acc[name] = value;
        }
        return acc;
      },
      { properties: [], exclude_keywords: [] }
    );

    const { id, value, resource_type, exclude_keywords, properties, company } = formData;
    const url = id ? `${urls.watchedResources}${id}/` : urls.watchedResources;
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: headers,
      body: JSON.stringify({
        company,
        value,
        resource_type,
        exclude_keywords,
        properties,
      }),
    })
      .then((response) => {
        if (response.ok) {
          toastr.success(id ? 'Resource updated' : 'Resource added');
          $datatableResources.DataTable().ajax.reload();
        } else {
          toastr.error(response.statusText);
        }
      })
      .catch((error) => {
        toastr.error(error.message);
      });
  });

  // Add an event listener to the DataTable
  resourcesDatatable.on('click', 'span.cursor-pointer', function () {
    const data = resourcesDatatable.row($(this).parents('tr')).data();

    const fieldNames = resourcesFormFields.map(({ name }) => name);
    const selectors = fieldNames.map((name) => `#resources-input-modal [name="${name}"]`);
    const elements = document.querySelectorAll(selectors.join(', '));
    elements.forEach((element) => {
      const fieldName = element.getAttribute('name');

      if (fieldName === 'exclude_keywords') {
        let tagify = element.__tagify;
        if (!tagify) {
          tagify = new Tagify(element);
        }
        tagify.removeAllTags();
        tagify.addTags(data[fieldName]);
      } else if (Array.isArray(data[fieldName])) {
        element.checked = data[fieldName].includes(element.value);
      } else {
        element.value = data[fieldName];
      }

      $(element).trigger('change');

      if (fieldName === 'value') {
        $('#resource-value').trigger('input');
      }
    });

    $('#resources-input-modal-title').text('Edit Resource');
    $('#resources-input-modal').modal('show');
  });

  // End of Resources

  // Delete Record
  $('.delete-form').on('submit', (e) => {
    e.preventDefault();
    const tabName = e.target.id.replace('-delete-form', '');
    deleteSelectedRowsFromForm(tabName, tabsInfo[tabName].url, tabsInfo[tabName].datatable);
  });

  handleDatatableSpanClick(alertsDatatable, 'alerts');
  handleDatatableSpanClick(lookalikeDomainsDatatable, 'lookalike-domains');

  $('.needs-validation').each((_, form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.checkValidity() === false) {
        form.classList.add('invalid');
      }
      form.classList.add('was-validated');
    });
  });

  // Enable/disable buttons based on row selection
  $.each($.fn.dataTable.tables(), function (index, table) {
    const dt = $(table).DataTable();
    const button = $(table).parent().find('.btn-toggle');

    dt.on('select deselect draw', () => {
      const selectedRows = dt.rows({ selected: true }).nodes().toArray().length;
      button.prop('disabled', selectedRows === 0);
    });
  });

  const $lookalikeDomainsSearchForm = $('#lookalike-domains-search-form');
  const $alertsSearchForm = $('#alerts-search-form');

  $lookalikeDomainsSearchForm.html(window.generateSearchFormHTML(lookalikeDomainsFormFields));
  $alertsSearchForm.html(window.generateSearchFormHTML(AlertsFormFields));

  $lookalikeDomainsSearchForm.submit((e) => {
    e.preventDefault();
    const searchQuery = generateSearchQuery($lookalikeDomainsSearchForm);
    lookalikeDomainsDatatable.ajax.url(`${urls.lookalikeDomains}?${searchQuery}`).load();
  });

  $alertsSearchForm.submit((e) => {
    e.preventDefault();
    const searchQuery = generateSearchQuery($alertsSearchForm);
    alertsDatatable.ajax.url(`${urls.alerts}?${searchQuery}`).load();
  });

  flatpickrConfig('lookalike-domains-date-range', maxDate);
  flatpickrConfig('alerts-date-range', today);

  $('.modal').on('hidden.bs.modal', (e) => {
    const form = $(e.currentTarget).find('form')[0];
    if (form) {
      form.classList.remove('was-validated');
      form.reset();
    }
  });

  $('#resource-value').on('input keyup', handleInputChange);
  $('#resources-form').on('reset', () => setTimeout(handleInputChange, 0));

  let timeout = null;

  $('input.dt-input, select.dt-input').on('keyup change', function (e) {
    const form = $(this).closest('form');

    if ($(e.target).hasClass('active')) {
      return;
    }

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      form.submit();
    }, 500); // 500ms delay
  });

  const tagifyExcludeKeywordsEl = document.querySelector('#resource-exclude-keywords');
  const tagifyExcludeKeywords = new Tagify(tagifyExcludeKeywordsEl);
});
