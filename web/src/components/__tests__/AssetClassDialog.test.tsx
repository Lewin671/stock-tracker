import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import AssetClassDialog from '../AssetClassDialog';
import * as assetStylesApi from '../../api/assetStyles';
import { ToastProvider } from '../../contexts/ToastContext';

jest.mock('../../api/assetStyles');

const mockAssetStyles = [
  { id: '1', userId: 'user1', name: 'Default', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', userId: 'user1', name: 'Growth', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ToastProvider>{component}</ToastProvider>
    </BrowserRouter>
  );
};

describe('AssetClassDialog', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (assetStylesApi.getAssetStyles as jest.Mock).mockResolvedValue(mockAssetStyles);
  });

  it('renders with symbol name', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Classify Asset')).toBeInTheDocument();
      expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    });
  });

  it('shows asset style dropdown', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Asset Style/)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Asset Style/);
    expect(select).toHaveValue('1'); // Default should be selected
  });

  it('shows asset class dropdown with all options', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Asset Class/)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Asset Class/) as HTMLSelectElement;
    const options = Array.from(select.options).map(opt => opt.value);
    
    expect(options).toContain('Stock');
    expect(options).toContain('ETF');
    expect(options).toContain('Bond');
    expect(options).toContain('Cash and Equivalents');
  });

  it('calls onSave with selected values', async () => {
    mockOnSave.mockResolvedValue(undefined);

    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Asset Style/)).toBeInTheDocument();
    });

    const styleSelect = screen.getByLabelText(/Asset Style/);
    const classSelect = screen.getByLabelText(/Asset Class/);
    
    fireEvent.change(styleSelect, { target: { value: '2' } });
    fireEvent.change(classSelect, { target: { value: 'ETF' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('2', 'ETF');
    });
  });

  it('calls onCancel when cancel button clicked', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
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

  it('defaults to "Default" asset style when available', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const select = screen.getByLabelText(/Asset Style/) as HTMLSelectElement;
      expect(select.value).toBe('1'); // Default style ID
    });
  });

  it('defaults to Stock asset class', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const select = screen.getByLabelText(/Asset Class/) as HTMLSelectElement;
      expect(select.value).toBe('Stock');
    });
  });

  it('shows manage asset styles link', async () => {
    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Manage Asset Styles/)).toBeInTheDocument();
    });
  });

  it('shows error when asset style is not selected', async () => {
    (assetStylesApi.getAssetStyles as jest.Mock).mockResolvedValue([]);

    renderWithProviders(
      <AssetClassDialog
        open={true}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <AssetClassDialog
        open={false}
        symbol="AAPL"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Classify Asset')).not.toBeInTheDocument();
  });
});
