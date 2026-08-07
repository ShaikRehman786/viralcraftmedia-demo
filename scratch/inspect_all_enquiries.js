import connectDB from '../backend/config/db.js';
import Enquiry from '../backend/models/Enquiry.js';

async function listAllEnquiries() {
  await connectDB();
  const enquiries = await Enquiry.find({});
  console.log(`TOTAL ENQUIRIES IN PRODUCTION DB: ${enquiries.length}\n`);
  enquiries.forEach((e, idx) => {
    console.log(`[Enquiry #${idx + 1}] ID: ${e._id}`);
    console.log(`  Name: "${e.name}"`);
    console.log(`  Email: "${e.email}"`);
    console.log(`  Phone: "${e.phone}"`);
    console.log(`  Service: "${e.service}"`);
    console.log(`  Message: "${e.message}"`);
    console.log(`  CreatedAt: ${e.createdAt}`);
    console.log('----------------------------------------------------');
  });
  process.exit(0);
}

listAllEnquiries();
