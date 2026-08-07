import connectDB from '../backend/config/db.js';
import User from '../backend/models/User.js';
import Partner from '../backend/models/Partner.js';
import ReferralCampaign from '../backend/models/ReferralCampaign.js';
import PartnerCommission from '../backend/models/PartnerCommission.js';

async function inspectPreserved() {
  await connectDB();

  console.log('--- PRESERVED USER ACCOUNTS ---');
  const users = await User.find({});
  console.log(`Total Users: ${users.length}`);
  users.forEach(u => console.log(`  - User: "${u.name}" (${u.email}) | Role: ${u.role}`));

  console.log('\n--- PRESERVED PARTNERS ---');
  const partners = await Partner.find({});
  console.log(`Total Partners: ${partners.length}`);
  partners.forEach(p => console.log(`  - Partner: "${p.name}" (${p.email})`));

  console.log('\n--- PRESERVED CAMPAIGNS ---');
  const campaigns = await ReferralCampaign.find({});
  console.log(`Total Campaigns: ${campaigns.length}`);
  campaigns.forEach(c => console.log(`  - Campaign: "${c.title}"`));

  console.log('\n--- PRESERVED COMMISSIONS ---');
  const commissions = await PartnerCommission.find({});
  console.log(`Total Commissions: ${commissions.length}`);

  process.exit(0);
}

inspectPreserved();
