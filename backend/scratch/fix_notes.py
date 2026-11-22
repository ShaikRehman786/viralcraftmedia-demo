p = 'services/whatsappCommandProcessor.js'
t = open(p, encoding='utf-8').read()
old = "        result.notes = (result.notes + '\n' + token).trim();"
# actual has newline between quotes, build dynamically
import re
t = re.sub(r"result\.notes = \(result\.notes \+ '\n' \+ token\)\.trim\(\);", "result.notes = (result.notes + '\\n' + token).trim();", t, flags=re.S)
open(p, 'w', encoding='utf-8').write(t)
print('done')
