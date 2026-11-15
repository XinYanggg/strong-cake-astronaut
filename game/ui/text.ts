/** Breaks a sentence into lines of at most `width` characters, at spaces. */
export function wrap(s: string, width: number): string[]
{
    const lines: string[] = [];
    let line = '';
    for (const word of s.split(' ')) {
        if ((line + ' ' + word).trim().length > width) { lines.push(line); line = word; } else line = (line + ' ' + word).trim();
    }
    if (line) lines.push(line);
    return lines;
}
