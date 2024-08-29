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
  monitoring: { title: 'Monitoring', color: 'success' },
  takedown: { title: 'Takedown Requested', color: 'warning' },
  not_relevant: { title: 'Not Relevant', color: 'secondary' },
  legal: { title: 'Sent to Legal', color: 'warning' },
  '': { title: '', color: 'secondary' },
  active: { title: 'Active', color: 'success' },
  inactive: { title: 'Inactive', color: 'secondary' },
};

const riskObj = {
  '': { title: 'Unknown', color: 'secondary' },
  low: { title: 'Low', color: 'success' },
  medium: { title: 'Medium', color: 'warning' },
  high: { title: 'High', color: 'danger' },
  critical: { title: 'Critical', color: 'danger' },
};

const spinnerHtml = `<div class="spinner-border m-8" role="status"><span class="visually-hidden">Loading...</span></div>`;

const renderBadge = (data, type) => {
  if (Array.isArray(data)) {
    return data.map((item) => `<span class="badge rounded-pill bg-label-dark m-1">${item}</span>`).join('');
  } else {
    const selectedObj = type === 'status' ? statusObj : type === 'risk' ? riskObj : statusObj;
    const { color, title } = selectedObj[data] || {};
    return `<span class="badge bg-label-${color || 'secondary'}">${title || 'Unknown'}</span>`;
  }
};

const renderCursorPointer = (data) => `<span class="fw-bolder cursor-pointer">${data}</span>`;

const keyDisplayNameMapping = {
  value: {
    displayName: 'Domain Name',
  },
  domain_name: {
    displayName: 'Domain Name',
  },
  source: {
    displayName: 'Source',
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
    name: 'created',
  },
  { type: 'text', label: 'Domain Name', placeholder: 'Search Domain Name', name: 'domain_name' },
  {
    type: 'select',
    label: 'Status',
    name: 'status',
    options: [
      { displayName: 'Open', value: 'open' },
      { displayName: 'Closed', value: 'closed' },
      { displayName: 'All', value: '' },
    ],
  },
];

const lookalikeDomainsFilterFormFields = [
  {
    type: 'date',
    label: 'Date',
    id: 'lookalike-domains-date-range',
    placeholder: 'YYYY-MM-DD to YYYY-MM-DD',
    name: 'source_date',
  },
  { type: 'text', label: 'Domain Name', placeholder: 'Search Domain Name', name: 'value' },
  { type: 'text', label: 'Watched Resource', placeholder: 'Search Watched Resource', name: 'watched_resource' },
  { type: 'text', label: 'Source', placeholder: 'Search Source', name: 'source' },
  {
    type: 'select',
    label: 'Review Status',
    name: 'status',
    options: [
      { displayName: 'Open', value: 'open' },
      { displayName: 'Closed', value: 'closed' },
      { displayName: 'Takedown Requested', value: 'takedown' },
      { displayName: 'Sent to Legal', value: 'legal' },
      { displayName: 'Not Relevant', value: 'not_relevant' },
      { displayName: 'All', value: '' },
    ],
  },
];

const lookalikeDomainsInputFormFields = [
  {
    type: 'text',
    id: 'domain-name',
    name: 'value',
    label: 'Domain Name',
    pattern: '^[a-zA-Z0-9\\-]+\\.{1}[a-zA-Z]{2,}$',
    placeholder: 'Enter a Domain',
    required: true,
    invalidFeedback: 'Please enter a valid domain.',
  },
  {
    type: 'select',
    id: 'lookalike-domain-watched-resource',
    name: 'watched_resource',
    label: 'Watched Resource',
    options: [],
    required: true,
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
    inline: true,
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

// const monitoredDomainsFormFields = [
//   {
//     type: 'text',
//     id: 'domain-name',
//     name: 'domain_name',
//     label: 'Domain Name',
//     pattern: '^[a-zA-Z0-9\\-]+\\.{1}[a-zA-Z]{2,}$',
//     placeholder: 'Enter a Domain',
//     required: true,
//     invalidFeedback: 'Please enter a valid domain.',
//   },
//   {
//     type: 'select',
//     id: 'monitored-domain-company',
//     name: 'company',
//     label: 'Company',
//     options: [],
//     required: true,
//   },
// ];

const updateTotalCount = (api, tabKey, status) => {
  const openStatusCount = api.ajax.json()?.count?.status?.[status];
  tabsInfo[tabKey].count.text(openStatusCount);
};

const deleteSelectedRowsFromForm = async (tabName, url, dt) => {
  const countElement = $(`#${tabName}-tab span`);
  const confirmModal = $(`#${tabName}-delete-modal`);
  const ids = dt
    .rows({ selected: true })
    .nodes()
    .toArray()
    .map((row) => $(row).find('.dt-checkboxes').val());

  try {
    const response = await fetch(`${url}bulk-delete/`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const { deleted_count } = await response.json();
    toastr.success(`${deleted_count} row(s) deleted`);
    dt.ajax.reload();
    countElement.text(parseInt(countElement.text()) - deleted_count);
  } catch {
    toastr.error('An error occurred while deleting rows.');
  }
  confirmModal.modal('hide');
};

const addDomainsToMonitoring = async (selectedData) => {
  const url = urls.monitoredDomains;
  const status = 'active';

  const domainsData = selectedData.map(({ domain_name, company }) => ({
    value: domain_name,
    company,
    status,
  }));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(domainsData),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const { added_count, existing_count } = await response.json();

    if (added_count > 0) {
      toastr.success(`${added_count} domain(s) added to monitoring`);
    }

    if (existing_count > 0) {
      toastr.warning(`${existing_count} domain(s) already being monitored`);
    }
  } catch (error) {
    toastr.error(error.message);
  }
};

const addLookalikeDomains = async (selectedData) => {
  const url = urls.lookalikeDomains;

  const domainsData = selectedData.map(({ value, watched_resource, company, source_date }) => ({
    value,
    watched_resource,
    company,
    source_date,
    source: 'user',
  }));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(domainsData),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const { added_count, existing_count } = await response.json();

    if (added_count > 0) {
      toastr.success(`${added_count} domain(s) added`);
    }

    if (existing_count > 0) {
      toastr.warning(`${existing_count} domain(s) were duplicate and were not added`);
    }
  } catch (error) {
    toastr.error(error.message);
  }
};

const importDomainsToAnomaliThreatstream = async (selectedData, tags) => {
  const url = urls.anomaliThreatstreamDomainImport;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRFToken,
      },
      body: JSON.stringify({
        domains: selectedData.map(({ domain_name }) => domain_name),
        tags: tags,
      }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data = await response.json();
    toastr.success(data.message);
  } catch (error) {
    console.error(error.message);
  }
};

const addDomainsToTrellixETP = async (selectedData) => {
  const url = urls.trellixETPDomainAdd;
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
      throw new Error(response.statusText);
    }

    const data = await response.json();
    toastr.success(data.message);
  } catch (error) {
    console.error(error.message);
  }
};

const generateDom = (button = '') => {
  return `<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6 d-flex justify-content-center align-items-center justify-content-md-end"${
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

const generateSectionHtml = (id, title) => `
  <div class="col-6 mb-3">
    <h6 class="mb-3">${title}</h6>
    <div id="${id}" class="row"><div class="spinner-border mx-4" role="status"><span class="visually-hidden">Loading...</span></div></div>
  </div>
`;

const generateBasicHtml = (inputData, tabName) => {
  const keysToExclude = ['id', 'comments', 'website_screenshot'];
  const filteredDataItems = Object.keys(inputData)
    .filter((key) => !keysToExclude.includes(key))
    .map((key) => {
      const value = inputData[key];
      const { displayName, format, className } = keyDisplayNameMapping[key];
      const formattedValue = format ? format(value) : value;
      const htmlValue = className ? renderBadge(value) : formattedValue;
      return { displayName, htmlValue };
    });

  const alertInfoHtml = filteredDataItems
    .map(
      ({ displayName, htmlValue }) => `
        <div class="col-md-6">
          <h6 class="mb-1">${displayName}</h6>
          <p>${htmlValue}</p>
        </div>`
    )
    .join('');

  return `
    <div class="col-6 mb-3">
      <h6 class="mb-3">Alert Information</h6>
      <div class="row">
        ${alertInfoHtml}
      </div>
    </div>
    ${generateSectionHtml(`${tabName}-website-screenshot`, 'Website Screenshot')}
    ${generateSectionHtml(`${tabName}-whois`, 'WHOIS Information')}
    ${generateSectionHtml(`${tabName}-lookup`, 'DNS Lookup')}
  `;
};

const escapeHtml = (unsafe) => {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;')
    .replace(/\//g, '&#x2F;');
};

const generateCommentHtml = (comment, tabName) => {
  return `
    <div id="${tabName}-comment-${comment.id}" class="row comment bg-lighter rounded p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <small class="text-muted">${escapeHtml(comment.username)}</small>
        <small class="text-muted">${new Date(comment.created).toLocaleString()}</small>
      </div>
      <div class="col">
        ${escapeHtml(comment.text)}
      </div>
      <div class="col text-end">
        <i class="ti ti-trash ti-sm delete-comment cursor-pointer"></i>
      </div>
    </div>
  `;
};

const generateCommentsHtml = (comments, tabName) => {
  return comments
    .slice()
    .reverse()
    .map((comment) => generateCommentHtml(comment, tabName))
    .join('');
};

const handleDatatableSpanClick = (dt, tabName) => {
  let abortController;

  $(`#${tabName}-detail-modal`).on('hidden.bs.modal', function () {
    if (abortController) {
      abortController.abort();
    }
  });

  dt.on('click', 'span.cursor-pointer', async function () {
    abortController = new AbortController();

    const data = dt.row($(this).parents('tr')).data();
    const id = data.id;
    let websiteScreenshotHtml = '<div class="col-md-12">Not Available</div>';
    let lookupHtml = '<div class="col-md-12">Not Available</div>';

    try {
      const response = await fetch(tabsInfo[tabName].url + id, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });
      const data = await response.json();

      const basicHtml = generateBasicHtml(data, tabName);
      const commentsHtml = generateCommentsHtml(data.comments, tabName);

      $(`#${tabName}-detail-modal-label`).text(`Alert ID: #${data.id}`).attr('value', data.id);
      $(`#${tabName}-detail-content`).html(basicHtml);
      $(`#${tabName}-comments`).html(commentsHtml);
      $(`#${tabName}-detail-modal`).modal('show');

      if (tabName == 'alerts') {
        const website_screenshot = data.website_screenshot;
        websiteScreenshotHtml = website_screenshot
          ? `<div class="col-md-12"><img class="d-block w-100 border" src="/media/website_screenshots/${website_screenshot}" alt="${website_screenshot}"></div>`
          : '<div class="col-md-12">Not Available</div>';
      } else {
        const requestData = [
          {
            id: data.id,
            value: data.value,
            type: 'domain',
            checklist: ['lookup', 'whois', 'screenshot'],
          },
        ];

        let whoisHtml = '<div class="col-md-12">Not Available</div>';

        try {
          const response = await fetch('/api/intelligence-harvester/search/', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-CSRFToken': window.CSRFToken,
            },
            body: JSON.stringify({
              data: requestData,
            }),
            signal: abortController.signal,
          });

          const responseData = await response.json();
          const domainData = responseData.data[data.value].source_data;
          for (const [parentKey, parentValue] of Object.entries(domainData)) {
            if (parentKey === 'whois' || parentKey === 'lookup') {
              const results = parentValue.results;
              if (results) {
                resultsHtml = '<div class="row">';

                resultsHtml += Object.entries(results)
                  .map(([key, value]) => {
                    const textTransform = parentKey === 'lookup' ? key.toUpperCase() : textCapitalize(key);
                    return `<div class="col-md-12"><small class="mb-1"><span class="text-heading">${textTransform}: </span>${value}</small></div>`;
                  })
                  .join('');

                resultsHtml += '</div>';
              }
              if (parentKey === 'whois') {
                whoisHtml = resultsHtml;
              } else if (parentKey === 'lookup') {
                lookupHtml = resultsHtml;
              }
            } else if (parentKey === 'screenshot') {
              const website_screenshot = parentValue.results;
              websiteScreenshotHtml = website_screenshot
                ? `<div class="col-md-12"><img class="d-block w-100 border" src="data:image/png;base64,${website_screenshot}" alt="${website_screenshot}"></div>`
                : '<div class="col-md-12">Not Available</div>';
            }
          }
        } catch (error) {
          console.log('Error fetching data:', error);
        } finally {
          $(`#${tabName}-whois`).html(whoisHtml);
          $(`#${tabName}-lookup`).html(lookupHtml);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted', error);
      } else {
        console.log('Error fetching data:', error);
      }
    } finally {
      $(`#${tabName}-website-screenshot`).html(websiteScreenshotHtml);
    }
  });
};

const updateStatus = async (tabName, url, status, dt) => {
  const selectedRows = dt.rows({ selected: true });
  const selectedData = selectedRows
    .data()
    .map((row) => ({ domain_name: row.value, company: row.company }))
    .toArray();

  if (tabName === 'lookalike-domains' && (status === 'closed' || status === 'takedown' || status === 'legal')) {
    const tags = ['FIS Domain Monitoring', 'Global_Block', 'XSOAR_TIM'];

    if (status === 'takedown') {
      tags.push('FIS Domain Monitoring - Domain Take Down Requested');
    } else if (status === 'legal') {
      tags.push('FIS Domain Monitoring - Sent to Legal');
    }
    importDomainsToAnomaliThreatstream(selectedData, tags);
    addDomainsToTrellixETP(selectedData);
    addDomainsToMonitoring(selectedData);
  }

  const ids = selectedRows
    .nodes()
    .toArray()
    .map((row) => $(row).find('.dt-checkboxes').val());

  try {
    const response = await fetch(`${url}bulk-patch/`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify({ ids, status }),
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const { updated_count } = await response.json();
    toastr.success(`${updated_count} row(s) marked as ${status}`);
  } catch (error) {
    toastr.error(error.message);
  }
  selectedRows.deselect();
  dt.ajax.reload();
  $('#datatable-monitored-domains').DataTable().ajax.reload();
};

const generateStatusButtons = (url, statusOptions, tabName) => {
  const waitForConfirmation = () => {
    return new Promise((resolve) => {
      const confirmModalSelector = `#${tabName}-confirm-modal`;
      const confirmFormSelector = `#${tabName}-confirm-form`;

      $(confirmModalSelector).modal('show');

      $(confirmFormSelector).on('submit', function (e) {
        e.preventDefault();
        $(confirmModalSelector).modal('hide');
        resolve(true);
      });

      $(confirmModalSelector).on('hidden.bs.modal', function () {
        resolve(false);
      });
    });
  };

  const handleAction = async (option, dt) => {
    console.log(tabName);
    try {
      if (tabName === 'lookalike-domains' && ['takedown', 'legal', 'closed'].includes(option.value)) {
        console.log('lookalike-domains');
        const confirmed = await waitForConfirmation();
        if (confirmed) {
          console.log('confirmed');
          updateStatus(tabName, url, option.value, dt);
        }
      } else {
        console.log('not lookalike-domains');
        updateStatus(tabName, url, option.value, dt);
      }
    } catch (error) {
      console.error('Error handling action:', error);
    }
  };

  return statusOptions
    .filter((option) => option.text !== 'All')
    .map((option) => ({
      text: option.text,
      className: 'dropdown-item',
      action: (e, dt, node, config, cb) => handleAction(option, dt),
    }));
};

const addComment = async (url, tabName, modalId) => {
  const $addComment = $(`#${tabName}-add-comment`);
  const commentText = $addComment.val();

  if (!commentText) return;

  $addComment.val('');
  const id = $(modalId).attr('value');

  let data = {
    text: commentText,
    user: '',
  };

  if (tabName == 'alerts') {
    data.alert = id;
  } else if (tabName == 'lookalike-domains') {
    data.lookalike_domain = id;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });

    const comment = await response.json();
    toastr.success('Comment updated');

    const commentHtml = generateCommentHtml(comment, tabName);

    $(`#${tabName}-comments`).prepend(commentHtml);
  } catch (error) {
    toastr.error(error);
  }
};

const deleteComment = async (url, tabName) => {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: headers,
    });

    if (response.ok) {
      toastr.success('Comment deleted');
      $(tabName).remove();
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

const initializeAlertsDatatable = (url, filters) => {
  const statusOptions = [
    { value: '', text: 'All' },
    { value: 'open', text: 'Open' },
    { value: 'closed', text: 'Closed' },
  ];

  const buttons = [
    {
      extend: 'collection',
      text: '<span class="d-sm-inline-block">Set Status as</span>',
      className: 'btn btn-label-dark dropdown-toggle alerts-btn-status btn-toggle ms-2',
      autoClose: true,
      buttons: generateStatusButtons(url, statusOptions, 'alerts'),
    },
    ...generateExportButtons([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], `${url}?${filters}`),
  ];

  const options = {
    selector: '#datatable-alerts',
    url: `${url}?${filters}`,
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
      { data: 'status', render: (data) => renderBadge(data, 'status') },
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
    dom: generateDom(),
    buttons: buttons,
    drawCallback: function (settings) {
      updateTotalCount(this.api(), 'alerts', 'open');
    },
  };

  return initializeDataTable(options);
};

const initializeLookalikeDomainsDatatable = (url, filters) => {
  const statusOptions = [
    { value: 'closed', text: 'Closed' },
    { value: 'takedown', text: 'Takedown Requested' },
    { value: 'legal', text: 'Sent to Legal' },
    { value: 'not_relevant', text: 'Not Relevant' },
  ];

  const buttons = [
    {
      extend: 'collection',
      text: '<span class="d-sm-inline-block">Set Status as</span>',
      className: 'btn btn-label-dark dropdown-toggle lookalike-domains-btn-status btn-toggle ms-2',
      autoClose: true,
      buttons: generateStatusButtons(url, statusOptions, 'lookalike-domains'),
    },
    {
      text: 'Add New Domain',
      className: 'btn btn-primary ms-2',
      attr: {
        'data-bs-toggle': 'modal',
        'data-bs-target': '#lookalike-domains-input-modal',
      },
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
      { data: 'source' },
      { data: 'company' },
      { data: 'status', render: (data) => renderBadge(data, 'status') },
      { data: 'is_monitored', render: (data) => renderBadge(data, 'status') },
    ],
    columnDefs: [generateCheckboxColumnDef(), generateDateColumnDef(2)],
    order: [[2, 'desc']],
    dom: generateDom(),
    buttons: buttons,
    drawCallback: function (settings) {
      updateTotalCount(this.api(), 'lookalike-domains', 'open');
    },
  };

  return initializeDataTable(options);
};

const initializeMonitoredDomainsDatatable = (url) => {
  const buttons = [
    {
      text: 'Delete',
      className: 'btn btn-danger btn-toggle ms-2',
      attr: {
        'data-bs-toggle': 'modal',
        'data-bs-target': '#monitored-domains-delete-modal',
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
      { data: 'status', render: (data) => renderBadge(data, 'status') },
    ],
    columnDefs: [generateCheckboxColumnDef(), generateDateColumnDef(1)],
    dom: generateDom(),
    buttons: buttons,
    drawCallback: function (settings) {
      updateTotalCount(this.api(), 'monitored-domains', 'active');
    },
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
        'data-bs-target': '#resources-delete-modal',
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
      { data: 'exclude_keywords', render: (data) => renderBadge(data) },
      { data: 'company' },
      { data: 'status', render: (data) => renderBadge(data, 'status') },
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
    drawCallback: function (settings) {
      updateTotalCount(this.api(), 'resources', 'active');
    },
  };

  return initializeDataTable(options);
};

const generateSearchQuery = (formElement) => {
  const urlParams = $(formElement)
    .find(':input[name]')
    .toArray()
    .reduce((acc, input) => {
      const name = $(input).attr('name');
      const value = $(input).val();
      const type = $(input).prop('type');

      switch (true) {
        case type === 'select-one':
          acc[name] = value;
          break;
        case name.includes('date') || name.includes('created'):
          const [startDate, endDate = startDate] = value.split(' to ');
          if (name.includes('created')) {
            if (startDate) acc[name + '__gte'] = startDate + 'T00:00:00Z';
            if (endDate) acc[name + '__lte'] = endDate + 'T23:59:59Z';
          } else {
            acc[name + '__gte'] = startDate;
            acc[name + '__lte'] = endDate;
          }
          break;
        default:
          acc[name + '__icontains'] = value;
      }

      return acc;
    }, {});

  return $.param(urlParams);
};

$(() => {
  'use strict';

  const ONE_DAY_MS = 86400000;
  const today = Date.now();
  const yesterday = today - ONE_DAY_MS;
  const before_yesterday = today - 2 * ONE_DAY_MS;
  const maxDate = today > new Date(today).setUTCHours(4, 0, 0, 0) ? yesterday : before_yesterday;

  const flatpickrConfig = (elementId, maxDate) => {
    flatpickr(document.getElementById(elementId), {
      mode: 'range',
      minDate: '2020-08-02',
      maxDate: new Date(maxDate),
    });
  };

  const fetchAndPopulateCompanyOptions = async () => {
    try {
      const response = await fetch(urls.companies, { method: 'GET', headers });
      const data = await response.json();
      const options = data.results.map(({ name }) => `<option value="${name}">${name}</option>`).join('');
      const $companySelects = document.getElementsByName('company');
      $companySelects.forEach((select) => (select.innerHTML += options));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAndPopulateWatchedResourceOptions = async () => {
    try {
      const response = await fetch(urls.watchedResources, { method: 'GET', headers });
      const data = await response.json();
      const options = data.results.map(({ value }) => `<option value="${value}">${value}</option>`).join('');
      const $watchedResourceSelects = document.getElementsByName('watched_resource');
      $watchedResourceSelects.forEach((select) => (select.innerHTML += options));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const initializeModals = () => {
    return {
      alertConfirmModal: window.createFormModal('confirm', 'alerts'),
      lookalikeDomainConfirmModal: window.createFormModal(
        'confirm',
        'lookalike-domains',
        'Are you sure?',
        [],
        "This action will add the selected domains for monitoring. Additionally, these domains will be included in Trellix ETP's Yara Rule for monitoring and Anomali ThreatStream for blocking."
      ),
      lookalikeDomainInputModal: window.createFormModal(
        'input',
        'lookalike-domains',
        'Add New Domain',
        lookalikeDomainsInputFormFields
      ),
      monitoredDomainDeleteConfirmModal: window.createFormModal('delete', 'monitored-domains', 'Are you sure?'),
      resourceConfirmModal: window.createFormModal('input', 'resources', 'Add New Resource', resourcesFormFields),
      resourceDeleteConfirmModal: window.createFormModal('delete', 'resources'),
    };
  };

  const modals = initializeModals();
  tabsInfo['alerts'].tab.append(window.createDetailModal('alerts'), modals.alertConfirmModal);
  tabsInfo['lookalike-domains'].tab.append(
    window.createDetailModal('lookalike-domains'),
    modals.lookalikeDomainInputModal,
    modals.lookalikeDomainConfirmModal
  );
  tabsInfo['monitored-domains'].tab.append(modals.monitoredDomainDeleteConfirmModal);
  tabsInfo['resources'].tab.append(modals.resourceConfirmModal, modals.resourceDeleteConfirmModal);

  ['alerts', 'lookalike-domains'].forEach(addCommentManagementToModal);

  const initializeDatatables = () => {
    tabsInfo['alerts'].datatable = initializeAlertsDatatable(urls.alerts, 'status=open');
    tabsInfo['lookalike-domains'].datatable = initializeLookalikeDomainsDatatable(urls.lookalikeDomains, 'status=open');
    tabsInfo['monitored-domains'].datatable = initializeMonitoredDomainsDatatable(urls.monitoredDomains);
    tabsInfo['resources'].datatable = initializeResourcesDatatable(urls.watchedResources);
  };

  initializeDatatables();
  fetchAndPopulateCompanyOptions();
  fetchAndPopulateWatchedResourceOptions();

  const addLookalikeDomainModal = $('#lookalike-domains-input-modal');
  addLookalikeDomainModal.on('submit', '#lookalike-domains-input-form', function (e) {
    e.preventDefault();
    if (e.target.checkValidity()) {
      addLookalikeDomainModal.modal('hide');
      const [{ value: value }, { value: watched_resource }, { value: company }] = $(this).serializeArray();
      const domainData = [
        { value, watched_resource, company, source_date: new Date(Date.now()).toISOString().split('T')[0] },
      ];
      addLookalikeDomains(domainData);
      $('#datatable-lookalike-domains').DataTable().ajax.reload();
    }
  });

  // Start of Resources
  // Add/Update Record
  const el = $('#resources-input-modal');
  el.on('submit', '#resources-input-form', async function (e) {
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
    const url = `${urls.watchedResources}${id ? `${id}/` : ''}`;
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
          $('#datatable-resources').DataTable().ajax.reload();
        } else if (response.status === 400) {
          toastr.warning('Resource already exists');
        } else {
          toastr.error(response.statusText);
        }
      })
      .catch((error) => {
        toastr.error(error.message);
      });
  });

  // Add an event listener to the DataTable
  tabsInfo['resources'].datatable.on('click', 'span.cursor-pointer', function () {
    const data = tabsInfo['resources'].datatable.row($(this).parents('tr')).data(),
      fieldNames = resourcesFormFields.map(({ name }) => name),
      elements = fieldNames.map((name) => document.querySelector(`#resources-input-modal [name="${name}"]`));

    elements.forEach((element) => {
      const fieldName = element.getAttribute('name');
      const value = data[fieldName];

      if (fieldName === 'exclude_keywords') {
        let tagify = element.__tagify;
        if (!tagify) {
          tagify = new Tagify(element);
        }
        tagify.removeAllTags();
        tagify.addTags(value);
      } else if (Array.isArray(value)) {
        element.checked = value.includes(element.value);
      } else {
        element.value = value;
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
    const { url, datatable } = tabsInfo[tabName];
    deleteSelectedRowsFromForm(tabName, url, datatable);
  });

  handleDatatableSpanClick(tabsInfo['alerts'].datatable, 'alerts');
  handleDatatableSpanClick(tabsInfo['lookalike-domains'].datatable, 'lookalike-domains');

  let bsValidationForms = document.querySelectorAll('.needs-validation');

  Array.prototype.slice.call(bsValidationForms).forEach(function (form) {
    form.addEventListener(
      'submit',
      function (event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add('was-validated');
      },
      false
    );
  });

  // Enable/disable buttons based on row selection
  $.each($.fn.dataTable.tables(), function (_, table) {
    const dt = $(table).DataTable();
    const button = $(table).parent().find('.btn-toggle');

    dt.on('select deselect draw', () => {
      const selectedRows = dt.rows({ selected: true }).nodes().toArray().length;
      button.prop('disabled', selectedRows === 0);
    });
  });

  const $lookalikeDomainsSearchForm = $('#lookalike-domains-search-form');
  const $alertsSearchForm = $('#alerts-search-form');

  $lookalikeDomainsSearchForm.html(window.generateSearchFormHTML(lookalikeDomainsFilterFormFields));
  $alertsSearchForm.html(window.generateSearchFormHTML(AlertsFormFields));

  const handleFormSubmit = (form, tabKey) => {
    form.submit((e) => {
      e.preventDefault();
      const searchQuery = generateSearchQuery(form);
      const { datatable, url } = tabsInfo[tabKey];
      datatable.ajax.url(`${url}?${searchQuery}`).load();
    });
  };

  handleFormSubmit($lookalikeDomainsSearchForm, 'lookalike-domains');
  handleFormSubmit($alertsSearchForm, 'alerts');

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
  $('#resources-input-form').on('reset', () => setTimeout(handleInputChange, 0));

  let debounceTimeout;
  $('input.dt-input, select.dt-input').on('keyup change', function (e) {
    const form = $(this).closest('form');

    if (!$(e.target).hasClass('active')) {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => form.submit(), 1000);
    }
  });

  new Tagify(document.querySelector('#resource-exclude-keywords'));

  $('#sidebarClose').on('click', function () {
    $('#sidebar').removeClass('show');
  });
});
