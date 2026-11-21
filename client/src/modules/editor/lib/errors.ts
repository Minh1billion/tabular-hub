export function shortErrorMessage(error: string) {
  const withoutPrefix = error.replace(/^Node '.*?' \(.*?\) failed schema inference:\s*/, '')
  return withoutPrefix
    .split('\n\n')[0]
    .replace(/\s+for node '[^']*'/i, '')
    .replace(/\bnode '[0-9a-f]{8}-[0-9a-f-]{27}'/gi, 'this node')
}
