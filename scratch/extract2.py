src = open('backend/services/whatsappService.js', encoding='utf-8').read()
start = src.index('const handleAdminCommand = async')
he = src.index('const handleEmployeeCommand = async')
end_marker = src.index('// ---------------------------------------------------------------------------\n// PRODUCTION-ONLY')
block = src[start:end_marker]
helper_start = src.index('const mapCategory =')
helpers = src[helper_start:start]
la = src.index('const logWhatsAppAudit =')
logaudit = src[la:helper_start]
open('scratch/handlers.txt','w',encoding='utf-8').write(logaudit + helpers + block)
print('written')
