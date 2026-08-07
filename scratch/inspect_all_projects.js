import connectDB from '../backend/config/db.js';
import Project from '../backend/models/Project.js';

async function listAllProjects() {
  await connectDB();
  const projects = await Project.find({});
  console.log(`TOTAL PROJECTS IN PRODUCTION DB: ${projects.length}\n`);
  projects.forEach((p, idx) => {
    console.log(`[Project #${idx + 1}] ID: ${p._id}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Client: "${p.clientName || p.client}"`);
    console.log(`  Category/Service: "${p.category || p.serviceName || p.service}"`);
    console.log(`  Description: "${p.description}"`);
    console.log(`  CreatedAt: ${p.createdAt}`);
    console.log('----------------------------------------------------');
  });
  process.exit(0);
}

listAllProjects();
