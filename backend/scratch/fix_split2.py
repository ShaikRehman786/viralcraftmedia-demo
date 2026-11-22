p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
old = "logStep('Errors', `Unsupported employee command: ${textUpper.split('\n')[0]}`);".replace("\\n", "\n")
new = "logStep('Errors', `Unsupported employee command: ${textUpper.split('\\n')[0]}`);"
assert old in t, "old not found"
t = t.replace(old, new)
open(p, 'w', encoding='utf-8').write(t)
print('done')
