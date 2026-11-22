p = 'backend/services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
old = """const sendAdminNotification = async (message) => {
  try {
    const { default: whatsappService } = await import('./whatsappService.js');
    if (whatsappService && typeof whatsappService.sendAdminNotification === 'function') {
      await whatsappService.sendAdminNotification(message);
    }
  } catch (err) {
    console.error('[WA-NOTIFICATION] sendAdminNotification failed:', err.message);
  }
};
"""
new = """const sendAdminNotification = async (message) => {
  try {
    console.info('[WA-NOTIFICATION] Admin WhatsApp notification skipped in Main CRM command processor (transport isolated).');
  } catch (err) {
    console.error('[WA-NOTIFICATION] sendAdminNotification failed:', err.message);
  }
};
"""
assert old in t
t = t.replace(old, new)
open(p, 'w', encoding='utf-8').write(t)
print('done')
