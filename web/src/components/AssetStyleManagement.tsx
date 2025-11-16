import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import {
  getAssetStyles,
  createAssetStyle,
  updateAssetStyle,
  deleteAssetStyle,
  AssetStyle,
} from '../api/assetStyles';
import axiosInstance from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage, isErrorType } from '../utils/errorHandler';

interface AssetStyleManagementProps {
  open: boolean;
  onClose: () => void;
}

interface AssetStyleWithUsage extends AssetStyle {
  usageCount: number;
}

const AssetStyleManagement: React.FC<AssetStyleManagementProps> = ({ open, onClose }) => {
  const { showSuccess, showError } = useToast();
  const [assetStyles, setAssetStyles] = useState<AssetStyleWithUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingStyle, setEditingStyle] = useState<AssetStyleWithUsage | null>(null);
  const [deletingStyle, setDeletingStyle] = useState<AssetStyleWithUsage | null>(null);
  const [newStyleName, setNewStyleName] = useState('');
  const [editStyleName, setEditStyleName] = useState('');
  const [reassignToStyleId, setReassignToStyleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAssetStyles();
    }
  }, [open]);

  const fetchAssetStyles = async () => {
    setLoading(true);
    setError(null);

    try {
      const styles = await getAssetStyles();
      
      // Fetch usage count for each style
      const stylesWithUsage = await Promise.all(
        styles.map(async (style) => {
          try {
            const response = await axiosInstance.get(`/api/portfolios/count-by-style/${style.id}`);
            return { ...style, usageCount: response.data.count || 0 };
          } catch {
            return { ...style, usageCount: 0 };
          }
        })
      );

      setAssetStyles(stylesWithUsage);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset styles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStyleName.trim()) {
      setError('Asset style name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createAssetStyle(newStyleName.trim());
      const styleName = newStyleName.trim();
      setNewStyleName('');
      await fetchAssetStyles();
      showSuccess('Asset style created', `"${styleName}" has been added successfully`);
    } catch (err: any) {
      const errorMessage = isErrorType(err, 'DUPLICATE_ASSET_STYLE')
        ? 'An asset style with this name already exists'
        : formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to create asset style', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (style: AssetStyleWithUsage) => {
    setEditingStyle(style);
    setEditStyleName(style.name);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingStyle(null);
    setEditStyleName('');
    setError(null);
  };

  const handleUpdate = async () => {
    if (!editingStyle || !editStyleName.trim()) {
      setError('Asset style name is required');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await updateAssetStyle(editingStyle.id, editStyleName.trim());
      const styleName = editStyleName.trim();
      setEditingStyle(null);
      setEditStyleName('');
      await fetchAssetStyles();
      showSuccess('Asset style updated', `"${styleName}" has been updated successfully`);
    } catch (err: any) {
      const errorMessage = isErrorType(err, 'DUPLICATE_ASSET_STYLE')
        ? 'An asset style with this name already exists'
        : formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to update asset style', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartDelete = (style: AssetStyleWithUsage) => {
    setDeletingStyle(style);
    setReassignToStyleId('');
    setError(null);
  };

  const handleCancelDelete = () => {
    setDeletingStyle(null);
    setReassignToStyleId('');
    setError(null);
  };

  const handleDelete = async () => {
    if (!deletingStyle) return;

    if (deletingStyle.usageCount > 0 && !reassignToStyleId) {
      setError('Please select an asset style to reassign portfolios to');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteAssetStyle(
        deletingStyle.id,
        deletingStyle.usageCount > 0 ? reassignToStyleId : undefined
      );
      const styleName = deletingStyle.name;
      setDeletingStyle(null);
      setReassignToStyleId('');
      await fetchAssetStyles();
      showSuccess('Asset style deleted', `"${styleName}" has been removed successfully`);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to delete asset style', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const availableStylesForReassignment = assetStyles.filter(
    (style) => style.id !== deletingStyle?.id
  );

  return (
    <>
      {/* Main Dialog */}
      <Dialog.Root open={open && !deletingStyle} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[calc(100%-2rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <Dialog.Title className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Manage Asset Styles
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

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Create New Asset Style */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
                  Create New Asset Style
                </h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Enter asset style name"
                    maxLength={50}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !newStyleName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create
                  </button>
                </div>
              </div>

              {/* Asset Styles List */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Your Asset Styles
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                ) : assetStyles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No asset styles yet. Create one to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assetStyles.map((style) => (
                      <div
                        key={style.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg gap-2"
                      >
                        {editingStyle?.id === style.id ? (
                          <>
                            <input
                              type="text"
                              value={editStyleName}
                              onChange={(e) => setEditStyleName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                              maxLength={50}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isUpdating}
                                className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {style.name}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Used by {style.usageCount} {style.usageCount === 1 ? 'portfolio' : 'portfolios'}
                              </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-center">
                              <button
                                onClick={() => handleStartEdit(style)}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                                aria-label="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleStartDelete(style)}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={!!deletingStyle} onOpenChange={(isOpen) => !isOpen && handleCancelDelete()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[calc(100%-2rem)] sm:w-full max-w-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-2 sm:gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Delete Asset Style
                  </Dialog.Title>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                    Are you sure you want to delete "{deletingStyle?.name}"?
                  </p>
                </div>
              </div>

              {deletingStyle && deletingStyle.usageCount > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    This asset style is used by {deletingStyle.usageCount}{' '}
                    {deletingStyle.usageCount === 1 ? 'portfolio' : 'portfolios'}. Please select a
                    replacement asset style to reassign them to:
                  </p>
                  <select
                    value={reassignToStyleId}
                    onChange={(e) => setReassignToStyleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an asset style...</option>
                    {availableStylesForReassignment.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || (!!deletingStyle && deletingStyle.usageCount > 0 && !reassignToStyleId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default AssetStyleManagement;
