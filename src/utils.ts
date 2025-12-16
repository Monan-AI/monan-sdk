export function maskPII(text: string): string {
  let masked = text;

  // 1. CPF - Format: 123.456.789-00 or 12345678900
  masked = masked.replace(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g, '[CPF REDACTED]');

  // 2. CNPJ - Format: 12.345.678/0001-90
  masked = masked.replace(/\b(\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2})\b/g, '[CNPJ REDACTED]');

  // 3. RG - Format: 12.345.678-9
  masked = masked.replace(/\b(\d{1,2}\.?\d{3}\.?\d{3}-?\d{1})\b/g, '[RG REDACTED]');

  // 4. Passaport - Format: AB123456 or A12345678
  masked = masked.replace(/\b([A-Z]{1,2}\d{6,8})\b/g, '[PASSPORT REDACTED]');

  // 5. CNH - Format: 16 digits
  masked = masked.replace(/\b(\d{11}\d{5})\b/g, '[CNH REDACTED]');

  // 6. Data de Nascimento - Format: DD/MM/YYYY or DD-MM-YYYY
  masked = masked.replace(/\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)?\d{2}\b/g, '[DATE OF BIRTH REDACTED]');

  // 7. CEP - Format: 00000-000 or 00000000
  masked = masked.replace(/\b(\d{5}-?\d{3})\b/g, '[CEP REDACTED]');

  // 8. Email
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]');

  // 9. Telefone - Format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX or +55 (XX) XXXXX-XXXX
  masked = masked.replace(/\b(\+55\s?)?(\(\d{2}\)\s?|\d{2}\s?)(\d{4,5})[.\s-]?(\d{4})\b/g, '[PHONE REDACTED]');

  // 10. WhatsApp (same as phone)
  masked = masked.replace(/\b\+55\s?\(?(\d{2})\)?\s?9?\d{4,5}[.\s-]?\d{4}\b/g, '[WHATSAPP REDACTED]');

  // 11. Número de Cartão de Crédito - Format: XXXX XXXX XXXX XXXX
  masked = masked.replace(/\b(?:\d{4}[\s\-]?){3}\d{4}\b/g, '[CREDIT CARD REDACTED]');

  // 12. CVV/CVC - Format: 3-4 digits isolated
  masked = masked.replace(/\b(CVV|CVC)\s*:\s*\d{3,4}\b/gi, '[CVV REDACTED]');

  // 13. Validade de Cartão - Format: MM/YY
  masked = masked.replace(/\b(0[1-9]|1[0-2])\/\d{2}\b/g, '[CARD EXPIRY REDACTED]');

  // 14. Número de Conta Bancária - 8-17 digits
  masked = masked.replace(/\b(conta|account)\s*:?\s*(\d{8,17})\b/gi, '[ACCOUNT NUMBER REDACTED]');

  // 15. Agência Bancária - Format: 4-5 digits
  masked = masked.replace(/\b(agência|agency)\s*:?\s*(\d{4,5})\b/gi, '[AGENCY REDACTED]');

  // 16. IBAN
  masked = masked.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g, '[IBAN REDACTED]');

  // 17. Chave PIX
  masked = masked.replace(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi, '[PIX KEY REDACTED]');

  // 18. SWIFT Code - Format: XXXXXX[XX][XXX]
  masked = masked.replace(/\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g, '[SWIFT CODE REDACTED]');

  // 19. Número de Boleto - 47 digits
  masked = masked.replace(/\b(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d{1}\s+\d{14})\b/g, '[BOLETO NUMBER REDACTED]');

  // 20. Número de NFe (Nota Fiscal Eletrônica) - 44 digits
  masked = masked.replace(/\b(\d{44})\b/g, '[NFE NUMBER REDACTED]');

  // 21. Senhas - palavras-chave comuns
  masked = masked.replace(/\b(password|senha|pass|pwd)\s*[:=]\s*([^\s\n]+)/gi, '[PASSWORD REDACTED]');

  // 22. Tokens de autenticação
  masked = masked.replace(/\b(token|authorization|bearer)\s*[:=]\s*([^\s\n]+)/gi, '[TOKEN REDACTED]');

  // 23. JWT Tokens
  masked = masked.replace(/\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, '[JWT REDACTED]');

  // 24. API Keys - padrão comum
  masked = masked.replace(/\b(api[_-]?key|apikey)\s*[:=]\s*([a-zA-Z0-9_-]{20,})/gi, '[API KEY REDACTED]');

  // 25. Chaves SSH privadas
  masked = masked.replace(/-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |DSA |EC )?PRIVATE KEY-----/g, '[SSH PRIVATE KEY REDACTED]');

  // 26. Certificados SSL/TLS
  masked = masked.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, '[SSL CERTIFICATE REDACTED]');

  // 27. OAuth Tokens
  masked = masked.replace(/\b(oauth[_-]?token|access[_-]?token)\s*[:=]\s*([^\s\n]+)/gi, '[OAUTH TOKEN REDACTED]');

  // 28. Refresh Tokens
  masked = masked.replace(/\b(refresh[_-]?token)\s*[:=]\s*([^\s\n]+)/gi, '[REFRESH TOKEN REDACTED]');

  // 29. Session IDs
  masked = masked.replace(/\b(session[_-]?id|sessionid|sid)\s*[:=]\s*([a-zA-Z0-9_-]{20,})/gi, '[SESSION ID REDACTED]');

  // 30. Cookies de autenticação
  masked = masked.replace(/\b(cookie|set-cookie)\s*[:=]\s*([^\n;]+)/gi, '[COOKIE REDACTED]');

  // 31. Senhas WiFi
  masked = masked.replace(/\b(wifi[_-]?password|wpa[_-]?password|ssid|network[_-]?password)\s*[:=]\s*([^\s\n]+)/gi, '[WIFI PASSWORD REDACTED]');

  // 32. AWS Keys (formato: AKIA + 16 caracteres)
  masked = masked.replace(/\b(AKIA[0-9A-Z]{16})\b/g, '[AWS ACCESS KEY REDACTED]');

  // 33. AWS Secret Keys
  masked = masked.replace(/\b(aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*([^\s\n]+)/gi, '[AWS SECRET REDACTED]');

  // 34. GitHub Tokens
  masked = masked.replace(/\b(ghp_[a-zA-Z0-9_]{36}|ghu_[a-zA-Z0-9_]{36}|ghs_[a-zA-Z0-9_]{36})\b/g, '[GITHUB TOKEN REDACTED]');

  // 35. GitLab Tokens
  masked = masked.replace(/\b(glpat-[a-zA-Z0-9_-]+)\b/g, '[GITLAB TOKEN REDACTED]');

  // 36. Credentials (generic username:password)
  masked = masked.replace(/\b([a-zA-Z0-9._%+-]+)[:=]([^\s\n]+)(?=\s*(?:user|login|auth|account))/gi, '[CREDENTIALS REDACTED]');

  // 37. Cartão de Vacina - padrões comuns
  masked = masked.replace(/\b(cartão de vacina|vaccination card|comprovante de vacinação)\s*[:=]?\s*([^\n]+)/gi, '[VACCINATION CARD REDACTED]');

  // 38. Número de Paciente
  masked = masked.replace(/\b(paciente|patient|patient[_-]?id|patient[_-]?number)\s*[:=]\s*(\d{6,12})\b/gi, '[PATIENT NUMBER REDACTED]');

  // 39. Diagnóstico Médico
  masked = masked.replace(/\b(diagnóstico|diagnosis|diagnose)\s*[:=]?\s*([^\n]+)/gi, '[DIAGNOSIS REDACTED]');

  // 40. Prescrição Médica
  masked = masked.replace(/\b(prescrição|prescription|medicamentos|medications)\s*[:=]?\s*([^\n]+)/gi, '[PRESCRIPTION REDACTED]');

  // 41. Prontuário Eletrônico
  masked = masked.replace(/\b(prontuário|medical record|health record)\s*[:=]?\s*([^\n]+)/gi, '[MEDICAL RECORD REDACTED]');

  // 42. Dados de Seguro Saúde
  masked = masked.replace(/\b(seguro saúde|health insurance|insurance[_-]?id|policy[_-]?number)\s*[:=]\s*([^\s\n]+)/gi, '[INSURANCE REDACTED]');

  // 43. Impressão Digital (padrão hexadecimal de fingerprint)
  masked = masked.replace(/\b([a-f0-9]{40}|[a-f0-9]{64})\b/g, '[FINGERPRINT REDACTED]');

  // 44. Reconhecimento Facial (dados codificados)
  masked = masked.replace(/\b(facial[_-]?encoding|face[_-]?data|facial[_-]?recognition)\s*[:=]\s*([^\n]+)/gi, '[FACIAL DATA REDACTED]');

  // 45. Dados de Iris/Retina
  masked = masked.replace(/\b(iris[_-]?data|retina[_-]?data|biometric[_-]?data)\s*[:=]\s*([^\n]+)/gi, '[BIOMETRIC DATA REDACTED]');

  // 46. Número de Nacionalidade/ID estrangeiro
  masked = masked.replace(/\b(driver[_-]?license|license[_-]?number)\s*[:=]\s*(\d{8,15})\b/gi, '[LICENSE REDACTED]');

  // 47. Coordenadas GPS (localização exata)
  masked = masked.replace(/\b(-?\d{1,3}\.\d{6,})[,\s]+(-?\d{1,3}\.\d{6,})\b/g, '[GPS COORDINATES REDACTED]');

  // 48. Endereço IP Privado e Público
  masked = masked.replace(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, '[IP ADDRESS REDACTED]');

  // 49. URLs com credenciais (http://user:pass@host)
  masked = masked.replace(/https?:\/\/[^:]+:[^@]+@[^\s]+/gi, '[URL WITH CREDENTIALS REDACTED]');

  // 50. Número de Registro Profissional (CRM, OAB, etc)
  masked = masked.replace(/\b(CRM|OAB|CREF|CFA)[\/\s]?(\d{4,7})\b/gi, '[PROFESSIONAL LICENSE REDACTED]');

  return masked;
}