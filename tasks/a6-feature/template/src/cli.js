import { formatList } from './format.js';
import { add, complete, load, save } from './store.js';

const FILE = 'todos.json';
const [command, ...rest] = process.argv.slice(2);
let todos = load(FILE);

switch (command) {
  case 'add':
    todos = add(todos, rest.join(' '));
    save(FILE, todos);
    break;
  case 'done':
    todos = complete(todos, Number(rest[0]));
    save(FILE, todos);
    break;
  case 'list':
    break;
  default:
    console.error('用法: todo <add|done|list>');
    process.exit(1);
}

console.log(formatList(todos));
