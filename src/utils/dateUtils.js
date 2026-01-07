/**
 * Date utility functions for consistent date formatting across the app
 */

/**
 * Format a Date object or ISO string to dd/mm/yyyy format
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date in dd/mm/yyyy format
 */
export const formatDateToDDMMYYYY = (date) => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Parse dd/mm/yyyy string to Date object
 * @param {string} dateString - Date string in dd/mm/yyyy format
 * @returns {Date|null} Date object or null if invalid
 */
export const parseDDMMYYYY = (dateString) => {
  if (!dateString) return null;

  const parts = dateString.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);

  // Validate that the date is valid
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
};

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
export const formatDateToISO = (date) => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get today's date as a Date object (with time set to midnight)
 * @returns {Date} Today's date at midnight
 */
export const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = getToday();

  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Get relative date string (e.g., "Today", "Yesterday", "3 days ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative date string
 */
export const getRelativeDateString = (date) => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = getToday();
  const diffTime = today.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < -1 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;

  return formatDateToDDMMYYYY(dateObj);
};

/**
 * Calculate difference between two dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
export const daysBetween = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
