p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
old = "        result.notes = (result.notes + '\n' + token).trim();".replace("\\n", "\n")
new = "        result.notes = (result.notes + '\\n' + token).trim();"
assert old in t, "old not found"
t = t.replace(old, new)
open(p, 'w', encoding='utf-8').write(t)
print('done')
