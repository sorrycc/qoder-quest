import { createOrder, receipt } from './order.js';

const [drink, size, sugar] = process.argv.slice(2);

try {
  console.log(receipt(createOrder(drink, size, sugar)));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
