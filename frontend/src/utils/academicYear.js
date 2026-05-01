export function getAcademicYearFromDate(dateInput = new Date()) {
  const date = new Date(dateInput);
  const isValidDate = !Number.isNaN(date.getTime());

  if (!isValidDate) {
    return '';
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 6 ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
}

export function getAcademicYearOptions(count = 5, anchorDate = new Date()) {
  const current = getAcademicYearFromDate(anchorDate);
  const startYear = Number(current.split('-')[0] || new Date().getFullYear());

  return Array.from({ length: count }, (_, idx) => {
    const valueStart = startYear - idx;
    return `${valueStart}-${valueStart + 1}`;
  });
}
