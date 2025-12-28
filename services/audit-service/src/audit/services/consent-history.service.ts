import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '../../shared/clickhouse/clickhouse.service';
import {
  ConsentHistoryQueryDto,
  ConsentHistoryResponseDto,
  PaginatedConsentHistoryResponseDto,
  ConsentStatsQueryDto,
  ConsentStatsResponseDto,
} from '../dto/consent-history.dto';

interface ConsentHistoryRow {
  id: string;
  timestamp: string;
  user_id: string;
  consent_type: string;
  country_code: string;
  agreed: number;
  document_id: string | null;
  document_version: string | null;
  ip_address: string;
}

@Injectable()
export class ConsentHistoryService {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async getConsentHistory(
    query: ConsentHistoryQueryDto,
  ): Promise<PaginatedConsentHistoryResponseDto> {
    const offset = ((query.page ?? 1) - 1) * (query.limit ?? 20);

    const conditions: string[] = [
      'timestamp >= {startDate:DateTime64}',
      'timestamp <= {endDate:DateTime64}',
    ];
    const params: Record<string, unknown> = {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ?? 20,
      offset,
    };

    if (query.userId) {
      conditions.push('user_id = {userId:String}');
      params.userId = query.userId;
    }
    if (query.consentType) {
      conditions.push('consent_type = {consentType:String}');
      params.consentType = query.consentType;
    }
    if (query.countryCode) {
      conditions.push('country_code = {countryCode:String}');
      params.countryCode = query.countryCode;
    }
    if (query.agreed !== undefined) {
      conditions.push('agreed = {agreed:UInt8}');
      params.agreed = query.agreed ? 1 : 0;
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countSql = `
      SELECT count() as total
      FROM audit_db.consent_history
      WHERE ${whereClause}
    `;
    const countResult = await this.clickhouse.query<{ total: string }>(countSql, params);
    const total = parseInt(countResult.data[0]?.total ?? '0', 10);

    // Data
    const dataSql = `
      SELECT
        id,
        timestamp,
        user_id,
        consent_type,
        country_code,
        agreed,
        document_id,
        document_version,
        ip_address
      FROM audit_db.consent_history
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `;

    const result = await this.clickhouse.query<ConsentHistoryRow>(dataSql, params);

    const data: ConsentHistoryResponseDto[] = result.data.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      consentType: row.consent_type,
      countryCode: row.country_code,
      agreed: row.agreed === 1,
      documentId: row.document_id ?? undefined,
      documentVersion: row.document_version ?? undefined,
      ipAddress: row.ip_address,
    }));

    return {
      data,
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      totalPages: Math.ceil(total / (query.limit ?? 20)),
    };
  }

  async getUserConsentHistory(userId: string): Promise<ConsentHistoryResponseDto[]> {
    const sql = `
      SELECT
        id,
        timestamp,
        user_id,
        consent_type,
        country_code,
        agreed,
        document_id,
        document_version,
        ip_address
      FROM audit_db.consent_history
      WHERE user_id = {userId:String}
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    const result = await this.clickhouse.query<ConsentHistoryRow>(sql, { userId });

    return result.data.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      consentType: row.consent_type,
      countryCode: row.country_code,
      agreed: row.agreed === 1,
      documentId: row.document_id ?? undefined,
      documentVersion: row.document_version ?? undefined,
      ipAddress: row.ip_address,
    }));
  }

  async getConsentStats(query: ConsentStatsQueryDto): Promise<ConsentStatsResponseDto> {
    const conditions: string[] = [
      'timestamp >= {startDate:DateTime64}',
      'timestamp <= {endDate:DateTime64}',
    ];
    const params: Record<string, unknown> = {
      startDate: query.startDate,
      endDate: query.endDate,
    };

    if (query.consentType) {
      conditions.push('consent_type = {consentType:String}');
      params.consentType = query.consentType;
    }
    if (query.countryCode) {
      conditions.push('country_code = {countryCode:String}');
      params.countryCode = query.countryCode;
    }

    const whereClause = conditions.join(' AND ');

    // Overall stats
    const overallSql = `
      SELECT
        count() as total,
        countIf(agreed = 1) as agreed,
        countIf(agreed = 0) as disagreed
      FROM audit_db.consent_history
      WHERE ${whereClause}
    `;
    const overallResult = await this.clickhouse.query<{
      total: string;
      agreed: string;
      disagreed: string;
    }>(overallSql, params);

    const overall = overallResult.data[0] ?? { total: '0', agreed: '0', disagreed: '0' };
    const total = parseInt(overall.total, 10);
    const agreed = parseInt(overall.agreed, 10);
    const disagreed = parseInt(overall.disagreed, 10);

    // By type (limited to prevent unbounded results)
    const byTypeSql = `
      SELECT
        consent_type,
        countIf(agreed = 1) as agreed,
        countIf(agreed = 0) as disagreed
      FROM audit_db.consent_history
      WHERE ${whereClause}
      GROUP BY consent_type
      ORDER BY agreed + disagreed DESC
      LIMIT 100
    `;
    const byTypeResult = await this.clickhouse.query<{
      consent_type: string;
      agreed: string;
      disagreed: string;
    }>(byTypeSql, params);

    const byType: Record<string, { agreed: number; disagreed: number }> = {};
    for (const row of byTypeResult.data) {
      byType[row.consent_type] = {
        agreed: parseInt(row.agreed, 10),
        disagreed: parseInt(row.disagreed, 10),
      };
    }

    // By country (limited to prevent unbounded results)
    const byCountrySql = `
      SELECT
        country_code,
        countIf(agreed = 1) as agreed,
        countIf(agreed = 0) as disagreed
      FROM audit_db.consent_history
      WHERE ${whereClause}
      GROUP BY country_code
      ORDER BY agreed + disagreed DESC
      LIMIT 200
    `;
    const byCountryResult = await this.clickhouse.query<{
      country_code: string;
      agreed: string;
      disagreed: string;
    }>(byCountrySql, params);

    const byCountry: Record<string, { agreed: number; disagreed: number }> = {};
    for (const row of byCountryResult.data) {
      byCountry[row.country_code] = {
        agreed: parseInt(row.agreed, 10),
        disagreed: parseInt(row.disagreed, 10),
      };
    }

    return {
      total,
      agreed,
      disagreed,
      agreementRate: total > 0 ? (agreed / total) * 100 : 0,
      byType,
      byCountry,
    };
  }
}
