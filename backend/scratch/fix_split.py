p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
t = t.replace("const rawLines = cleanedText.split('\n", "const rawLines = cleanedText.split('\\n")
t = t.replace("logStep('Parser Started', { command: textUpper.split('\n", "logStep('Parser Started', { command: textUpper.split('\\n")
open(p, 'w', encoding='utf-8').write(t)
print('done')
