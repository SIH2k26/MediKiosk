// =============================================================================
// SMS delivery — provider-agnostic OTP dispatch
// =============================================================================
// Select the provider with the SMS_PROVIDER env var:
//   MSG91  — requires MSG91_AUTH_KEY, MSG91_TEMPLATE_ID
//   TWILIO — requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//   MOCK   — default; logs to console (development / demos)
// =============================================================================

export type SmsProvider = 'MSG91' | 'TWILIO' | 'MOCK';

export function getSmsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER || 'MOCK').toUpperCase();
  if (provider === 'MSG91' || provider === 'TWILIO') return provider;
  return 'MOCK';
}

/**
 * Send an OTP to an Indian mobile number (10 digits, without country code).
 * Throws on delivery failure so callers can surface an error to the kiosk.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const provider = getSmsProvider();

  switch (provider) {
    case 'MSG91':
      return sendViaMsg91(phone, otp);
    case 'TWILIO':
      return sendViaTwilio(phone, otp);
    case 'MOCK':
    default:
      // Development fallback — the API also returns the code as devCode
      console.info(`[sms:mock] OTP for +91${phone}: ${otp}`);
      return;
  }
}

// -----------------------------------------------------------------------------
// MSG91 (https://docs.msg91.com/otp) — common choice for Indian numbers
// -----------------------------------------------------------------------------
async function sendViaMsg91(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    throw new Error('MSG91 is not configured: set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID');
  }

  const params = new URLSearchParams({
    template_id: templateId,
    mobile: `91${phone}`,
    otp,
  });

  const response = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
  });

  const result = (await response.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!response.ok || result.type === 'error') {
    throw new Error(`MSG91 SMS delivery failed: ${result.message || response.statusText}`);
  }
}

// -----------------------------------------------------------------------------
// Twilio (https://www.twilio.com/docs/sms)
// -----------------------------------------------------------------------------
async function sendViaTwilio(phone: string, otp: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Twilio is not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER'
    );
  }

  const body = new URLSearchParams({
    To: `+91${phone}`,
    From: fromNumber,
    Body: `${otp} is your MediKiosk verification code. Valid for 5 minutes. Do not share it with anyone.`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Twilio SMS delivery failed: ${result.message || response.statusText}`);
  }
}
