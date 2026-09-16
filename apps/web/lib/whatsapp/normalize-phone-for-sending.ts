/**
 * WhatsApp incluye un "9" extra después del código de país (54) en el wa_id
 * de números argentinos que llegan como remitente de un mensaje entrante
 * (ej. 5493876289131). Pero al enviar un mensaje DE VUELTA a ese mismo número,
 * la Graph API espera el formato sin ese 9 (543876289131) — si se lo mandás
 * con el 9, responde 400 (#131030) "Recipient phone number not in allowed
 * list", aunque el número esté correctamente verificado. Es un quirk conocido
 * y documentado de Meta específico de Argentina.
 */
export function normalizePhoneForSending(phone: string): string {
  if (phone.startsWith('549')) {
    return '54' + phone.slice(3);
  }
  return phone;
}
