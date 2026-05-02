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

export function getAcademicYearOptions(count = 5, anchorDate = new Date(), minStartYear = 2010) {
  // Returns academic year strings from the current academic year down to minStartYear
  const current = getAcademicYearFromDate(anchorDate);
  const startYear = Number(current.split('-')[0] || new Date().getFullYear());

  const end = Math.max(minStartYear, 1900);
  const years = [];
  for (let y = startYear; y >= end; y--) {
    years.push(`${y}-${y + 1}`);
    if (count && years.length >= count && minStartYear === 2010) {
      // If count provided and default minStartYear used, respect count as upper limit
      break;
    }
  }

  // If a specific minStartYear was provided (other than default), generate full range
  if (minStartYear !== 2010) {
    const full = [];
    for (let y = startYear; y >= minStartYear; y--) {
      full.push(`${y}-${y + 1}`);
    }
    return full;
  }

  return years;
}
