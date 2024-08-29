window.createFormModal = (formType, tabName, title, formFields = [], text = '') => {
  const formHTML = window.generateModalFormHTML(tabName, formFields, formType);
  const textHTML = text ? `<p>${text}</p>` : '';

  return `
    <div class="modal fade" id="${tabName}-${formType}-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body px-sm-5 pb-5">
            <div class="text-center">
              <h4>${title}</h4>
              ${textHTML}
            </div>
            ${formHTML}
          </div>
        </div>
      </div>
    </div>
  `;
};

window.createDetailModal = (tabName) => `
        <div class="modal fade"
             id="${tabName}-detail-modal"
             tabindex="-1"
             aria-hidden="true"
             data-bs-backdrop="static">
            <div class="modal-dialog modal-xl" role="document">
                <div class="modal-content">
                  <form id="${tabName}-detail-form" novalidate>
                    <div class="modal-header">
                      <h5 class="modal-title" id="${tabName}-detail-modal-label"></h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body px-sm-5 pb-5">
                      <div id="${tabName}-detail-content" class="row">
                      </div>
                      <div class="row">
                        <div id="${tabName}-comments" class="col">
                        </div>
                      </div>
                      <div class="row align-items-center g-3">
                        <div class="col-10">
                          <textarea type="text" id="${tabName}-add-comment" class="form-control" style="resize: none"></textarea>
                        </div>
                        <div class="col">
                          <button type="submit" class="btn btn-label-primary">Add Comment</button>
                        </div>
                      </div>
                    </div>
                  </form>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-label-secondary" data-bs-dismiss="modal">Close</button>
                  </div>
                </div>
              </div>
          </div>
    `;
