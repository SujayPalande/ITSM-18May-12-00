export function formatDate(date: Date | string | null): string {
  if (!date) return 'Never';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return dateObj.toLocaleString();
  } catch (error) {
    return 'Invalid date';
  }
}