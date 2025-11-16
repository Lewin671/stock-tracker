import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import EditAssetMetadataDialog from '../EditAssetMetadataDialog';
import * as assetStylesApi from '../../api/assetStyles';
import { ToastProvider } from '../../contexts/ToastContext';

jest.mock('../../api/assetStyles');

const mockAssetStyles = [
  { id: '1', userId: 'user1', name: 'Default', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', userId: 'user1', name: 'Growth', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
];

const mockPortfolio = {
  id: 'portfolio1',
  userId: 'user1',
  symbol: 'AAPL',
  assetStyleId: '1',
  assetClass: 'Stock' as const,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ToastProvider>{component}</ToastProvider>
    </BrowserRouter>
  );
};

describe('EditAssetMetadataDialog', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (assetStylesApi.getAssetStyles as jest.Mock).mockResolvedValue(mockAssetStyles);
  });

  it('renders with portfolio information', async () => {
    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Asset Classification')).toBeInTheDocument();
      expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    });
  });

  it('pre-populates current asset style and class', async () => {
    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const styleSelect = screen.getByLabelText(/Asset Style/) as HTMLSelectElement;
      const classSelect = screen.getByLabelText(/Asset Class/) as HTMLSelectElement;
      
      expect(styleSelect.value).toBe('1');
      expect(classSelect.value).toBe('Stock');
    });
  });

  it('allows changing asset style', async () => {
    mockOnSave.mockResolvedValue(undefined);

    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Asset Style/)).toBeInTheDocument();
    });

    const styleSelect = screen.getByLabelText(/Asset Style/);
    fireEvent.change(styleSelect, { target: { value: '2' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('2', 'Stock');
    });
  });

  it('allows changing asset class', async () => {
    mockOnSave.mockResolvedValue(undefined);

    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Asset Class/)).toBeInTheDocument();
    });

    const classSelect = screen.getByLabelText(/Asset Class/);
    fireEvent.change(classSelect, { target: { value: 'ETF' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('1', 'ETF');
    });
  });

  it('calls onCancel when cancel button clicked', async () => {
    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows manage asset styles link', async () => {
    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Manage Asset Styles/)).toBeInTheDocument();
    });
  });

  it('does not render when portfolio is null', () => {
    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Edit Asset Classification')).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <EditAssetMetadataDialog
        open={false}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Edit Asset Classification')).not.toBeInTheDocument();
  });

  it('shows error when save fails', async () => {
    const error = new Error('Failed to update');
    mockOnSave.mockRejectedValue(error);

    renderWithProviders(
      <EditAssetMetadataDialog
        open={true}
        portfolio={mockPortfolio}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to update/)).toBeInTheDocument();
    });
  });
});
