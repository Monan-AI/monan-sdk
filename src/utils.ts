export function maskPII(text: string): string {
  // Mask emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  // Mask CPF (simple format) or phone numbers
  const phoneRegex = /\b\d{10,11}\b|\b\(\d{2}\)\s\d{4,5}-\d{4}\b/g;

  return text
    .replace(emailRegex, '[EMAIL REDACTED]')
    .replace(phoneRegex, '[PHONE REDACTED]');
}