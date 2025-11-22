import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { getAssetStyles, AssetStyle } from '../api/assetStyles';
import { Portfolio } from '../api/portfolios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';

interface EditAssetMetadataDialogProps {
  open: boolean;
  portfolio: Portfolio | null;
  onSave: (assetStyleId: string, assetClass: string) => Promise<void>;
  onCancel: () => void;
}

type AssetClass = 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents';

const EditAssetMetadataDialog: React.FC<EditAssetMetadataDialogProps> = ({
  open,
  portfolio,
  onSave,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [assetStyles, setAssetStyles] = useState<AssetStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<AssetClass>('Stock');
  const [loading, setLoading] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if the portfolio is a cash holding
  const isCashSymbol = (symbol: string): boolean => {
    return symbol === 'CASH_USD' || symbol === 'CASH_RMB';
  };

  const isCash = portfolio ? isCashSymbol(portfolio.symbol) : false;

  useEffect(() => {
    if (open && portfolio) {
      loadAssetStyles();
      // For cash, always set to "Cash and Equivalents"
      if (isCashSymbol(portfolio.symbol)) {
        setSelectedClass('Cash and Equivalents');
      } else {
        setSelectedClass(portfolio.assetClass || 'Stock');
      }
    }
  }, [open, portfolio]);

  const loadAssetStyles = async () => {
    setLoadingStyles(true);
    setError(null);
    try {
      const styles = await getAssetStyles();
      setAssetStyles(styles);
      
      // Set the selected style ID after loading styles
      if (portfolio?.assetStyleId) {
        setSelectedStyleId(portfolio.assetStyleId);
      } else if (styles.length > 0) {
        // If no style is set, select the first one
        setSelectedStyleId(styles[0].id);
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to load asset styles', errorMessage);
    } finally {
      setLoadingStyles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStyleId) {
      setError('Please select an asset style');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(selectedStyleId, selectedClass);
      handleClose();
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      // Don't show toast here as the parent component will handle it
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onCancel();
  };

  const handleManageStyles = () => {
    navigate('/asset-styles');
    handleClose();
  };

  if (!portfolio) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[calc(100%-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50">
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <Dialog.Title className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Edit Asset Classification
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              Update the classification for <span className="font-semibold text-gray-900 dark:text-white">{portfolio.symbol}</span>.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {loadingStyles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Asset Style */}
                <div>
                  <label htmlFor="assetStyle" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Asset Style *
                  </label>
                  <select
                    id="assetStyle"
                    value={selectedStyleId}
                    onChange={(e) => setSelectedStyleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={assetStyles.length === 0}
                  >
                    {assetStyles.length === 0 ? (
                      <option value="">No asset styles available</option>
                    ) : (
                      assetStyles.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleManageStyles}
                    className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Manage Asset Styles
                  </button>
                </div>

                {/* Asset Class */}
                <div>
                  <label htmlFor="assetClass" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Asset Class *
                  </label>
                  <select
                    id="assetClass"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value as AssetClass)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isCash}
                  >
                    <option value="Stock">Stock</option>
                    <option value="ETF">ETF</option>
                    <option value="Bond">Bond</option>
                    <option value="Cash and Equivalents">Cash and Equivalents</option>
                  </select>
                  {isCash && (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Cash holdings must be classified as "Cash and Equivalents"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors order-2 sm:order-1"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 order-1 sm:order-2"
                    disabled={loading || assetStyles.length === 0}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default EditAssetMetadataDialog;
