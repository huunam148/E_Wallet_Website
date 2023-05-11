const getDatePickerTitle = (elem) => {
  const label = elem.nextElementSibling;
  let titleText = '';
  if (label && label.tagName === 'LABEL') {
    titleText = label.textContent;
  } else {
    titleText = elem.getAttribute('aria-label') || '';
  }
  return titleText;
};

const birthdayInput = document.getElementById('birthday');
const datepicker = new Datepicker(birthdayInput, {
  format: 'dd/mm/yyyy',
  title: getDatePickerTitle(birthdayInput),
});
