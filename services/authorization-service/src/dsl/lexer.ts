/**
 * Lexer for Authorization DSL
 *
 * Tokenizes the DSL source into a stream of tokens for the parser.
 *
 * Token Types:
 * - Keywords: model, schema, type, relations, define, or, and, but, not, from
 * - Symbols: :, [, ], #, ->
 * - Identifiers: type names, relation names
 * - Version: e.g., 1.1
 * - Whitespace and comments are skipped
 */

import { SourceLocation, createLocation } from './ast.types';

/**
 * Token types
 */
export enum TokenType {
  // Keywords
  MODEL = 'MODEL',
  SCHEMA = 'SCHEMA',
  TYPE = 'TYPE',
  RELATIONS = 'RELATIONS',
  DEFINE = 'DEFINE',
  OR = 'OR',
  AND = 'AND',
  BUT = 'BUT',
  NOT = 'NOT',
  FROM = 'FROM',

  // Symbols
  COLON = 'COLON', // :
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  HASH = 'HASH', // #
  ARROW = 'ARROW', // ->
  COMMA = 'COMMA', // ,

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  VERSION = 'VERSION',

  // Special
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  EOF = 'EOF',
}

/**
 * Token with value and location
 */
export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}

/**
 * Keywords map
 */
const KEYWORDS: Record<string, TokenType> = {
  model: TokenType.MODEL,
  schema: TokenType.SCHEMA,
  type: TokenType.TYPE,
  relations: TokenType.RELATIONS,
  define: TokenType.DEFINE,
  or: TokenType.OR,
  and: TokenType.AND,
  but: TokenType.BUT,
  not: TokenType.NOT,
  from: TokenType.FROM,
};

/**
 * Lexer error
 */
export class LexerError extends Error {
  constructor(
    message: string,
    public readonly location: SourceLocation,
  ) {
    super(`${message} at line ${location.line}, column ${location.column}`);
    this.name = 'LexerError';
  }
}

/**
 * Lexer for Authorization DSL
 */
export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private indentStack: number[] = [0];
  private tokens: Token[] = [];
  private pendingDedents: number = 0;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the entire source
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.indentStack = [0];
    this.pendingDedents = 0;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Emit remaining dedents at end of file
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.addToken(TokenType.DEDENT, '');
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  /**
   * Scan a single token
   */
  private scanToken(): void {
    // Handle newlines and indentation
    if (this.peek() === '\n') {
      this.advance();
      this.line++;
      this.column = 1;

      // Skip empty lines
      while (!this.isAtEnd() && this.peek() === '\n') {
        this.advance();
        this.line++;
      }

      if (!this.isAtEnd()) {
        this.handleIndentation();
      }
      return;
    }

    // Skip spaces and tabs within a line
    if (this.peek() === ' ' || this.peek() === '\t') {
      this.advance();
      return;
    }

    // Skip comments
    if (this.peek() === '#' && this.peekNext() !== ' ') {
      // This might be a hash symbol, not a comment
      // Comments start with # followed by space or at line start after whitespace
    }
    if (this.peek() === '/' && this.peekNext() === '/') {
      this.skipLineComment();
      return;
    }

    const startLocation = this.currentLocation();
    const char = this.advance();

    switch (char) {
      case ':':
        this.addToken(TokenType.COLON, ':', startLocation);
        break;

      case '[':
        this.addToken(TokenType.LBRACKET, '[', startLocation);
        break;

      case ']':
        this.addToken(TokenType.RBRACKET, ']', startLocation);
        break;

      case '#':
        // Check if this is part of a userset reference (type#relation)
        this.addToken(TokenType.HASH, '#', startLocation);
        break;

      case ',':
        this.addToken(TokenType.COMMA, ',', startLocation);
        break;

      case '-':
        if (this.peek() === '>') {
          this.advance();
          this.addToken(TokenType.ARROW, '->', startLocation);
        } else {
          throw new LexerError(`Unexpected character: ${char}`, startLocation);
        }
        break;

      default:
        if (this.isDigit(char)) {
          this.scanVersion(startLocation, char);
        } else if (this.isAlpha(char)) {
          this.scanIdentifier(startLocation, char);
        } else if (char === '\r') {
          // Ignore carriage return
        } else {
          throw new LexerError(`Unexpected character: ${char}`, startLocation);
        }
    }
  }

  /**
   * Handle indentation-based structure
   */
  private handleIndentation(): void {
    let indent = 0;
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      if (this.peek() === '\t') {
        indent += 4; // Treat tab as 4 spaces
      } else {
        indent++;
      }
      this.advance();
    }

    // Skip empty lines
    if (this.peek() === '\n' || this.isAtEnd()) {
      return;
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.addToken(TokenType.INDENT, '');
    } else if (indent < currentIndent) {
      while (
        this.indentStack.length > 1 &&
        this.indentStack[this.indentStack.length - 1] > indent
      ) {
        this.indentStack.pop();
        this.addToken(TokenType.DEDENT, '');
      }
    }
  }

  /**
   * Scan a version number (e.g., 1.1)
   */
  private scanVersion(startLocation: SourceLocation, firstChar: string): void {
    let value = firstChar;

    while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '.')) {
      value += this.advance();
    }

    // Check if it looks like a version (contains a dot)
    if (value.includes('.')) {
      this.addToken(TokenType.VERSION, value, startLocation);
    } else {
      // It's just a number, treat as identifier
      this.addToken(TokenType.IDENTIFIER, value, startLocation);
    }
  }

  /**
   * Scan an identifier or keyword
   */
  private scanIdentifier(startLocation: SourceLocation, firstChar: string): void {
    let value = firstChar;

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Allow underscore in identifiers
    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      value += this.advance();
    }

    // Check if it's a keyword
    const tokenType = KEYWORDS[value.toLowerCase()] || TokenType.IDENTIFIER;
    this.addToken(tokenType, value, startLocation);
  }

  /**
   * Skip line comment
   */
  private skipLineComment(): void {
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
  }

  /**
   * Add a token to the list
   */
  private addToken(type: TokenType, value: string, location?: SourceLocation): void {
    this.tokens.push({
      type,
      value,
      location: location || this.currentLocation(),
    });
  }

  /**
   * Get current source location
   */
  private currentLocation(): SourceLocation {
    return createLocation(this.line, this.column, this.pos);
  }

  /**
   * Check if at end of source
   */
  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  /**
   * Get current character without advancing
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.pos];
  }

  /**
   * Get next character without advancing
   */
  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0';
    return this.source[this.pos + 1];
  }

  /**
   * Advance to next character
   */
  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  /**
   * Check if character is a digit
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if character is alphabetic
   */
  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  /**
   * Check if character is alphanumeric
   */
  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}

/**
 * Convenience function to tokenize source
 */
export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}
