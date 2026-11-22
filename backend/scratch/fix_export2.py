p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
t = t.replace("setWhatsAppCommandIo };\n", "setWhatsAppCommandIo };\n")
t = t.replace("\\n", "\n")
open(p, 'w', encoding='utf-8').write(t)
print('done')
