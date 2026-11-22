p = 'backend/server.js'
t = open(p, encoding='utf-8').read()
if "whatsappCommandProcessor" not in t:
    t = t.replace("import whatsappService from './services/whatsappService.js';",
                  "import whatsappService from './services/whatsappService.js';\nimport { setWhatsAppCommandIo } from './services/whatsappCommandProcessor.js';")
t = t.replace("    whatsappService.init(io).catch((err) => {",
              "    setWhatsAppCommandIo(io);\n    whatsappService.init(io).catch((err) => {")
open(p, 'w', encoding='utf-8').write(t)
print('done')
