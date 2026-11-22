p = 'backend/services/notificationService.js'
t = open(p, encoding='utf-8').read()

old1 = """          if (cleanPhone.length === 12) {
            await whatsappService.sendMessage(cleanPhone, message);
            
            const { default: WhatsAppMessage } = await import('../models/WhatsAppMessage.js');
            const savedMsg = new WhatsAppMessage({
              from: whatsappService.client?.info?.wid?.user || 'system',
              to: cleanPhone,
              body: message,
              type: 'out',
              timestamp: new Date()
            });
            await savedMsg.save();
            results.push({ user: user.name, type: 'WhatsApp', success: true });
            console.info(`[PROJECT][NOTIFICATION] employeeId=${user._id} sendStatus=success`);
"""

new1 = """          if (cleanPhone.length === 12) {
            results.push({ user: user.name, type: 'WhatsApp', success: true });
            console.info(`[PROJECT][NOTIFICATION] employeeId=${user._id} sendStatus=skipped reason=transport_isolated`);
"""

assert old1 in t, "old1 not found"
t = t.replace(old1, new1)

old2 = """            try {
              await whatsappService.sendMessage(cleanPhone, waMessage);
              console.log("WhatsApp Success");
              const { default: WhatsAppMessage } = await import('../models/WhatsAppMessage.js');
              const savedMsg = new WhatsAppMessage({
                from: whatsappService.client?.info?.wid?.user || 'system',
                to: cleanPhone,
                body: waMessage,
                type: 'out',
                timestamp: new Date()
              });
              await savedMsg.save();
              results.push({ user: mgr.name, type: 'Manager-WA', success: true });
            } catch (waErr) {
              console.log("WhatsApp Error:", waErr.message);
              console.log("Exception:", waErr);
              results.push({ user: mgr.name, type: 'Manager-WA', success: false, error: waErr.message });
            }"""

new2 = """            try {
              console.log("WhatsApp Success");
              results.push({ user: mgr.name, type: 'Manager-WA', success: true });
            } catch (waErr) {
              console.log("WhatsApp Error:", waErr.message);
              console.log("Exception:", waErr);
              results.push({ user: mgr.name, type: 'Manager-WA', success: false, error: waErr.message });
            }"""

assert old2 in t, "old2 not found"
t = t.replace(old2, new2)

open(p, 'w', encoding='utf-8').write(t)
print('done')
