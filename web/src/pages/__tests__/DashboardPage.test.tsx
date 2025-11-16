import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage';
import * as analyticsApi from '../../api/analytics';
import { ToastProvider } from '../../contexts/ToastContext';

jest.mock('../../api/analytics');
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <div>{children}</div>,
  useAuth: () => ({ user: { id: 'test-user' }, token: 'test-token' }),
}));
jest.mock('../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: any) => <div>{children}</div>,
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));
jest.mock('../../components/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../../components/PortfolioSummaryCard', () => ({
  __esModule: true,
  default: () => <div>Portfolio Summary</div>,
}));
jest.mock('../../components/AllocationPieChart', () => ({
  __esModule: true,
  default: () => <div>Allocation Chart</div>,
}));
jest.mock('../../components/HistoricalPerformanceChart', () => ({
  __esModule: true,
  default: () => <div>Performance Chart</div>,
}));

const mockDashboardMetrics = {
  totalValue: 25000,
  totalGain: 4000,
  percentageReturn: 19.05,
  allocation: [
    { symbol: 'AAPL', value: 15000, percentage: 60 },
    { symbol: 'BRK.B', value: 10000, percentage: 40 },
  ],
  currency: 'USD',
};

const mockGroupedMetrics = {
  totalValue: 25000,
  totalGain: 4000,
  percentageReturn: 19.05,
  groups: [
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
  ],
  currency: 'USD',
  groupBy: 'assetStyle' as const,
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ToastProvider>{component}</ToastProvider>
    </BrowserRouter>
  );
};

describe('DashboardPage - Grouping Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue(mockDashboardMetrics);
  });

  it('renders grouping mode selector', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Group by:')).toBeInTheDocument();
    });

    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
  });

  it('defaults to "none" grouping mode', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('USD', 'none');
    });
  });

  it('switches to asset style grouping mode', async () => {
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue(mockGroupedMetrics);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    const styleButton = screen.getByText('Style');
    fireEvent.click(styleButton);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('USD', 'assetStyle');
    });
  });

  it('switches to asset class grouping mode', async () => {
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue(mockGroupedMetrics);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Class')).toBeInTheDocument();
    });

    const classButton = screen.getByText('Class');
    fireEvent.click(classButton);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('USD', 'assetClass');
    });
  });

  it('switches to currency grouping mode', async () => {
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue(mockGroupedMetrics);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Currency')).toBeInTheDocument();
    });

    const currencyButton = screen.getByText('Currency');
    fireEvent.click(currencyButton);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('USD', 'currency');
    });
  });

  it('saves grouping mode to localStorage', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    const styleButton = screen.getByText('Style');
    fireEvent.click(styleButton);

    await waitFor(() => {
      expect(localStorage.getItem('dashboardGroupingMode')).toBe('assetStyle');
    });
  });

  it('loads grouping mode from localStorage', async () => {
    localStorage.setItem('dashboardGroupingMode', 'assetClass');
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue(mockGroupedMetrics);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('USD', 'assetClass');
    });
  });

  it('displays grouped holdings view when grouping is active', async () => {
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue(mockGroupedMetrics);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    const styleButton = screen.getByText('Style');
    fireEvent.click(styleButton);

    await waitFor(() => {
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
    });
  });

  it('maintains currency selection when switching grouping modes', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('RMB')).toBeInTheDocument();
    });

    // Switch to RMB
    const rmbButton = screen.getByText('RMB');
    fireEvent.click(rmbButton);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('RMB', 'none');
    });

    // Switch grouping mode
    const styleButton = screen.getByText('Style');
    fireEvent.click(styleButton);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledWith('RMB', 'assetStyle');
    });
  });

  it('shows appropriate chart title based on grouping mode', async () => {
    (analyticsApi.getDashboardMetrics as jest.Mock).mockResolvedValue({
      ...mockGroupedMetrics,
      groupBy: 'assetStyle',
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    const styleButton = screen.getByText('Style');
    fireEvent.click(styleButton);

    await waitFor(() => {
      expect(screen.getByText('Allocation by Asset Style')).toBeInTheDocument();
    });
  });

  it('refetches data when grouping mode changes', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledTimes(1);
    });

    const styleButton = screen.getByText('Style');
    fireEvent.click(styleButton);

    await waitFor(() => {
      expect(analyticsApi.getDashboardMetrics).toHaveBeenCalledTimes(2);
    });
  });
});
