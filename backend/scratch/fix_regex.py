p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
old = """    .replace(/\\r
/g, '
')"""
new = """    .replace(/\\r\\n/g, '\\n')"""
t = t.replace(old, new)
old2 = """    .replace(/\\r/g, '
');"""
new2 = """    .replace(/\\r/g, '\\n');"""
t = t.replace(old2, new2)
open(p, 'w', encoding='utf-8').write(t)
print('done')
