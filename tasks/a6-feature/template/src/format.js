export function formatTodo(todo) {
  return `${todo.done ? '[x]' : '[ ]'} ${todo.id}. ${todo.title}`;
}

export function formatList(todos) {
  if (todos.length === 0) return '没有待办，去喝杯奶茶吧';
  return todos.map(formatTodo).join('\n');
}
