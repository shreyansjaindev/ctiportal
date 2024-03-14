window.createInputModal = (tabName, title, formFields = []) => {
  const formHTML = window.generateInputFormHTML(tabName, formFields);

  return `
      <div class="modal fade" id="${tabName}s-input-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body px-sm-5 pb-5">
              <div class="text-center">
                <h3 id="${tabName}s-input-modal-title">${title}</h3>
              </div>
              ${formHTML}
            </div>
          </div>
        </div>
      </div>
    `;
};

window.createConfirmationModal = (tabName, title = 'Are you sure?') => `
  <div class="modal fade" id="${tabName}s-confirmation-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body px-sm-5 pb-5">
          <div class="text-center mb-2">
              <h3 class="mb-1">${title}</h3>
          </div>
          <form id="${tabName}s-delete-form" class="row delete-form" novalidate>
            <div class="col-12 text-center">
                <button type="submit" class="btn btn-primary mt-2 me-1 data-bs-dismiss="modal">Yes</button>
                <button type="reset" class="btn btn-outline-secondary mt-2" data-bs-dismiss="modal" aria-label="Close">No</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
    `;

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
                      <div class="row">
                        <div id="${tabName}-detail-content" class="col mb-3"></div>
                        <div id="${tabName}-website-screenshot" class="col-6 mb-3 d-none"><h6 class="mb-0">Website Screenshot</h6></div>
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
                          <button type="submit" class="btn btn-label-primary waves-effect">Add Comment</button>
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
