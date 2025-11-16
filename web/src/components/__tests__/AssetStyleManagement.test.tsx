import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssetStyleManagement from '../AssetStyleManagement';
import * as assetStylesApi from '../../api/assetStyles';
import axiosInstance from '../../api/axios';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock the API modules
jest.mock('../../api/assetStyles');
jest.mock('../../api/axios');

const mockAssetStyles = [
  { id: '1', userId: 'user1', name: 'Default', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', userId: 'user1', name: 'Growth', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
  { id: '3', userId: 'user1', name: 'Value', createdAt: '2024-01-03', updatedAt: '2024-01-03' },
];

const renderWithToast = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('AssetStyleManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (assetStylesApi.getAssetStyles as jest.Mock).mockResolvedValue(mockAssetStyles);
    (axiosInstance.get as jest.Mock).mockResolvedValue({ data: { count: 0 } });
  });

  it('renders asset style list when open', async () => {
    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Asset Styles')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
    });
  });

  it('creates new asset style', async () => {
    (assetStylesApi.createAssetStyle as jest.Mock).mockResolvedValue({
      id: '4',
      userId: 'user1',
      name: 'Tech',
      createdAt: '2024-01-04',
      updatedAt: '2024-01-04',
    });

    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter asset style name')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter asset style name');
    const createButton = screen.getByRole('button', { name: /create/i });

    fireEvent.change(input, { target: { value: 'Tech' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(assetStylesApi.createAssetStyle).toHaveBeenCalledWith('Tech');
    });
  });

  it('updates asset style name', async () => {
    (assetStylesApi.updateAssetStyle as jest.Mock).mockResolvedValue(undefined);

    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Growth')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('Edit');
    fireEvent.click(editButtons[1]); // Edit "Growth"

    const input = screen.getByDisplayValue('Growth');
    fireEvent.change(input, { target: { value: 'Growth Stocks' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(assetStylesApi.updateAssetStyle).toHaveBeenCalledWith('2', 'Growth Stocks');
    });
  });

  it('shows delete confirmation dialog with reassignment', async () => {
    (axiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: { count: 5 } });

    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Growth')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[1]); // Delete "Growth"

    await waitFor(() => {
      expect(screen.getByText('Delete Asset Style')).toBeInTheDocument();
      expect(screen.getByText(/This asset style is used by 5 portfolios/)).toBeInTheDocument();
    });
  });

  it('deletes asset style with reassignment', async () => {
    (axiosInstance.get as jest.Mock).mockResolvedValueOnce({ data: { count: 3 } });
    (assetStylesApi.deleteAssetStyle as jest.Mock).mockResolvedValue(undefined);

    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Growth')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete');
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Delete Asset Style')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(assetStylesApi.deleteAssetStyle).toHaveBeenCalledWith('2', '1');
    });
  });

  it('displays usage count for each asset style', async () => {
    (axiosInstance.get as jest.Mock)
      .mockResolvedValueOnce({ data: { count: 5 } })
      .mockResolvedValueOnce({ data: { count: 3 } })
      .mockResolvedValueOnce({ data: { count: 0 } });

    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Used by 5 portfolios/)).toBeInTheDocument();
      expect(screen.getByText(/Used by 3 portfolios/)).toBeInTheDocument();
      expect(screen.getByText(/Used by 0 portfolios/)).toBeInTheDocument();
    });
  });

  it('shows error when creating duplicate asset style', async () => {
    const error = { code: 'DUPLICATE_ASSET_STYLE', message: 'Duplicate name' };
    (assetStylesApi.createAssetStyle as jest.Mock).mockRejectedValue(error);

    renderWithToast(<AssetStyleManagement open={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter asset style name')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Enter asset style name');
    const createButton = screen.getByRole('button', { name: /create/i });

    fireEvent.change(input, { target: { value: 'Default' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getAllByText(/An asset style with this name already exists/).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('does not render when closed', () => {
    renderWithToast(<AssetStyleManagement open={false} onClose={jest.fn()} />);
    expect(screen.queryByText('Manage Asset Styles')).not.toBeInTheDocument();
  });
});
