import app from '../app.js';

console.log('app.router:', typeof app.router);
if (app.router && app.router.stack) {
  console.log('app.router.stack length:', app.router.stack.length);
  app.router.stack.forEach((layer, idx) => {
    console.log(`${idx}: Layer: ${layer.name}, regexp: ${layer.regexp}`);
    if (layer.name === 'router') {
      layer.handle.stack.forEach((sub, sIdx) => {
        console.log(`  ${sIdx}: Sub: ${sub.name}, path: ${sub.route ? sub.route.path : 'middleware'}, regexp: ${sub.regexp}`);
        if (sub.name === 'router') {
          sub.handle.stack.forEach((leaf, lIdx) => {
             console.log(`    ${lIdx}: Leaf: ${leaf.name}, path: ${leaf.route ? leaf.route.path : 'middleware'}, regexp: ${leaf.regexp}`);
          });
        }
      });
    }
  });
}
process.exit(0);
