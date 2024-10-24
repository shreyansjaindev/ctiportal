const generateFieldHTML = ({
  type,
  id,
  name,
  label,
  hidden,
  required,
  disabled,
  pattern,
  placeholder,
  invalidFeedback,
  options,
  inline,
}) => {
  const labelHTML = label ? `<label class="form-label" for="${id}">${label}</label>` : '';
  const hiddenClass = hidden ? 'd-none' : '';
  const requiredAttr = required ? 'required' : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const patternAttr = pattern ? `pattern="${pattern}"` : '';
  const placeholderAttr = placeholder ? `placeholder="${placeholder}"` : '';
  const inlineClass = inline ? 'form-check-inline' : '';

  const fieldHTML = [];

  switch (type) {
    case 'text':
      fieldHTML.push(`
        <div class="${hiddenClass} col-12 mb-3">
          ${labelHTML}
          <input 
            type="${type}" 
            id="${id}" 
            name="${name}" 
            ${patternAttr} 
            class="form-control" 
            ${placeholderAttr} 
            ${requiredAttr}
          />
          <div class="invalid-feedback">
            ${invalidFeedback || ''}
          </div>
        </div>
      `);
      break;
    case 'select':
      const optionsHTML = options
        ?.map(({ value, displayName }) => `<option value="${value}">${displayName}</option>`)
        .join('');
      fieldHTML.push(`
        <div class="${hiddenClass} col-12 mb-3">
          ${labelHTML}
          <select 
            id="${id}" 
            name="${name}" 
            class="form-select" 
            ${requiredAttr}
          >
            <option selected disabled value="">Select ${label}</option>
            ${optionsHTML}
          </select>
        </div>
      `);
      break;
    case 'checkbox':
      fieldHTML.push(`
        <div class="${hiddenClass} col-12 mb-3">
          ${options
            ?.map(
              ({ value, displayName, checked }, index) => `
            <div class="form-check ${inlineClass}">
              <input class="form-check-input" 
                type="${type}" 
                id="${id}-${index + 1}" 
                name="${name}" 
                value="${value}" 
                ${requiredAttr} 
                ${disabledAttr}
                ${checked ? 'checked' : ''}
              />
              <label class="form-check-label" for="${id}-${index + 1}">${displayName}</label>
            </div>
          `
            )
            .join('')}
        </div>
      `);
      break;
    default:
      throw new Error(`Unsupported field type: ${type}`);
  }

  return fieldHTML.join('');
};

window.generateModalFormHTML = (tabName, formFields = [], formType) => {
  const formFieldsHTML = formFields.map(generateFieldHTML).join('');
  const formTypeClass = formType === 'delete' ? 'delete-form' : 'needs-validation';
  const isConfirmOrDelete = formType === 'confirm' || formType === 'delete';
  const submitButtonText = isConfirmOrDelete ? 'Yes' : 'Submit';
  const discardButtonText = isConfirmOrDelete ? 'No' : 'Discard';

  return `
    <form id="${tabName}-${formType}-form" class="row ${formTypeClass}" novalidate>
      ${formFieldsHTML}
      <div class="col-12 text-center">
        <button type="submit" class="btn btn-primary mt-2 me-1">${submitButtonText}</button>
        <button type="reset" class="btn btn-label-secondary mt-2" data-bs-dismiss="modal" aria-label="Close">${discardButtonText}</button>
      </div>
    </form>
  `;
};

window.generateSearchFormHTML = (formFields = []) => {
  let formHTML = '<div class="row">';

  formFields.forEach((field) => {
    if (field.type === 'text' || field.type === 'date') {
      formHTML += `
                  <div class="col-12 col-sm-4 col-lg-2 mb-6">
                      <label class="form-label">${field.label}</label>
                      <input type="${field.type}" id="${field.id || ''}" class="form-control dt-input" placeholder="${
        field.placeholder
      }" name="${field.name}">
                  </div>
              `;
    } else if (field.type === 'select') {
      formHTML += `
                  <div class="col-12 col-sm-4 col-lg-2 mb-6">
                      <label class="form-label">${field.label}</label>
                      <select class="form-select dt-input" name="${field.name}">
                          ${field.options
                            .map((option) => `<option value="${option.value}">${option.displayName}</option>`)
                            .join('')}
                      </select>
                  </div>
              `;
    }
  });

  formHTML += `</div>`;

  return formHTML;
};
