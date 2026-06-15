-- Add a distinct WhatsApp contact for loan repayment reminders.
-- Falls back to "phone" when null. Captured at loan apply time.
ALTER TABLE "User" ADD COLUMN "whatsappNumber" TEXT;
