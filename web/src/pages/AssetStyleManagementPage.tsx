import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2, AlertCircle, Tag } from 'lucide-react';
import Layout from '../components/Layout';
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

interface AssetStyleWithUsage extends AssetStyle {
  usageCount: number;
}

const AssetStyleManagementPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [assetStyles, setAssetStyles] = useState<AssetStyleWithUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingStyle, setEditingStyle] = useState<AssetStyleWithUsage | null>(null);
  const [deletingStyle, setDeletingStyle] = useState<AssetStyleWithUsage | null>(null);
  const [newStyleName, setNewStyleName] = useState('');
  const [editStyleName, setEditStyleName] = useState('');
  const [reassignToStyleId, setReassignToStyleId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAssetStyles();
  }, []);

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
    <Layout>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Styles</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage custom labels to categorize your investments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          </div>
        )}

        {/* Create New Asset Style */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Asset Style
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newStyleName}
              onChange={(e) => setNewStyleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g., Growth Stocks, Value Stocks, Tech Sector"
              maxLength={50}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newStyleName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Asset styles help you organize your investments by custom categories like investment strategy, sector, or risk level.
          </p>
        </div>

        {/* Asset Styles List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Asset Styles
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : assetStyles.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-1">No asset styles yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Create your first asset style to start organizing your investments
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assetStyles.map((style) => (
                  <div
                    key={style.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                  >
                    {editingStyle?.id === style.id ? (
                      <>
                        <input
                          type="text"
                          value={editStyleName}
                          onChange={(e) => setEditStyleName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                          maxLength={50}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <div className="flex gap-2 ml-3">
                          <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                          >
                            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {style.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Used by {style.usageCount} {style.usageCount === 1 ? 'portfolio' : 'portfolios'}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleStartEdit(style)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                            aria-label="Edit"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStartDelete(style)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                            aria-label="Delete"
                            title="Delete"
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

        {/* Delete Confirmation Modal */}
        {deletingStyle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Delete Asset Style
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Are you sure you want to delete "{deletingStyle.name}"?
                    </p>
                  </div>
                </div>

                {deletingStyle.usageCount > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
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

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || (deletingStyle.usageCount > 0 && !reassignToStyleId)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
};

export default AssetStyleManagementPage;
