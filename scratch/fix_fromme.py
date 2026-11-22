p = 'backend/services/whatsappInboundCommandService.js'
t = open(p, encoding='utf-8').read()
old = """  const fromMe = Boolean(sender.fromMe);
  const isFromSelf = Boolean(sender.isFromSelf) || fromMe;

  if (isFromSelf) {
    const admin = await User.findOne({ role: 'SUPER_ADMIN', status: { $regex: /^active$/i } });
    return { user: admin, isAdmin: Boolean(admin), isEmployee: false, cleanSender, isFromSelf };
  }
"""
new = """  const fromMe = Boolean(sender.fromMe);
  if (fromMe) {
    return { user: null, isAdmin: false, isEmployee: false, cleanSender, isFromSelf: false };
  }
  const isFromSelf = false;
"""
assert old in t
t = t.replace(old, new)
open(p, 'w', encoding='utf-8').write(t)
print('done')
