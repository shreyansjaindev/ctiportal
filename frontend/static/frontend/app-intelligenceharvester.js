const queryPreviewThreshold = 15;

const baseUrls = {
  anomali: 'https://ui.threatstream.com',
  alienvault: 'https://otx.alienvault.com',
  talos: 'https://talosintelligence.com',
  securitytrails: 'https://securitytrails.com',
  ctlsearch: 'https://crt.sh',
  spur: 'https://spur.us',
};

const generateSVGIcon = (cursorPointer, textClass, checked) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${textClass} ${
    cursorPointer ? 'cursor-pointer' : ''
  }">
    <circle cx="12" cy="12" r="10" visibility="${checked ? 'hidden' : 'visible'}"></circle>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" visibility=${checked ? 'visible' : ''}></path>
    <polyline points="22 4 12 14.01 9 11.01" visibility=${checked ? 'visible' : 'hidden'}></polyline>
  </svg>`;
};

const createAdditionalLinks = (type, value) => {
  let additional_links = {};

  switch (type) {
    case 'domain':
      additional_links = {
        anomali: `${baseUrls.anomali}/${type}/${value}`,
        alienvault: `${baseUrls.alienvault}/indicator/${type}/${value}`,
        talos: `${baseUrls.talos}/lookup?search=${value}`,
        securitytrails: `${baseUrls.securitytrails}/${type}/${value}`,
        ctlsearch: `${baseUrls.ctlsearch}/?q=${value}`,
      };
      break;
    case 'url':
    case 'email':
      additional_links = {
        anomali: `${baseUrls.anomali}/${type}/${value}`,
        alienvault: `${baseUrls.alienvault}/indicator/${type}/${value}`,
      };
      break;
    case 'ipv4':
    case 'ipv6':
      additional_links = {
        anomali: `${baseUrls.anomali}/ip/${value}`,
        alienvault: `${baseUrls.alienvault}/indicator/ip/${value}`,
        talos: `${baseUrls.talos}/lookup?search=${value}`,
        securitytrails: `${baseUrls.securitytrails}/list/ip/${value}`,
        spur: `${baseUrls.spur}/context/${value}`,
      };
      break;
    case 'md5':
    case 'sha1':
    case 'sha256':
    case 'sha512':
      additional_links = {
        anomali: `${baseUrls.anomali}/hash/${value}`,
        alienvault: `${baseUrls.alienvault}/indicator/file/${value}`,
      };
      break;
    case 'cve':
      additional_links = {
        anomali: `${baseUrls.anomali}/search?status=active&multiSearchResults=true&value__re=.*${value}.*`,
      };
      break;
    default:
      additional_links = {
        anomali: `${baseUrls.anomali}/${type}/${value}`,
      };
      break;
  }

  return additional_links;
};

const appendAdditionalLinks = (id, additional_links) => {
  $.each(additional_links, (key, value) => {
    const html = `
      <a href="${value}" class="btn btn-white mb-1 me-2 p-2 border shadow-sm rounded-circle" target="_blank" data-bs-toggle="tooltip" data-bs-placement="top" title="${
      additionalSources[key]
    }">
        <img src="${staticLocation + key}.png" class="custom-icon cursor-pointer" alt="${additionalSources[key]}" />
      </a>
    `;
    $(`#additional-links-${id}`).append(html);
  });
};

const createItemElement = (id, value) => `
  <div id="source-${id}" class="item mt-4">
    <div class="row item-heading mb-4"> 
      <div class= "col-12"> 
        <div class="card"> 
          <div class="card-body p-2"> 
            <div class="row"> 
              <div class="col-12 text-center"> 
                <h5 class="card-title mb-0">${value}</h5>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="row-item-${id}" class="row">
    </div>
  </div>
`;

const createCardElement = (id, check, sourcesInfo, reloadIcon) => `
  <div class="col-lg-4 col-12 mb-4">
    <div class="card card-action">
      <div class="card-header">
        <h4 class="card-action-title">${sourcesInfo[check].title}</h4>
        <div class="card-action-element">
          <ul id="${check}-${id}-card-action-element" class="list-inline mb-0">
            <li class="list-inline-item"><a href="javascript:void(0);" class="card-reload">${reloadIcon}</a></li>
            <li class="list-inline-item">
              <a href="javascript:void(0);" class="card-expand"><i class="tf-icons ti ti-arrows-maximize ti-sm"></i></a>
            </li>
          </ul>
        </div>
      </div>
      <div id="${check}-${id}" class="card-body">
        <div id="${check}-${id}-spinner" class="d-flex justify-content-center my-1">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  </div>
`;

const createHostioHtml = (temp_data) => {
  return Object.entries(temp_data)
    .filter(([_, value]) => value)
    .map(([key, value]) => {
      const entries = value.map((v) => `${v.value} (${v.count} Domains)<br>`).join('');
      let formattedKey = key.replace(/_/g, ' ').toUpperCase();
      return `<b>${formattedKey}</b><br>${entries}<br>`;
    })
    .join('');
};

const createWebsiteStatusHtml = (temp_data) => {
  const listItems = temp_data.websitestatus
    .reverse()
    .map(([url, status_code], index) => {
      const temp_status = index === 0 ? (url === 'Error' ? 'danger' : 'success') : 'primary';
      const additionalClass = index === temp_data.websitestatus.length - 1 ? 'border-transparent' : '';
      return `
      <li class="timeline-item timeline-item-transparent ${additionalClass}">
        <span class="timeline-point timeline-point-${temp_status}"></span>
        <div class="timeline-event">
          <div class="timeline-header mb-sm-0 mb-3">
            <h6 class="mb-0">${url}</h6>
          </div>
          <p class="text-muted">${status_code}</p>
        </div>
      </li>`;
    })
    .join('');

  return `<ul class="timeline">${listItems}</ul>`;
};

const createObjectHtml = (temp_check, temp_data) => {
  const formatEntry = (key, value) => {
    let formattedValue = value;

    if (typeof value === 'object') {
      formattedValue = Array.isArray(value)
        ? value.join('<br>')
        : Object.entries(value)
            .map(([k, v]) => `${k}: ${v}<br>`)
            .join('');
    }

    let formattedKey = key.replace(/_/g, ' ').toUpperCase();

    return `<b>${formattedKey}</b><br>${formattedValue}<br><br>`;
  };

  return Object.entries(temp_data)
    .filter(([key]) => temp_check !== 'ibm' || key !== 'URL')
    .map(([key, value]) => formatEntry(key, value))
    .join('');
};

$(document).ready(function () {
  const circleIcon = generateSVGIcon(true, '', false);
  const mutedCircleIcon = generateSVGIcon(false, 'text-muted', false);
  const checkedCircleIcon = generateSVGIcon(true, 'text-success', true);
  const reloadIcon = '<i class="tf-icons ti ti-rotate-clockwise-2 scaleX-n1-rtl ti-sm"></i>';
  const removeIcon = '<i class="ti ti-x ti-sm text-danger cursor-pointer"></i>';
  localStorage.setItem('vOneLocalStorage', JSON.stringify({}));
  let idCounter = 0;

  // To add new todo list item
  const $formAddTodo = $('#form-add-todo');
  $formAddTodo.on('submit', function (e) {
    e.preventDefault();

    const queryString = $('.new-todo-item-title').val().trim();

    if (queryString) {
      const localStorageData = JSON.parse(localStorage.getItem('vOneLocalStorage')) ?? {};
      const tempList = new Set(Object.values(localStorageData).map((item) => item.value ?? ''));

      // Check for duplicates and filter the queryStringList
      const queryStringList = queryString.split(/[ ,]+/).filter((item) => !tempList.has(item));

      if (queryStringList.length) {
        fetch('/api/intelligence-harvester/identifier/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRFToken,
          },
          body: JSON.stringify({ data: queryStringList }),
        })
          .then((response) => response.json())
          .then((response) => {
            $('#todo-table').removeClass('d-none');
            let todoData = JSON.parse(localStorage.getItem('vOneLocalStorage'));
            const queryList = response.query_list;

            for (let i = 0; i < queryList.length; i++) {
              const { value, type } = queryList[i];

              if (value != '') {
                const trId = idCounter++;
                todoData[trId] = { value, type };

                let middle = [];
                const todoDataLength = Object.keys(todoData).length;
                const isBulk = todoDataLength > queryPreviewThreshold;

                const start = `
                    <tr id="todo-item-${trId}" class="todo-item" style="animation-delay: 0s;">
                        <td class="todo-item-id" hidden>#${trId}</td>
                        <td class="todo-item-search"><span class="checkbox-wrapper"><input type="checkbox" name="search-list" value="search" class="item-${trId}" hidden checked></input>${checkedCircleIcon}</span></td>
                        <td class="todo-item-value" style="min-width: 15ch; max-width: 40ch;">${
                          isBulk ? `${todoDataLength} Queries` : value
                        }</td>
                        <td class="todo-item-type" hidden>${isBulk ? 'bulk' : type}</td>
                  `;

                if (!isBulk) {
                  middle = Object.entries(sourcesInfo).map(([source, info]) => {
                    const checkboxEnabled = info.supported_types.includes(type) ? '' : 'disabled';
                    const checkboxSvg = checkboxEnabled ? mutedCircleIcon : circleIcon;
                    return `<td class="todo-item-${source}">
                                    <span class="checkbox-wrapper">
                                      <input type="checkbox" name="${source}-list" value="${source}" class="item-${trId}" hidden ${checkboxEnabled}></input>${checkboxSvg}
                                    </span>
                                  </td>`;
                  });
                } else {
                  $('.todo-item').remove();
                  middle = Object.entries(sourcesInfo).map(([source, info]) => {
                    return `<td class="todo-item-${source}">
                                    <span class="checkbox-wrapper">
                                      <input type="checkbox" name="${source}-list" value="${source}" class="item-${trId}" hidden></input>${circleIcon}
                                    </span>
                                  </td>`;
                  });

                  $('#search-btn').prop('disabled', true);
                  $('#export-btn').removeClass('btn-outline-primary').addClass('btn-primary');
                }

                end = `
                      <td class="todo-item-delete"><a>${removeIcon}</a></td>
                    </tr>
                  </div>`;

                $('.todo-task-list-wrapper').append(start + middle + end);
              }
            }
            localStorage.setItem('vOneLocalStorage', JSON.stringify(todoData));
          })
          .catch((error) => console.error('Error:', error));
      }
    }
    $formAddTodo[0].reset();
  });

  const todoTaskHeadWrapper = $('.todo-task-head-wrapper');

  todoTaskHeadWrapper.on('click', '.checkbox-wrapper', function () {
    checkbox(this, 'header');
  });

  $('.todo-task-list-wrapper').on('click', '.checkbox-wrapper', function () {
    checkbox(this, 'list');
  });

  todoTaskHeadWrapper.on('click', '.delete-selected', function () {
    $('.todo-item')
      .filter(':has(input:checked)')
      .each(function () {
        $(this).find('.todo-item-delete').click();
      });
  });

  function toggleCheckbox(element, check) {
    element.toggleClass('text-success', check);
    element.children('circle').attr('visibility', check ? 'hidden' : 'visible');
    element.children('path, polyline').attr('visibility', check ? 'visible' : 'hidden');
  }

  function checkbox(element, type) {
    const $input = $(element).find('input');
    const $svg = $(element).find('svg');

    if (!$input.prop('disabled')) {
      if (type == 'header') {
        const checkbox_head_name = $input.prop('name');
        const checkbox_head_source = checkbox_head_name.replace('-head', '');
        const $search_list_checkboxes = $('input[name="search-list"]');
        const $search_head_checkbox = $('input[name="search-head"]');

        if (checkbox_head_name == 'search-head') {
          const check = !$search_head_checkbox.prop('checked');

          toggleCheckbox($svg, check);

          $search_head_checkbox.prop('checked', check);
          $search_list_checkboxes.prop('checked', check);

          toggleCheckbox($search_list_checkboxes.next(), check);
        } else {
          const check = !$input.prop('checked');
          $input.prop('checked', check);

          $(`input[value="${checkbox_head_source}"]:not(:disabled)`).each(function () {
            $(this).prop('checked', check);
            toggleCheckbox($(this).next(), check);
          });
        }
      } else if (type == 'list') {
        const checkbox_list_name = $input.prop('name');
        const checkbox_list_source = checkbox_list_name.replace('-list', '');

        if ($input.prop('name') == 'search-list') {
          const check = !$input.prop('checked');

          toggleCheckbox($svg, check);
          $input.prop('checked', check);

          const uncheckedCheckboxes = $('input[name="search-list"]').not(':checked');
          const temp = uncheckedCheckboxes.length === 0;
          const $search_head_checkbox = $('input[name="search-head"]');

          $search_head_checkbox.prop('checked', temp);
          toggleCheckbox($search_head_checkbox.next(), temp);
        } else {
          const check = !$input.prop('checked');

          toggleCheckbox($svg, check);
          $input.prop('checked', check);

          const uncheckedCheckboxes = $(`input[value="${checkbox_list_source}"]`).not(':checked');

          $(`input[name="${checkbox_list_source}-head"]`).prop('checked', uncheckedCheckboxes.length === 0);
        }
      }
    }
  }

  $('#export-btn').on('click', (e) => {
    e.preventDefault();

    const todoData = JSON.parse(localStorage.getItem('vOneLocalStorage'));
    const todoDataLength = Object.keys(todoData).length;
    const id = '0';
    let data = [];
    let checklist = [];
    if (todoDataLength <= queryPreviewThreshold) {
      $.each(todoData, (index, query) => {
        checklist = [];
        $(`#todo-item-${index} input:checked`).each(function () {
          if (this.value != 'search') {
            checklist.push(this.value);
          }
        });
        const indicator = {
          id: id,
          value: query.value,
          type: query.type,
          checklist: checklist,
        };
        data.push(indicator);
      });
    } else {
      $(`.todo-item input:checked`).each(function () {
        if (this.value != 'search') {
          checklist.push(this.value);
        }
      });
      $.each(todoData, (index, query) => {
        const indicator = {
          id: id,
          value: query.value,
          type: query.type,
          checklist: checklist,
        };
        data.push(indicator);
      });
    }

    fetch('/api/intelligence-harvester/search/', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRFToken,
      },
      body: JSON.stringify({
        data: data, // include indicators array in the body
      }),
    })
      .then((response) => response.blob())
      .then((blob) => {
        // Create a new object URL
        const url = window.URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:]/g, '-');

        // Create a link and click it to start the download
        const link = document.createElement('a');
        link.href = url;
        link.download = `intelligence_harvester_export_${timestamp}.xlsx`;
        document.body.appendChild(link);
        link.click();

        // After the download, remove the link from the body
        document.body.removeChild(link);
      })
      .catch((error) => console.error('Error:', error));
  });

  $('#search-btn').on('click', function (e) {
    e.preventDefault();

    $('.item').remove();

    let data = [];

    $('.todo-item').each(function () {
      const $this = $(this);

      const id = $this.find('.todo-item-id').text().replace('#', '');
      const value = $this.find('.todo-item-value').text();
      const type = $this.find('.todo-item-type').text().toLocaleLowerCase();
      const $temp_element = $this.find(`input[class="item-${id}"]:checked`);
      const checklist = $temp_element
        .toArray()
        .map((item) => item.value)
        .filter((item) => item !== 'search');

      $('#todo-table').append(createItemElement(id, value));

      if (checklist.length) {
        const element = `#row-item-${id}`;

        for (i = 0; i < checklist.length; i++) {
          let check = checklist[i];
          $(element).append(createCardElement(id, check, sourcesInfo, reloadIcon));
        }

        const indicator = {
          id: id,
          value: value,
          type: type,
          checklist: checklist,
        };
        data.push(indicator);
      }
    });

    fetch('/api/intelligence-harvester/search/', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRFToken,
      },
      body: JSON.stringify({
        data: data,
      }),
    })
      .then((response) => response.json())
      .then((response) => {
        response_data = response.data;

        $.each(response_data, function (value, data) {
          const id = data.id;
          const value_type = data.value_type;

          $.each(data.source_data, function (source, source_data) {
            const temp_check = source;
            const external_link = source_data.external_link;
            const temp_data = source_data.results;
            const temp_id = `#${temp_check}-${id}`;

            // Remove Spinner
            document.querySelector(temp_id + '-spinner').remove();

            if (external_link) {
              document
                .querySelector(`${temp_id}-card-action-element`)
                .insertAdjacentHTML(
                  'afterbegin',
                  `<li class="list-inline-item"><a href="${external_link}" target="_blank"><span class="tf-icons ti ti-external-link"></span></a></li>`
                );
            }

            let temp_html = 'No information was found';

            if (temp_data) {
              switch (temp_check) {
                case 'hostio':
                  temp_html = createHostioHtml(temp_data);
                  break;
                case 'screenshot':
                  temp_html = `<img class="img-fluid card-img-top rounded-sm" src="data:image/png;base64,${temp_data}" />`;
                  break;
                case 'websitestatus':
                  temp_html = createWebsiteStatusHtml(temp_data);
                  break;
                default:
                  temp_html =
                    typeof temp_data === 'object'
                      ? createObjectHtml(temp_check, temp_data)
                      : temp_data.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join('<br>');
              }
            }

            if (temp_html.endsWith('<br><br>')) {
              temp_html = temp_html.slice(0, -8);
            }
            document.querySelector(temp_id).insertAdjacentHTML('beforeend', temp_html);
          });

          $(`#row-item-${id}`).append(`
              <div class="col-lg-4 col-12">
                <div class="card card-action">
                  <div class="card-header">
                    <h4 class="card-action-title">Additional Links</h4>
                  </div>
                  <div id="additional-links-${id}" class="card-body"></div>
                </div>
              </div>
            `);

          const additional_links = createAdditionalLinks(value_type, value);
          appendAdditionalLinks(id, additional_links);
        });
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  });
});

$(function () {
  'use strict';

  // EVENT DELETION
  $(document).on('click', '.todo-item-delete', function (e) {
    const item = $(e.currentTarget);
    e.stopPropagation();
    const todoItem = item.closest('.todo-item');
    const todoType = todoItem.find('.todo-item-type');

    todoItem.remove();
    const id = item.parent().attr('id').replace('todo-item-', '');
    $(`#source-${id}`).remove();

    let todo_data = JSON.parse(localStorage.getItem('vOneLocalStorage'));
    if (todoType.text() == 'bulk') {
      todo_data = {};
    } else {
      delete todo_data[id];
    }
    localStorage.setItem('vOneLocalStorage', JSON.stringify(todo_data));

    if ($('.todo-item').length < 1) {
      $('#todo-table').addClass('d-none');
      $('.row.item').remove();
    }
  });

  // Complete task strike through
  $(document).on('click', '.todo-item input', function (e) {
    e.stopPropagation();
    $(this).closest('.todo-item').toggleClass('completed');
  });
});

$(window).on('resize', () => {
  // remove show classes from sidebar and overlay if size is > 992
  const { width } = $(window);
  if (width > 992) {
    const appContentOverlay = $('.app-content .app-content-overlay');
    if (appContentOverlay.hasClass('show')) {
      $('.app-content .sidebar-left').removeClass('show');
      appContentOverlay.removeClass('show');
    }
  }
});
