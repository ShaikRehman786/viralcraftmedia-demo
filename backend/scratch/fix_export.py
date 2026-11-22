p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
t = t.replace("\\nexport default", "\nexport default")
open(p, 'w', encoding='utf-8').write(t)
print('done')
