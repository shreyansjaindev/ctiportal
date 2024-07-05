const expandElementList = [].slice.call(document.querySelectorAll('.card-expand'));

document.addEventListener('click', (event) => {
  const expandElement = event.target.closest('.card-expand');
  if (expandElement) {
    event.preventDefault();
    // Toggle class ti-arrows-maximize & ti-arrows-minimize
    Helpers._toggleClass(expandElement.firstElementChild, 'ti-arrows-maximize', 'ti-arrows-minimize');
    expandElement.closest('.card').classList.toggle('card-fullscreen');
  }
});
