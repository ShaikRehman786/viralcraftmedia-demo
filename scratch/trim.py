handlers = open('scratch/handlers.txt', encoding='utf-8').read()
idx = handlers.find('  sendAdminNotification: async')
if idx != -1:
    handlers = handlers[:idx]
open('scratch/handlers_trimmed.txt','w',encoding='utf-8').write(handlers)
print('trimmed')
