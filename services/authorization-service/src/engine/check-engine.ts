/**
 * Check Engine
 *
 * Core permission evaluation engine using graph traversal.
 * Implements Zanzibar-style recursive permission checking.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CheckRequest,
  CheckResult,
  TupleUtils,
  AuthorizationModel,
  Rewrite,
  DirectRewrite,
  ComputedRewrite,
  TupleToUsersetRewrite,
  UnionRewrite,
  IntersectionRewrite,
  ExclusionRewrite,
  MaxDepthExceededError,
  CycleDetectedError,
  TypeNotFoundError,
  RelationNotFoundError,
} from '../types';
import { TupleRepository } from '../storage';
import { ModelRepository } from '../storage';
import { CheckContext } from './context';

/**
 * Check Engine for permission evaluation
 */
@Injectable()
export class CheckEngine {
  private readonly logger = new Logger(CheckEngine.name);

  constructor(
    private readonly tupleRepository: TupleRepository,
    private readonly modelRepository: ModelRepository,
  ) {}

  /**
   * Check if a user has a specific relation to an object
   */
  async check(request: CheckRequest): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      // Get the active model
      const model = await this.modelRepository.getActive();
      if (!model) {
        throw new Error('No active authorization model');
      }

      // Create check context
      const ctx = new CheckContext(request.user, request.object, {
        maxDepth: 25,
        traceEnabled: request.trace,
        contextualTuples: request.contextualTuples,
      });

      // Perform the check
      const allowed = await this.evaluate(model, request.relation, request.object, ctx);

      const result: CheckResult = { allowed };

      if (request.trace) {
        result.resolution = {
          nodeType: 'direct',
          result: allowed,
          durationUs: (Date.now() - startTime) * 1000,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(`Check failed: ${error}`, (error as Error).stack);

      if (
        error instanceof MaxDepthExceededError ||
        error instanceof CycleDetectedError ||
        error instanceof TypeNotFoundError ||
        error instanceof RelationNotFoundError
      ) {
        throw error;
      }

      throw new Error(`Permission check failed: ${error}`);
    }
  }

  /**
   * Batch check multiple permissions
   */
  async batchCheck(
    checks: Array<{ user: string; relation: string; object: string }>,
  ): Promise<Array<{ allowed: boolean; error?: string }>> {
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          const result = await this.check({
            user: check.user,
            relation: check.relation,
            object: check.object,
          });
          return { allowed: result.allowed };
        } catch (error) {
          return { allowed: false, error: (error as Error).message };
        }
      }),
    );

    return results;
  }

  /**
   * Evaluate permission recursively
   */
  private async evaluate(
    model: AuthorizationModel,
    relation: string,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    // Check depth limit
    if (ctx.isMaxDepthExceeded()) {
      throw new MaxDepthExceededError(ctx.depth);
    }

    // Parse object to get type
    const parsedObject = TupleUtils.parseObject(object);
    const objectType = parsedObject.type;

    // Get type definition
    const typeDef = model.types[objectType];
    if (!typeDef) {
      throw new TypeNotFoundError(objectType);
    }

    // Get relation definition
    const relationDef = typeDef.relations[relation];
    if (!relationDef) {
      throw new RelationNotFoundError(objectType, relation);
    }

    // Check for cycle
    if (ctx.hasVisited(relation, object, relationDef.rewrite.type)) {
      this.logger.debug(`Cycle detected: ${relation} on ${object}`);
      return false;
    }

    // Mark as visited
    ctx.visit(relation, object, relationDef.rewrite.type);

    // Evaluate the rewrite rule
    return this.evaluateRewrite(model, relationDef.rewrite, object, ctx);
  }

  /**
   * Evaluate a rewrite rule
   */
  private async evaluateRewrite(
    model: AuthorizationModel,
    rewrite: Rewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    switch (rewrite.type) {
      case 'direct':
        return this.evaluateDirect(rewrite, object, ctx);

      case 'computed':
        return this.evaluateComputed(model, rewrite, object, ctx);

      case 'tupleToUserset':
        return this.evaluateTupleToUserset(model, rewrite, object, ctx);

      case 'union':
        return this.evaluateUnion(model, rewrite, object, ctx);

      case 'intersection':
        return this.evaluateIntersection(model, rewrite, object, ctx);

      case 'exclusion':
        return this.evaluateExclusion(model, rewrite, object, ctx);

      default:
        this.logger.warn(`Unknown rewrite type: ${(rewrite as Rewrite).type}`);
        return false;
    }
  }

  /**
   * Evaluate direct assignment
   * Checks if there's a tuple (user, relation, object)
   */
  private async evaluateDirect(
    rewrite: DirectRewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    const parsedUser = TupleUtils.parseUser(ctx.user);
    const parsedObject = TupleUtils.parseObject(object);

    // Check if user type is allowed
    const userTypeAllowed = rewrite.allowedTypes.some((allowedType) => {
      if (allowedType.includes('#')) {
        // Userset type: e.g., "team#member"
        const [type, relation] = allowedType.split('#');
        return parsedUser.type === type && parsedUser.relation === relation;
      }
      return allowedType === parsedUser.type || allowedType === '*';
    });

    if (!userTypeAllowed) {
      return false;
    }

    // Check contextual tuples first
    const contextualTuple = ctx.findContextualTuple(ctx.user, parsedObject.type, object);
    if (contextualTuple) {
      return true;
    }

    // Check stored tuples
    // For direct check, we need to find if the tuple exists
    const tuples = await this.tupleRepository.findByObject(parsedObject.type, parsedObject.id);

    for (const tuple of tuples) {
      const tupleUser = TupleUtils.buildUser(tuple.userType, tuple.userId, tuple.userRelation);

      // Direct match
      if (tupleUser === ctx.user) {
        return true;
      }

      // If the tuple is a userset, we need to check if our user is a member
      if (tuple.userRelation) {
        // e.g., tuple is (team:dev#member, viewer, doc:1)
        // We need to check if ctx.user is a member of team:dev
        const usersetObject = TupleUtils.buildObject(tuple.userType, tuple.userId);
        const childCtx = ctx.child();

        const activeModel = await this.modelRepository.getActive();
        if (!activeModel) {
          return false;
        }
        const isMember = await this.evaluate(
          activeModel,
          tuple.userRelation,
          usersetObject,
          childCtx,
        );

        if (isMember) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Evaluate computed relation
   * Redirects to another relation on the same object
   */
  private async evaluateComputed(
    model: AuthorizationModel,
    rewrite: ComputedRewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    const childCtx = ctx.child();
    return this.evaluate(model, rewrite.relation, object, childCtx);
  }

  /**
   * Evaluate tuple-to-userset
   * Follows a relation to find related objects, then checks permission on those
   */
  private async evaluateTupleToUserset(
    model: AuthorizationModel,
    rewrite: TupleToUsersetRewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    // Find tuples: (?, tuplesetRelation, object)
    const tuples = await this.tupleRepository.findByObjectAndRelation(
      object,
      rewrite.tuplesetRelation,
    );

    // Also check contextual tuples
    const contextualTuples = ctx.getContextualTuplesForObject(object, rewrite.tuplesetRelation);

    const allTuples = [
      ...tuples.map((t) => ({
        user: TupleUtils.buildUser(t.userType, t.userId, t.userRelation),
      })),
      ...contextualTuples.map((t) => ({ user: t.user })),
    ];

    // For each related object, check the computed relation
    for (const tuple of allTuples) {
      const childCtx = ctx.child();

      // The user of the tuple becomes the object to check
      // e.g., (service:a, parent_service, session_recording:x)
      // We check if ctx.user has computedRelation on service:a
      const allowed = await this.evaluate(model, rewrite.computedRelation, tuple.user, childCtx);

      if (allowed) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate union (OR)
   */
  private async evaluateUnion(
    model: AuthorizationModel,
    rewrite: UnionRewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    for (const child of rewrite.children) {
      const childCtx = ctx.child();
      const result = await this.evaluateRewrite(model, child, object, childCtx);
      if (result) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluate intersection (AND)
   */
  private async evaluateIntersection(
    model: AuthorizationModel,
    rewrite: IntersectionRewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    for (const child of rewrite.children) {
      const childCtx = ctx.child();
      const result = await this.evaluateRewrite(model, child, object, childCtx);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate exclusion (BUT NOT)
   */
  private async evaluateExclusion(
    model: AuthorizationModel,
    rewrite: ExclusionRewrite,
    object: string,
    ctx: CheckContext,
  ): Promise<boolean> {
    const baseCtx = ctx.child();
    const baseResult = await this.evaluateRewrite(model, rewrite.base, object, baseCtx);

    if (!baseResult) {
      return false;
    }

    const subtractCtx = ctx.child();
    const subtractResult = await this.evaluateRewrite(model, rewrite.subtract, object, subtractCtx);

    return baseResult && !subtractResult;
  }
}
