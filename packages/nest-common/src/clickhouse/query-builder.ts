/**
 * ClickHouse Query Builder
 *
 * A type-safe query builder for ClickHouse that prevents SQL injection
 * by using parameterized queries.
 *
 * @example
 * const builder = new ClickHouseQueryBuilder()
 *   .where('timestamp', '>=', startDate, 'DateTime64')
 *   .where('timestamp', '<=', endDate, 'DateTime64')
 *   .whereOptional('user_id', '=', userId, 'UUID')
 *   .whereIn('event_name', events, 'String');
 *
 * const { conditions, params } = builder.build();
 * const sql = `SELECT * FROM events WHERE ${conditions.join(' AND ')}`;
 * await clickhouse.query(sql, params);
 */

export type ClickHouseType =
  | 'String'
  | 'UUID'
  | 'UInt32'
  | 'UInt64'
  | 'Int32'
  | 'Int64'
  | 'Float32'
  | 'Float64'
  | 'DateTime'
  | 'DateTime64'
  | 'Date'
  | 'Bool'
  | 'Array(String)'
  | 'Array(UUID)'
  | 'Array(UInt32)'
  | 'Array(UInt64)';

export type ComparisonOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'ILIKE';

export interface QueryBuilderResult {
  conditions: string[];
  params: Record<string, unknown>;
  whereClause: string;
}

export class ClickHouseQueryBuilder {
  private conditions: string[] = [];
  private params: Record<string, unknown> = {};
  private paramIndex = 0;

  /**
   * Add a WHERE condition
   * @param column - Column name (must be a valid identifier)
   * @param operator - Comparison operator
   * @param value - Value to compare
   * @param type - ClickHouse type for parameter binding
   */
  where(column: string, operator: ComparisonOperator, value: unknown, type: ClickHouseType): this {
    this.validateColumnName(column);
    const paramName = `p${this.paramIndex++}`;
    this.conditions.push(`${column} ${operator} {${paramName}:${type}}`);
    this.params[paramName] = value;
    return this;
  }

  /**
   * Add a WHERE condition only if value is defined
   * @param column - Column name
   * @param operator - Comparison operator
   * @param value - Value to compare (skipped if undefined/null)
   * @param type - ClickHouse type
   */
  whereOptional(
    column: string,
    operator: ComparisonOperator,
    value: unknown | undefined | null,
    type: ClickHouseType,
  ): this {
    if (value !== undefined && value !== null) {
      this.where(column, operator, value, type);
    }
    return this;
  }

  /**
   * Add a WHERE IN condition
   * @param column - Column name
   * @param values - Array of values
   * @param elementType - Type of array elements (without Array wrapper)
   */
  whereIn(column: string, values: unknown[], elementType: ClickHouseType): this {
    this.validateColumnName(column);
    if (values.length === 0) {
      // Empty array - always false condition
      this.conditions.push('1 = 0');
      return this;
    }
    const paramName = `p${this.paramIndex++}`;
    this.conditions.push(`${column} IN ({${paramName}:Array(${elementType})})`);
    this.params[paramName] = values;
    return this;
  }

  /**
   * Add a WHERE IN condition only if values are provided
   */
  whereInOptional(
    column: string,
    values: unknown[] | undefined | null,
    elementType: ClickHouseType,
  ): this {
    if (values && values.length > 0) {
      this.whereIn(column, values, elementType);
    }
    return this;
  }

  /**
   * Add a WHERE BETWEEN condition
   * @param column - Column name
   * @param start - Start value
   * @param end - End value
   * @param type - ClickHouse type
   */
  whereBetween(column: string, start: unknown, end: unknown, type: ClickHouseType): this {
    this.validateColumnName(column);
    const startParam = `p${this.paramIndex++}`;
    const endParam = `p${this.paramIndex++}`;
    this.conditions.push(`${column} >= {${startParam}:${type}}`);
    this.conditions.push(`${column} <= {${endParam}:${type}}`);
    this.params[startParam] = start;
    this.params[endParam] = end;
    return this;
  }

  /**
   * Add a WHERE IS NULL condition
   */
  whereNull(column: string): this {
    this.validateColumnName(column);
    this.conditions.push(`${column} IS NULL`);
    return this;
  }

  /**
   * Add a WHERE IS NOT NULL condition
   */
  whereNotNull(column: string): this {
    this.validateColumnName(column);
    this.conditions.push(`${column} IS NOT NULL`);
    return this;
  }

  /**
   * Add a raw WHERE condition (use with caution - values must be validated)
   * @param condition - Raw SQL condition
   */
  whereRaw(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  /**
   * Add a parameter manually
   * @param name - Parameter name
   * @param value - Parameter value
   */
  addParam(name: string, value: unknown): this {
    this.params[name] = value;
    return this;
  }

  /**
   * Build the query
   * @returns Object with conditions array, params object, and whereClause string
   */
  build(): QueryBuilderResult {
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';

    return {
      conditions: [...this.conditions],
      params: { ...this.params },
      whereClause,
    };
  }

  /**
   * Get just the conditions joined with AND
   */
  getConditions(): string {
    return this.conditions.join(' AND ');
  }

  /**
   * Reset the builder for reuse
   */
  reset(): this {
    this.conditions = [];
    this.params = {};
    this.paramIndex = 0;
    return this;
  }

  /**
   * Validate column name to prevent SQL injection
   * Only allows alphanumeric characters, underscores, and dots (for qualified names)
   */
  private validateColumnName(column: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
  }
}

/**
 * Factory function to create a new query builder
 */
export function createQueryBuilder(): ClickHouseQueryBuilder {
  return new ClickHouseQueryBuilder();
}
