src = open('backend/services/whatsappService.js', encoding='utf-8').read()
start = src.index('const mapCategory =')
end = src.index('whatsappService.parseNewProjectMessage')
block = src[start:end]
open('scratch/block.txt','w', encoding='utf-8').write(block)
print('len', len(block))
