/**
 * Utility functions for Algerian & International phone number normalization,
 * calling links, WhatsApp click-to-chat URL generation, and display formatting.
 */

/**
 * Formats a raw phone string for display (e.g., "0555123456" -> "0555 12 34 56").
 */
export function formatPhoneDisplay(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.trim();
  if (/^0[567234]\d{8}$/.test(cleaned.replace(/\s+/g, ''))) {
    const raw = cleaned.replace(/\s+/g, '');
    return `${raw.substring(0, 4)} ${raw.substring(4, 6)} ${raw.substring(6, 8)} ${raw.substring(8, 10)}`;
  }
  return cleaned;
}

/**
 * Normalizes phone number for 'tel:' links (e.g., "0555123456" -> "+213555123456").
 */
export function normalizeCallNumber(phone?: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }
  if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 9)) {
    return '+213' + cleaned.substring(1);
  }
  if (cleaned.length === 9 && (cleaned.startsWith('5') || cleaned.startsWith('6') || cleaned.startsWith('7') || cleaned.startsWith('2') || cleaned.startsWith('3') || cleaned.startsWith('4'))) {
    return '+213' + cleaned;
  }
  return '+' + cleaned;
}

/**
 * Normalizes Algerian & International numbers for official WhatsApp URL (wa.me/<number>).
 * Strictly converts local numbers (e.g., 0555123456) to international format (213555123456).
 * NEVER includes the '+' symbol or spaces/hyphens/parentheses.
 */
export function normalizeWhatsAppNumber(phone?: string): string | null {
  if (!phone) return null;
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return null;

  // Handle leading international prefix "00"
  if (cleaned.startsWith('00213')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Handle Algerian local numbers starting with 0 (e.g., 0555123456 -> 213555123456)
  if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 9)) {
    cleaned = '213' + cleaned.substring(1);
  } else if ((cleaned.length === 8 || cleaned.length === 9) && !cleaned.startsWith('213')) {
    cleaned = '213' + cleaned;
  }

  // Valid international number should be between 10 and 15 digits
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }

  return null;
}

/**
 * Generates an official WhatsApp click-to-chat URL with a helpful pre-filled message.
 * URL: https://wa.me/<international_number>?text=<encoded_message>
 */
export function buildWhatsAppUrl(
  phone?: string,
  postTitle?: string,
  lang: 'ar' | 'fr' | 'en' = 'ar'
): string | null {
  const normalizedNumber = normalizeWhatsAppNumber(phone);
  if (!normalizedNumber) return null;

  let message = '';
  if (postTitle && postTitle.trim()) {
    const cleanTitle = postTitle.trim();
    if (lang === 'fr') {
      message = `Bonjour, j'ai vu votre annonce sur WIN DZ concernant : "${cleanTitle}". Est-ce toujours disponible ? Merci.`;
    } else if (lang === 'en') {
      message = `Hello, I saw your listing on WIN DZ regarding: "${cleanTitle}". Is it still available? Thank you.`;
    } else {
      message = `السلام عليكم، وجدت إعلانكم على منصة WIN DZ بخصوص: "${cleanTitle}". هل ما زال متوفراً؟ شكراً.`;
    }
  } else {
    if (lang === 'fr') {
      message = `Bonjour, je vous contacte concernant vos خدمات/إعلانات sur WIN DZ. Merci.`;
    } else if (lang === 'en') {
      message = `Hello, I am contacting you regarding your listings on WIN DZ. Thank you.`;
    } else {
      message = `السلام عليكم، تواصلت معكم بخصوص إعلاناتكم على منصة WIN DZ. شكراً.`;
    }
  }

  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalizedNumber}?text=${encodedText}`;
}
