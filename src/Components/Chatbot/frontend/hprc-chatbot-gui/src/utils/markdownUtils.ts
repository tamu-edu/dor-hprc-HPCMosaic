export function containsMarkdownCodeBlocks(message: string): boolean {
    const codeBlockPattern = /```[\s\S]*?```/;
    return codeBlockPattern.test(message);
  }