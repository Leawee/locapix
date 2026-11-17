let staged: File[] | null = null;

export function stageFiles(files: File[]) {
  staged = files.slice();
}

export function peekStaged(): File[] | null {
  return staged;
}

export function clearStaged() {
  staged = null;
}
