import bcrypt from 'bcryptjs';

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      let buf = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk: string) => { buf += chunk; });
      stdin.on('end', () => resolve(buf.split('\n')[0] ?? ''));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let pw = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(pw);
          return;
        } else if (ch === '\u0003') {
          // ctrl-c
          process.exit(130);
        } else if (ch === '\u007f' || ch === '\b') {
          // backspace / delete
          pw = pw.slice(0, -1);
        } else {
          pw += ch;
        }
      }
    };
    stdin.on('data', onData);
  });
}

const pw = await promptPassword('Password (no echo): ');
if (!pw) {
  console.error('Empty password — aborting.');
  process.exit(1);
}
const hash = await bcrypt.hash(pw, 12);
console.log(hash);
