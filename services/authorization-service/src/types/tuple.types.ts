/**
 * Tuple Types for Zanzibar-style ReBAC
 *
 * A tuple represents a relationship between a user and an object.
 * Format: (user, relation, object)
 *
 * Examples:
 * - (user:alice, member, team:cs-korea)
 * - (team:cs-korea#member, viewer, session_recording:service-a)
 * - (admin:kim, admin, service:service-a)
 */

/**
 * Represents a typed identifier in format "type:id"
 * Examples: "user:alice", "team:cs-korea", "session_recording:service-a"
 */
export interface TypedId {
  type: string;
  id: string;
}

/**
 * Represents a userset reference in format "type:id#relation"
 * Used for indirect relationships through group membership
 * Example: "team:cs-korea#member" means "members of team cs-korea"
 */
export interface UsersetRef extends TypedId {
  relation: string;
}

/**
 * The subject of a relationship tuple
 * Can be a direct user or a userset reference
 */
export interface TupleUser {
  type: string;
  id: string;
  relation?: string; // Present if this is a userset reference
}

/**
 * Represents a relationship tuple key (the core triplet)
 * This is the primary format used in API requests
 */
export interface TupleKey {
  /**
   * The user/subject of the relationship
   * Format: "type:id" or "type:id#relation"
   * Examples: "user:alice", "team:dev#member"
   */
  user: string;

  /**
   * The relation connecting user to object
   * Examples: "viewer", "admin", "member", "owner"
   */
  relation: string;

  /**
   * The object/resource of the relationship
   * Format: "type:id"
   * Examples: "session_recording:service-a", "team:cs-korea"
   */
  object: string;
}

/**
 * A complete relationship tuple with metadata
 */
export interface RelationTuple {
  id: string;

  // User/Subject
  userType: string;
  userId: string;
  userRelation?: string; // For userset references

  // Relation
  relation: string;

  // Object/Resource
  objectType: string;
  objectId: string;

  // Conditional tuple support
  conditionName?: string;
  conditionContext?: Record<string, unknown>;

  // Transaction tracking for consistency
  createdTxid: bigint;
  deletedTxid?: bigint;

  // Timestamps
  createdAt: Date;
}

/**
 * Parsed representation of a TupleKey.user string
 */
export interface ParsedUser {
  type: string;
  id: string;
  relation?: string;
  isUserset: boolean;
}

/**
 * Parsed representation of a TupleKey.object string
 */
export interface ParsedObject {
  type: string;
  id: string;
}

/**
 * Helper functions for parsing tuple components
 */
export const TupleUtils = {
  /**
   * Parse a user string into its components
   * @param user - User string in format "type:id" or "type:id#relation"
   */
  parseUser(user: string): ParsedUser {
    const hashIndex = user.indexOf('#');
    if (hashIndex !== -1) {
      const typeId = user.substring(0, hashIndex);
      const relation = user.substring(hashIndex + 1);
      const [type, id] = typeId.split(':');
      return { type, id, relation, isUserset: true };
    }

    const [type, id] = user.split(':');
    return { type, id, isUserset: false };
  },

  /**
   * Parse an object string into its components
   * @param object - Object string in format "type:id"
   */
  parseObject(object: string): ParsedObject {
    const [type, ...idParts] = object.split(':');
    return { type, id: idParts.join(':') };
  },

  /**
   * Build a user string from components
   */
  buildUser(type: string, id: string, relation?: string): string {
    const base = `${type}:${id}`;
    return relation ? `${base}#${relation}` : base;
  },

  /**
   * Build an object string from components
   */
  buildObject(type: string, id: string): string {
    return `${type}:${id}`;
  },

  /**
   * Convert a TupleKey to a RelationTuple (partial, without id/timestamps)
   */
  tupleKeyToPartial(
    key: TupleKey,
  ): Pick<
    RelationTuple,
    'userType' | 'userId' | 'userRelation' | 'relation' | 'objectType' | 'objectId'
  > {
    const parsedUser = this.parseUser(key.user);
    const parsedObject = this.parseObject(key.object);

    return {
      userType: parsedUser.type,
      userId: parsedUser.id,
      userRelation: parsedUser.relation,
      relation: key.relation,
      objectType: parsedObject.type,
      objectId: parsedObject.id,
    };
  },

  /**
   * Convert a RelationTuple to a TupleKey
   */
  relationTupleToKey(tuple: RelationTuple): TupleKey {
    return {
      user: this.buildUser(tuple.userType, tuple.userId, tuple.userRelation),
      relation: tuple.relation,
      object: this.buildObject(tuple.objectType, tuple.objectId),
    };
  },
};
