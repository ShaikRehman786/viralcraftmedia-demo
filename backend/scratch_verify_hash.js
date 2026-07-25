import bcrypt from 'bcryptjs';

const hash = '$2b$10$ILoJT4Z1G8UknQmqX6EzXuAblvZep2Mx68J8w32gLrOUkRis/DQSO';
const password = 'vcm@Admin2026';

const run = async () => {
  const match = await bcrypt.compare(password, hash);
  console.log('Does password match hash?', match);
};

run();
