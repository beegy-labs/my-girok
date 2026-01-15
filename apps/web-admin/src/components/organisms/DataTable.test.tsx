import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';

interface TestItem {
  id: string;
  name: string;
  email: string;
  status: string;
}

const mockData: TestItem[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
];

const mockColumns = [
  { key: 'name', header: 'Name', render: (item: TestItem) => item.name },
  { key: 'email', header: 'Email', render: (item: TestItem) => item.email },
  { key: 'status', header: 'Status', render: (item: TestItem) => item.status },
];

describe('DataTable', () => {
  describe('basic rendering', () => {
    it('should render table with data', () => {
      render(<DataTable columns={mockColumns} data={mockData} keyExtractor={(item) => item.id} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should render empty message when no data', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          keyExtractor={(item) => item.id}
          emptyMessage="No records found"
        />,
      );

      expect(screen.getByText('No records found')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          keyExtractor={(item) => item.id}
          loading={true}
        />,
      );

      // Spinner component should be rendered (look for the animate-spin class)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('mobileCardView prop', () => {
    it('should apply mobile-card-view class when mobileCardView is true', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={true}
        />,
      );

      const table = screen.getByRole('table');
      expect(table).toHaveClass('mobile-card-view');
    });

    it('should not apply mobile-card-view class when mobileCardView is false', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={false}
        />,
      );

      const table = screen.getByRole('table');
      expect(table).not.toHaveClass('mobile-card-view');
    });

    it('should not apply mobile-card-view class when mobileCardView is undefined', () => {
      render(<DataTable columns={mockColumns} data={mockData} keyExtractor={(item) => item.id} />);

      const table = screen.getByRole('table');
      expect(table).not.toHaveClass('mobile-card-view');
    });

    it('should add data-label attribute to cells when mobileCardView is true', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={true}
        />,
      );

      // Find cells with data-label attribute
      const nameCells = screen.getAllByText('John Doe');
      expect(nameCells[0].closest('td')).toHaveAttribute('data-label', 'Name');

      const emailCells = screen.getAllByText('john@example.com');
      expect(emailCells[0].closest('td')).toHaveAttribute('data-label', 'Email');
    });

    it('should add data-label attribute to cells even when mobileCardView is false', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={false}
        />,
      );

      // data-label is always added for accessibility
      const nameCells = screen.getAllByText('John Doe');
      expect(nameCells[0].closest('td')).toHaveAttribute('data-label', 'Name');
    });
  });

  describe('hideOnMobile column prop', () => {
    const columnsWithHiddenColumn = [
      { key: 'name', header: 'Name', render: (item: TestItem) => item.name },
      {
        key: 'email',
        header: 'Email',
        hideOnMobile: true,
        render: (item: TestItem) => item.email,
      },
      { key: 'status', header: 'Status', render: (item: TestItem) => item.status },
    ];

    it('should apply hidden class to cells when hideOnMobile is true and mobileCardView is enabled', () => {
      render(
        <DataTable
          columns={columnsWithHiddenColumn}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={true}
        />,
      );

      const emailCells = screen.getAllByText('john@example.com');
      const emailCell = emailCells[0].closest('td');
      expect(emailCell).toHaveClass('hidden');
      expect(emailCell).toHaveClass('sm:table-cell');
    });

    it('should not apply hidden class when mobileCardView is false', () => {
      render(
        <DataTable
          columns={columnsWithHiddenColumn}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={false}
        />,
      );

      const emailCells = screen.getAllByText('john@example.com');
      const emailCell = emailCells[0].closest('td');
      expect(emailCell).not.toHaveClass('hidden');
    });

    it('should not apply hidden class when hideOnMobile is not set', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={true}
        />,
      );

      const nameCells = screen.getAllByText('John Doe');
      const nameCell = nameCells[0].closest('td');
      expect(nameCell).not.toHaveClass('hidden');
    });

    it('should apply hidden class to all rows with hideOnMobile column', () => {
      render(
        <DataTable
          columns={columnsWithHiddenColumn}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={true}
        />,
      );

      // Check both rows
      const johnEmail = screen.getByText('john@example.com').closest('td');
      const janeEmail = screen.getByText('jane@example.com').closest('td');

      expect(johnEmail).toHaveClass('hidden', 'sm:table-cell');
      expect(janeEmail).toHaveClass('hidden', 'sm:table-cell');
    });
  });

  describe('combined mobileCardView and hideOnMobile', () => {
    const complexColumns = [
      { key: 'name', header: 'Name', render: (item: TestItem) => item.name },
      {
        key: 'email',
        header: 'Email',
        hideOnMobile: true,
        render: (item: TestItem) => item.email,
      },
      { key: 'status', header: 'Status', render: (item: TestItem) => item.status },
    ];

    it('should correctly apply both mobile-card-view class and hidden classes', () => {
      render(
        <DataTable
          columns={complexColumns}
          data={mockData}
          keyExtractor={(item) => item.id}
          mobileCardView={true}
        />,
      );

      // Table should have mobile-card-view class
      const table = screen.getByRole('table');
      expect(table).toHaveClass('mobile-card-view');

      // Email cells should be hidden on mobile
      const emailCell = screen.getByText('john@example.com').closest('td');
      expect(emailCell).toHaveClass('hidden', 'sm:table-cell');

      // Name cells should be visible
      const nameCell = screen.getByText('John Doe').closest('td');
      expect(nameCell).not.toHaveClass('hidden');

      // All cells should have data-label
      expect(nameCell).toHaveAttribute('data-label', 'Name');
      expect(emailCell).toHaveAttribute('data-label', 'Email');
    });
  });

  describe('table structure', () => {
    it('should render proper table structure with thead and tbody', () => {
      render(<DataTable columns={mockColumns} data={mockData} keyExtractor={(item) => item.id} />);

      const table = screen.getByRole('table');
      expect(table.querySelector('thead')).toBeInTheDocument();
      expect(table.querySelector('tbody')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      render(<DataTable columns={mockColumns} data={mockData} keyExtractor={(item) => item.id} />);

      const rows = screen.getAllByRole('row');
      // 1 header row + 2 data rows
      expect(rows.length).toBe(3);
    });

    it('should render correct number of columns', () => {
      render(<DataTable columns={mockColumns} data={mockData} keyExtractor={(item) => item.id} />);

      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBe(3);
    });
  });
});
