const hbs = require('hbs');

hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);
hbs.registerHelper('add', (a, b) => a + b);
hbs.registerHelper('lt', (a, b) => a < b);
hbs.registerHelper('json', (context) => JSON.stringify(context));
hbs.registerHelper('includes', (array, value) => {
  if (!Array.isArray(array)) return false;
  return array.includes(value);
});
