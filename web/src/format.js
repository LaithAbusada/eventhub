// How dates and prices look everywhere in the app

export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatPrice(price) {
  if (price === 0) {
    return 'Free';
  }
  return `${price} JOD`;
}
