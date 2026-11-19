let staged: File[] | null = null;
let openFiles: File[] = [];

export function stageFiles(files: File[]) {
  staged = files.slice();
}

/** Remember the photos open in the tool so a size or format link can carry them. */
export function rememberOpenFiles(files: File[]) {
  openFiles = files.slice();
}

export function stageOpenFiles() {
  if (openFiles.length > 0) staged = openFiles.slice();
}

export function peekStaged(): File[] | null {
  return staged;
}

export function clearStaged() {
  staged = null;
}
