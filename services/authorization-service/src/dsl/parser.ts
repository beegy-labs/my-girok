/**
 * Parser for Authorization DSL
 *
 * Parses tokens into an Abstract Syntax Tree (AST).
 * Uses recursive descent parsing for the grammar.
 *
 * Grammar:
 * ```
 * model         → "model" "schema" VERSION type*
 * type          → "type" IDENTIFIER relations?
 * relations     → "relations" INDENT relation* DEDENT
 * relation      → "define" IDENTIFIER ":" rewrite
 * rewrite       → unionExpr
 * unionExpr     → intersectionExpr ("or" intersectionExpr)*
 * intersectionExpr → exclusionExpr ("and" exclusionExpr)*
 * exclusionExpr → primaryExpr ("but" "not" primaryExpr)?
 * primaryExpr   → directTypes | tupleToUserset | computed
 * directTypes   → "[" typeRef ("," typeRef)* "]"
 * typeRef       → IDENTIFIER ("#" IDENTIFIER)?
 * tupleToUserset → IDENTIFIER "->" IDENTIFIER
 * computed      → IDENTIFIER
 * ```
 */

import {
  ModelAST,
  TypeAST,
  RelationAST,
  RewriteAST,
  DirectRewriteAST,
  ComputedRewriteAST,
  TupleToUsersetRewriteAST,
  UnionRewriteAST,
  IntersectionRewriteAST,
  ExclusionRewriteAST,
  TypeReferenceAST,
  ParseResult,
  ParseError,
  SourceLocation,
} from './ast.types';
import { Token, TokenType, tokenize } from './lexer';

/**
 * Parser error
 */
export class ParserError extends Error {
  constructor(
    message: string,
    public readonly location?: SourceLocation,
  ) {
    super(location ? `${message} at line ${location.line}, column ${location.column}` : message);
    this.name = 'ParserError';
  }
}

/**
 * Parser for Authorization DSL
 */
export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParseError[] = [];

  constructor(private source: string) {}

  /**
   * Parse the source into an AST
   */
  parse(): ParseResult {
    try {
      this.tokens = tokenize(this.source);
      this.current = 0;
      this.errors = [];

      const ast = this.parseModel();

      return {
        success: this.errors.length === 0,
        ast,
        errors: this.errors,
      };
    } catch (error) {
      if (error instanceof ParserError) {
        this.errors.push({
          message: error.message,
          location: error.location,
        });
      } else {
        this.errors.push({
          message: error instanceof Error ? error.message : String(error),
        });
      }

      return {
        success: false,
        errors: this.errors,
      };
    }
  }

  /**
   * Parse model definition
   * model → "model" "schema" VERSION type*
   */
  private parseModel(): ModelAST {
    const location = this.peek().location;

    // Expect "model"
    this.consume(TokenType.MODEL, 'Expected "model" keyword');

    // Skip any indentation/newlines
    this.skipNewlines();

    // Expect "schema"
    this.consume(TokenType.SCHEMA, 'Expected "schema" keyword');

    // Expect version
    const versionToken = this.consume(TokenType.VERSION, 'Expected schema version (e.g., 1.1)');
    const schemaVersion = versionToken.value;

    // Skip newlines before types
    this.skipNewlines();

    // Parse types
    const types: TypeAST[] = [];
    while (!this.isAtEnd() && this.check(TokenType.TYPE)) {
      types.push(this.parseType());
      this.skipNewlines();
    }

    return {
      kind: 'Model',
      schemaVersion,
      types,
      location,
    };
  }

  /**
   * Parse type definition
   * type → "type" IDENTIFIER relations?
   */
  private parseType(): TypeAST {
    const location = this.peek().location;

    this.consume(TokenType.TYPE, 'Expected "type" keyword');

    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected type name');
    const name = nameToken.value;

    this.skipNewlines();

    // Parse relations if present
    let relations: RelationAST[] = [];
    if (this.check(TokenType.RELATIONS) || this.check(TokenType.INDENT)) {
      // Skip indent if present
      if (this.check(TokenType.INDENT)) {
        this.advance();
      }

      if (this.check(TokenType.RELATIONS)) {
        relations = this.parseRelations();
      }

      // Skip dedent if present
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    return {
      kind: 'Type',
      name,
      relations,
      location,
    };
  }

  /**
   * Parse relations block
   * relations → "relations" INDENT relation* DEDENT
   */
  private parseRelations(): RelationAST[] {
    this.consume(TokenType.RELATIONS, 'Expected "relations" keyword');
    this.skipNewlines();

    // Handle indent if present
    if (this.check(TokenType.INDENT)) {
      this.advance();
    }

    const relations: RelationAST[] = [];

    while (!this.isAtEnd() && this.check(TokenType.DEFINE)) {
      relations.push(this.parseRelation());
      this.skipNewlines();
    }

    // Handle dedent if present
    if (this.check(TokenType.DEDENT)) {
      this.advance();
    }

    return relations;
  }

  /**
   * Parse relation definition
   * relation → "define" IDENTIFIER ":" rewrite
   */
  private parseRelation(): RelationAST {
    const location = this.peek().location;

    this.consume(TokenType.DEFINE, 'Expected "define" keyword');

    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected relation name');
    const name = nameToken.value;

    this.consume(TokenType.COLON, 'Expected ":" after relation name');

    const rewrite = this.parseRewrite();

    return {
      kind: 'Relation',
      name,
      rewrite,
      location,
    };
  }

  /**
   * Parse rewrite expression
   * rewrite → unionExpr
   */
  private parseRewrite(): RewriteAST {
    return this.parseUnionExpr();
  }

  /**
   * Parse union expression (OR)
   * unionExpr → intersectionExpr ("or" intersectionExpr)*
   */
  private parseUnionExpr(): RewriteAST {
    const location = this.peek().location;
    let left = this.parseIntersectionExpr();

    while (this.check(TokenType.OR)) {
      this.advance();
      const right = this.parseIntersectionExpr();

      // Flatten nested unions
      if (left.kind === 'UnionRewrite') {
        (left as UnionRewriteAST).children.push(right);
      } else {
        left = {
          kind: 'UnionRewrite',
          children: [left, right],
          location,
        } as UnionRewriteAST;
      }
    }

    return left;
  }

  /**
   * Parse intersection expression (AND)
   * intersectionExpr → exclusionExpr ("and" exclusionExpr)*
   */
  private parseIntersectionExpr(): RewriteAST {
    const location = this.peek().location;
    let left = this.parseExclusionExpr();

    while (this.check(TokenType.AND)) {
      this.advance();
      const right = this.parseExclusionExpr();

      // Flatten nested intersections
      if (left.kind === 'IntersectionRewrite') {
        (left as IntersectionRewriteAST).children.push(right);
      } else {
        left = {
          kind: 'IntersectionRewrite',
          children: [left, right],
          location,
        } as IntersectionRewriteAST;
      }
    }

    return left;
  }

  /**
   * Parse exclusion expression (BUT NOT)
   * exclusionExpr → primaryExpr ("but" "not" primaryExpr)?
   */
  private parseExclusionExpr(): RewriteAST {
    const location = this.peek().location;
    const base = this.parsePrimaryExpr();

    if (this.check(TokenType.BUT)) {
      this.advance();
      this.consume(TokenType.NOT, 'Expected "not" after "but"');
      const subtract = this.parsePrimaryExpr();

      return {
        kind: 'ExclusionRewrite',
        base,
        subtract,
        location,
      } as ExclusionRewriteAST;
    }

    return base;
  }

  /**
   * Parse primary expression
   * primaryExpr → directTypes | tupleToUserset | computed
   */
  private parsePrimaryExpr(): RewriteAST {
    const location = this.peek().location;

    // Direct types: [user, admin, team#member]
    if (this.check(TokenType.LBRACKET)) {
      return this.parseDirectTypes();
    }

    // Must be an identifier
    const identifier = this.consume(TokenType.IDENTIFIER, 'Expected relation name or direct types');

    // Check for tuple-to-userset: relation->computed
    if (this.check(TokenType.ARROW)) {
      this.advance();
      const computedRelation = this.consume(
        TokenType.IDENTIFIER,
        'Expected computed relation name after "->"',
      );

      return {
        kind: 'TupleToUsersetRewrite',
        tuplesetRelation: identifier.value,
        computedRelation: computedRelation.value,
        location,
      } as TupleToUsersetRewriteAST;
    }

    // Otherwise it's a computed relation
    return {
      kind: 'ComputedRewrite',
      relation: identifier.value,
      location,
    } as ComputedRewriteAST;
  }

  /**
   * Parse direct types
   * directTypes → "[" typeRef ("," typeRef)* "]"
   */
  private parseDirectTypes(): DirectRewriteAST {
    const location = this.peek().location;

    this.consume(TokenType.LBRACKET, 'Expected "["');

    const allowedTypes: TypeReferenceAST[] = [];

    // Parse first type reference
    allowedTypes.push(this.parseTypeReference());

    // Parse remaining type references
    while (this.check(TokenType.COMMA)) {
      this.advance();
      allowedTypes.push(this.parseTypeReference());
    }

    this.consume(TokenType.RBRACKET, 'Expected "]"');

    return {
      kind: 'DirectRewrite',
      allowedTypes,
      location,
    };
  }

  /**
   * Parse type reference
   * typeRef → IDENTIFIER ("#" IDENTIFIER)?
   */
  private parseTypeReference(): TypeReferenceAST {
    const location = this.peek().location;

    const typeToken = this.consume(TokenType.IDENTIFIER, 'Expected type name');
    const typeName = typeToken.value;

    let relation: string | undefined;

    // Check for userset notation: type#relation
    if (this.check(TokenType.HASH)) {
      this.advance();
      const relationToken = this.consume(TokenType.IDENTIFIER, 'Expected relation name after "#"');
      relation = relationToken.value;
    }

    return {
      kind: 'TypeReference',
      type: typeName,
      relation,
      location,
    };
  }

  // ========================================
  // Helper methods
  // ========================================

  /**
   * Skip newlines and indentation tokens
   */
  private skipNewlines(): void {
    while (
      this.check(TokenType.NEWLINE) ||
      this.check(TokenType.INDENT) ||
      this.check(TokenType.DEDENT)
    ) {
      if (this.check(TokenType.DEDENT)) {
        break; // Don't skip dedent, it's structurally important
      }
      this.advance();
    }
  }

  /**
   * Check if current token is of given type
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /**
   * Get current token without advancing
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Get next token without advancing
   */
  private peekNext(): Token | undefined {
    if (this.current + 1 >= this.tokens.length) return undefined;
    return this.tokens[this.current + 1];
  }

  /**
   * Advance to next token
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  /**
   * Consume expected token or throw error
   */
  private consume(type: TokenType, errorMessage: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    throw new ParserError(`${errorMessage}, got ${token.type} "${token.value}"`, token.location);
  }

  /**
   * Check if at end of tokens
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }
}

/**
 * Convenience function to parse source
 */
export function parse(source: string): ParseResult {
  const parser = new Parser(source);
  return parser.parse();
}
