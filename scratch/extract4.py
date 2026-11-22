src = open('backend/services/whatsappService.js', encoding='utf-8').read()
# sendTaskNotification definition
st = src.index('export const sendTaskNotification')
en = src.index('whatsappService.sendTaskNotification = sendTaskNotification')
snt = src[st:en]
open('scratch/snt.txt','w',encoding='utf-8').write(snt)
print('ok')
