/**
 * Phone Number Utilities
 * 
 * Functions for formatting and validating UK phone numbers to match seed data format
 */

/**
 * Format UK phone number for display
 * Converts various input formats to consistent display format: +44 7xxx xxx xxx
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle different input formats
  let formattedPhone = '';
  
  if (digitsOnly.startsWith('447')) {
    // +447xxxxxxxxx format
    const number = digitsOnly.slice(3);
    formattedPhone = `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
  } else if (digitsOnly.startsWith('07')) {
    // 07xxxxxxxxx format (UK mobile)
    const number = digitsOnly.slice(1);
    formattedPhone = `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
  } else if (digitsOnly.startsWith('44')) {
    // 447xxxxxxxxx format (without +)
    const number = digitsOnly.slice(2);
    formattedPhone = `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    // 01xxxxxxxxx or 02xxxxxxxxx format (UK landline)
    const areaCode = digitsOnly.slice(0, 4);
    const number = digitsOnly.slice(4);
    formattedPhone = `+44 ${areaCode.slice(1)} ${number.slice(0, 3)} ${number.slice(3)}`;
  } else if (digitsOnly.length === 10) {
    // 7xxxxxxxxx format (mobile without 0 or country code)
    formattedPhone = `+44 ${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
  } else {
    // Return original if can't format
    return phone;
  }
  
  // Clean up any extra spaces
  return formattedPhone.replace(/\s+/g, ' ').trim();
};

/**
 * Format phone number as user types (real-time formatting)
 * @param {string} input - Current input value
 * @returns {string} Formatted input
 */
export const formatPhoneInput = (input) => {
  if (!input) return '';
  
  // Remove all non-digit characters except + at the start
  let cleaned = input.replace(/[^\d+]/g, '');
  
  // If starts with +44, format as UK number
  if (cleaned.startsWith('+44') || cleaned.startsWith('44')) {
    const hasPlus = cleaned.startsWith('+');
    const digits = cleaned.replace(/\D/g, '');
    
    if (digits.length <= 2) {
      return hasPlus ? '+44' : '44';
    } else if (digits.length <= 6) {
      const countryCode = hasPlus ? '+44' : '44';
      const number = digits.slice(2);
      return `${countryCode} ${number}`;
    } else if (digits.length <= 9) {
      const countryCode = hasPlus ? '+44' : '44';
      const number = digits.slice(2);
      return `${countryCode} ${number.slice(0, 4)} ${number.slice(4)}`;
    } else {
      const countryCode = hasPlus ? '+44' : '44';
      const number = digits.slice(2);
      return `${countryCode} ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7, 10)}`;
    }
  }
  
  // If starts with 0 (UK format), allow it
  if (cleaned.startsWith('0')) {
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
    }
  }
  
  // Default formatting for other numbers
  return cleaned.slice(0, 15); // Limit length
};

/**
 * Clean phone number for storage (remove formatting)
 * @param {string} phone - Formatted phone number
 * @returns {string} Clean phone number for API/storage
 */
export const cleanPhoneForStorage = (phone) => {
  if (!phone) return '';
  
  // For UK numbers, ensure they start with +44
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.startsWith('447')) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.startsWith('07')) {
    return `+44${digitsOnly.slice(1)}`;
  } else if (digitsOnly.startsWith('44')) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `+44${digitsOnly.slice(1)}`;
  } else if (digitsOnly.length === 10) {
    return `+44${digitsOnly}`;
  }
  
  // Return formatted version if already looks good
  return formatPhoneForDisplay(phone);
};

/**
 * Validate UK phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid UK phone number
 */
export const isValidUKPhone = (phone) => {
  if (!phone) return false;
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // UK mobile: 07xxxxxxxxx (11 digits total) or +447xxxxxxxxx (13 digits total)
  // UK landline: Various formats
  return (
    // Mobile formats
    (digitsOnly.length === 11 && digitsOnly.startsWith('07')) ||
    (digitsOnly.length === 13 && digitsOnly.startsWith('447')) ||
    // Landline formats (simplified)
    (digitsOnly.length === 11 && (digitsOnly.startsWith('01') || digitsOnly.startsWith('02')))
  );
};