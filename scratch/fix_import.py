p = 'backend/services/whatsappInboundCommandService.js'
t = open(p, encoding='utf-8').read()
t = t.replace("export async function processInboundWhatsAppCommand(input = {}) {\\n  const { handleAdminCommand, handleEmployeeCommand } = await import('./whatsappCommandProcessor.js');\\n  const commandContext",
              "export async function processInboundWhatsAppCommand(input = {}) {\n  const { handleAdminCommand, handleEmployeeCommand } = await import('./whatsappCommandProcessor.js');\n  const commandContext")
open(p, 'w', encoding='utf-8').write(t)
print('done')
