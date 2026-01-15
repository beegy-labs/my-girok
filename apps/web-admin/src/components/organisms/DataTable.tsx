// apps/web-admin/src/components/organisms/DataTable.tsx
import { memo, ReactNode } from 'react';
import { Spinner } from '../atoms/Spinner';
import { Card } from '../atoms/Card';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  /** Hide this column on mobile card view */
  hideOnMobile?: boolean;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  /** Enable mobile card view (converts table rows to cards on small screens) */
  mobileCardView?: boolean;
}

function DataTableComponent<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data found',
  mobileCardView = false,
}: DataTableProps<T>) {
  const tableClassName = mobileCardView
    ? 'admin-table mobile-card-view min-w-full sm:min-w-0'
    : 'admin-table min-w-full';

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <Spinner />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-theme-text-tertiary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      data-label={col.header}
                      className={col.hideOnMobile && mobileCardView ? 'hidden sm:table-cell' : ''}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
