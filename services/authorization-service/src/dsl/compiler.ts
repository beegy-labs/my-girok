/**
 * Compiler for Authorization DSL
 *
 * Compiles the AST into runtime AuthorizationModel structures
 * that can be used by the Check Engine.
 */

import { ulid } from 'ulid';
import {
  AuthorizationModel,
  TypeDefinition,
  RelationDefinition,
  Rewrite,
  DirectRewrite,
  ComputedRewrite,
  TupleToUsersetRewrite,
  UnionRewrite,
  IntersectionRewrite,
  ExclusionRewrite,
  ModelValidationResult,
  ModelValidationError,
  ModelValidationWarning,
} from '../types';
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
} from './ast.types';
import { parse, ParseResult } from './parser';

/**
 * Compilation result
 */
export interface CompilationResult {
  success: boolean;
  model?: AuthorizationModel;
  errors: ModelValidationError[];
  warnings: ModelValidationWarning[];
}

/**
 * Compiler for Authorization DSL
 */
export class Compiler {
  private errors: ModelValidationError[] = [];
  private warnings: ModelValidationWarning[] = [];
  private typeNames: Set<string> = new Set();
  private relationsByType: Map<string, Set<string>> = new Map();

  /**
   * Compile DSL source into AuthorizationModel
   */
  compile(source: string): CompilationResult {
    this.errors = [];
    this.warnings = [];
    this.typeNames = new Set();
    this.relationsByType = new Map();

    // Parse the source
    const parseResult = parse(source);

    if (!parseResult.success || !parseResult.ast) {
      return {
        success: false,
        errors: parseResult.errors.map((e) => ({
          type: 'parse',
          message: e.message,
          line: e.location?.line,
          column: e.location?.column,
        })),
        warnings: [],
      };
    }

    // Collect type and relation names for validation
    this.collectNames(parseResult.ast);

    // Compile the AST
    const model = this.compileModel(parseResult.ast, source);

    // Validate the model
    this.validate(parseResult.ast);

    return {
      success: this.errors.length === 0,
      model: this.errors.length === 0 ? model : undefined,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Collect type and relation names for validation
   */
  private collectNames(ast: ModelAST): void {
    for (const type of ast.types) {
      this.typeNames.add(type.name);
      const relations = new Set<string>();

      for (const relation of type.relations) {
        relations.add(relation.name);
      }

      this.relationsByType.set(type.name, relations);
    }
  }

  /**
   * Compile ModelAST to AuthorizationModel
   */
  private compileModel(ast: ModelAST, source: string): AuthorizationModel {
    const types: Record<string, TypeDefinition> = {};

    for (const typeAst of ast.types) {
      const typeDef = this.compileType(typeAst);
      types[typeDef.name] = typeDef;
    }

    return {
      id: ulid(),
      versionId: ulid(),
      schemaVersion: ast.schemaVersion,
      dslSource: source,
      types,
      isActive: false,
      createdAt: new Date(),
    };
  }

  /**
   * Compile TypeAST to TypeDefinition
   */
  private compileType(typeAst: TypeAST): TypeDefinition {
    const relations: Record<string, RelationDefinition> = {};

    for (const relationAst of typeAst.relations) {
      const relationDef = this.compileRelation(relationAst);
      relations[relationDef.name] = relationDef;
    }

    return {
      name: typeAst.name,
      relations,
    };
  }

  /**
   * Compile RelationAST to RelationDefinition
   */
  private compileRelation(relationAst: RelationAST): RelationDefinition {
    const rewrite = this.compileRewrite(relationAst.rewrite);

    // Extract directly assignable types for convenience
    let directlyAssignableTypes: string[] | undefined;
    if (rewrite.type === 'direct') {
      directlyAssignableTypes = (rewrite as DirectRewrite).allowedTypes;
    }

    return {
      name: relationAst.name,
      rewrite,
      directlyAssignableTypes,
    };
  }

  /**
   * Compile RewriteAST to Rewrite
   */
  private compileRewrite(rewriteAst: RewriteAST): Rewrite {
    switch (rewriteAst.kind) {
      case 'DirectRewrite':
        return this.compileDirectRewrite(rewriteAst as DirectRewriteAST);

      case 'ComputedRewrite':
        return this.compileComputedRewrite(rewriteAst as ComputedRewriteAST);

      case 'TupleToUsersetRewrite':
        return this.compileTupleToUsersetRewrite(rewriteAst as TupleToUsersetRewriteAST);

      case 'UnionRewrite':
        return this.compileUnionRewrite(rewriteAst as UnionRewriteAST);

      case 'IntersectionRewrite':
        return this.compileIntersectionRewrite(rewriteAst as IntersectionRewriteAST);

      case 'ExclusionRewrite':
        return this.compileExclusionRewrite(rewriteAst as ExclusionRewriteAST);

      default:
        throw new Error(`Unknown rewrite kind: ${(rewriteAst as RewriteAST).kind}`);
    }
  }

  /**
   * Compile DirectRewriteAST to DirectRewrite
   */
  private compileDirectRewrite(ast: DirectRewriteAST): DirectRewrite {
    const allowedTypes = ast.allowedTypes.map((typeRef) => {
      if (typeRef.relation) {
        return `${typeRef.type}#${typeRef.relation}`;
      }
      return typeRef.type;
    });

    return {
      type: 'direct',
      allowedTypes,
    };
  }

  /**
   * Compile ComputedRewriteAST to ComputedRewrite
   */
  private compileComputedRewrite(ast: ComputedRewriteAST): ComputedRewrite {
    return {
      type: 'computed',
      relation: ast.relation,
    };
  }

  /**
   * Compile TupleToUsersetRewriteAST to TupleToUsersetRewrite
   */
  private compileTupleToUsersetRewrite(ast: TupleToUsersetRewriteAST): TupleToUsersetRewrite {
    return {
      type: 'tupleToUserset',
      tuplesetRelation: ast.tuplesetRelation,
      computedRelation: ast.computedRelation,
    };
  }

  /**
   * Compile UnionRewriteAST to UnionRewrite
   */
  private compileUnionRewrite(ast: UnionRewriteAST): UnionRewrite {
    return {
      type: 'union',
      children: ast.children.map((child) => this.compileRewrite(child)),
    };
  }

  /**
   * Compile IntersectionRewriteAST to IntersectionRewrite
   */
  private compileIntersectionRewrite(ast: IntersectionRewriteAST): IntersectionRewrite {
    return {
      type: 'intersection',
      children: ast.children.map((child) => this.compileRewrite(child)),
    };
  }

  /**
   * Compile ExclusionRewriteAST to ExclusionRewrite
   */
  private compileExclusionRewrite(ast: ExclusionRewriteAST): ExclusionRewrite {
    return {
      type: 'exclusion',
      base: this.compileRewrite(ast.base),
      subtract: this.compileRewrite(ast.subtract),
    };
  }

  /**
   * Validate the compiled model
   */
  private validate(ast: ModelAST): void {
    for (const type of ast.types) {
      this.validateType(type);
    }
  }

  /**
   * Validate a type definition
   */
  private validateType(typeAst: TypeAST): void {
    const relationNames = new Set<string>();

    for (const relation of typeAst.relations) {
      // Check for duplicate relation names
      if (relationNames.has(relation.name)) {
        this.errors.push({
          type: typeAst.name,
          relation: relation.name,
          message: `Duplicate relation name: ${relation.name}`,
          line: relation.location?.line,
          column: relation.location?.column,
        });
      }
      relationNames.add(relation.name);

      // Validate the rewrite
      this.validateRewrite(typeAst.name, relation.name, relation.rewrite, relationNames);
    }
  }

  /**
   * Validate a rewrite expression
   */
  private validateRewrite(
    typeName: string,
    relationName: string,
    rewriteAst: RewriteAST,
    definedRelations: Set<string>,
  ): void {
    switch (rewriteAst.kind) {
      case 'DirectRewrite':
        this.validateDirectRewrite(typeName, relationName, rewriteAst as DirectRewriteAST);
        break;

      case 'ComputedRewrite':
        this.validateComputedRewrite(
          typeName,
          relationName,
          rewriteAst as ComputedRewriteAST,
          definedRelations,
        );
        break;

      case 'TupleToUsersetRewrite':
        this.validateTupleToUsersetRewrite(
          typeName,
          relationName,
          rewriteAst as TupleToUsersetRewriteAST,
          definedRelations,
        );
        break;

      case 'UnionRewrite':
        for (const child of (rewriteAst as UnionRewriteAST).children) {
          this.validateRewrite(typeName, relationName, child, definedRelations);
        }
        break;

      case 'IntersectionRewrite':
        for (const child of (rewriteAst as IntersectionRewriteAST).children) {
          this.validateRewrite(typeName, relationName, child, definedRelations);
        }
        break;

      case 'ExclusionRewrite':
        const exclusion = rewriteAst as ExclusionRewriteAST;
        this.validateRewrite(typeName, relationName, exclusion.base, definedRelations);
        this.validateRewrite(typeName, relationName, exclusion.subtract, definedRelations);
        break;
    }
  }

  /**
   * Validate direct rewrite
   */
  private validateDirectRewrite(
    typeName: string,
    relationName: string,
    ast: DirectRewriteAST,
  ): void {
    for (const typeRef of ast.allowedTypes) {
      // Validate that referenced type exists (warning, not error)
      if (!this.typeNames.has(typeRef.type) && !this.isBuiltinType(typeRef.type)) {
        this.warnings.push({
          type: typeName,
          relation: relationName,
          message: `Referenced type '${typeRef.type}' is not defined in the model`,
        });
      }

      // If userset reference, validate the relation exists
      if (typeRef.relation) {
        const typeRelations = this.relationsByType.get(typeRef.type);
        if (typeRelations && !typeRelations.has(typeRef.relation)) {
          this.warnings.push({
            type: typeName,
            relation: relationName,
            message: `Referenced relation '${typeRef.relation}' is not defined in type '${typeRef.type}'`,
          });
        }
      }
    }
  }

  /**
   * Validate computed rewrite
   */
  private validateComputedRewrite(
    typeName: string,
    relationName: string,
    ast: ComputedRewriteAST,
    definedRelations: Set<string>,
  ): void {
    // Check if referenced relation exists in current type
    const typeRelations = this.relationsByType.get(typeName);

    if (
      !definedRelations.has(ast.relation) &&
      (!typeRelations || !typeRelations.has(ast.relation))
    ) {
      this.errors.push({
        type: typeName,
        relation: relationName,
        message: `Computed relation '${ast.relation}' is not defined in type '${typeName}'`,
        line: ast.location?.line,
        column: ast.location?.column,
      });
    }

    // Check for self-reference (potential infinite loop)
    if (ast.relation === relationName) {
      this.errors.push({
        type: typeName,
        relation: relationName,
        message: `Relation '${relationName}' cannot reference itself directly`,
        line: ast.location?.line,
        column: ast.location?.column,
      });
    }
  }

  /**
   * Validate tuple-to-userset rewrite
   */
  private validateTupleToUsersetRewrite(
    typeName: string,
    relationName: string,
    ast: TupleToUsersetRewriteAST,
    definedRelations: Set<string>,
  ): void {
    // Check if tupleset relation exists in current type
    const typeRelations = this.relationsByType.get(typeName);

    if (
      !definedRelations.has(ast.tuplesetRelation) &&
      (!typeRelations || !typeRelations.has(ast.tuplesetRelation))
    ) {
      this.errors.push({
        type: typeName,
        relation: relationName,
        message: `Tupleset relation '${ast.tuplesetRelation}' is not defined in type '${typeName}'`,
        line: ast.location?.line,
        column: ast.location?.column,
      });
    }
  }

  /**
   * Check if type is a built-in type
   */
  private isBuiltinType(typeName: string): boolean {
    // Built-in types that don't need to be defined
    return ['user', 'admin', 'operator', '*'].includes(typeName);
  }
}

/**
 * Convenience function to compile DSL source
 */
export function compile(source: string): CompilationResult {
  const compiler = new Compiler();
  return compiler.compile(source);
}

/**
 * Validate DSL source without compiling
 */
export function validate(source: string): ModelValidationResult {
  const result = compile(source);
  return {
    valid: result.success,
    errors: result.errors,
    warnings: result.warnings,
  };
}
