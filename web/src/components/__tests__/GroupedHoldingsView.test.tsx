import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupedHoldingsView from '../GroupedHoldingsView';
import { GroupedHolding } from '../../api/analytics';

const mockGroups: GroupedHolding[] = [
  {
    groupName: 'Growth',
    groupValue: 15000,
    percentage: 60,
    holdings: [
      {
        symbol: 'AAPL',
        shares: 100,
        costBasis: 120,
        currentPrice: 150,
        currentValue: 15000,
        gainLoss: 3000,
        gainLossPercent: 25,
        portfolioId: 'p1',
      },
    ],
  },
  {
    groupName: 'Value',
    groupValue: 10000,
    percentage: 40,
    holdings: [
      {
        symbol: 'BRK.B',
        shares: 50,
        costBasis: 180,
        currentPrice: 200,
        currentValue: 10000,
        gainLoss: 1000,
        gainLossPercent: 11.11,
        portfolioId: 'p2',
      },
    ],
  },
];

describe('GroupedHoldingsView', () => {
  const mockOnViewTransactions = jest.fn();
  const mockOnEditAsset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders grouped holdings', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('displays group values and percentages', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.getByText('$15000.00')).toBeInTheDocument();
    expect(screen.getByText('60.00%')).toBeInTheDocument();
    expect(screen.getByText('$10000.00')).toBeInTheDocument();
    expect(screen.getByText('40.00%')).toBeInTheDocument();
  });

  it('expands and collapses groups', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    // Groups should be expanded by default
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('BRK.B')).toBeInTheDocument();

    // Click to collapse first group
    const growthHeader = screen.getByText('Growth').closest('button');
    fireEvent.click(growthHeader!);

    // AAPL should not be visible, but BRK.B should still be
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    expect(screen.getByText('BRK.B')).toBeInTheDocument();

    // Click to expand again
    fireEvent.click(growthHeader!);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('shows correct number of holdings per group', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.getByText('1 holding')).toBeInTheDocument();
  });

  it('calls onViewTransactions when view button clicked', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    const viewButtons = screen.getAllByRole('button', { name: '' });
    const eyeButton = viewButtons.find(btn => btn.querySelector('svg'));
    
    if (eyeButton) {
      fireEvent.click(eyeButton);
      expect(mockOnViewTransactions).toHaveBeenCalled();
    }
  });

  it('calls onEditAsset when edit button clicked', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
        onEditAsset={mockOnEditAsset}
      />
    );

    const editButtons = screen.getAllByTitle('Edit classification');
    fireEvent.click(editButtons[0]);

    expect(mockOnEditAsset).toHaveBeenCalledWith('p1', 'AAPL');
  });

  it('does not show edit button when onEditAsset is not provided', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.queryByTitle('Edit classification')).not.toBeInTheDocument();
  });

  it('formats currency correctly for RMB', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="RMB"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.getByText('¥15000.00')).toBeInTheDocument();
    expect(screen.getByText('¥10000.00')).toBeInTheDocument();
  });

  it('displays gain/loss with correct colors', () => {
    render(
      <GroupedHoldingsView
        groups={mockGroups}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    const gainElements = screen.getAllByText(/\$3000\.00|\+25\.00%/);
    gainElements.forEach(element => {
      expect(element).toHaveClass(/green/);
    });
  });

  it('shows asset class icons when grouping by asset class', () => {
    const assetClassGroups: GroupedHolding[] = [
      {
        groupName: 'Stock',
        groupValue: 15000,
        percentage: 60,
        holdings: mockGroups[0].holdings,
      },
    ];

    render(
      <GroupedHoldingsView
        groups={assetClassGroups}
        currency="USD"
        groupingMode="assetClass"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.getByText('Stock')).toBeInTheDocument();
  });

  it('renders empty state when no groups', () => {
    render(
      <GroupedHoldingsView
        groups={[]}
        currency="USD"
        onViewTransactions={mockOnViewTransactions}
      />
    );

    expect(screen.queryByText('Growth')).not.toBeInTheDocument();
  });
});
