import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2, AlertCircle, Tag, Check, X } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Asset Styles</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your investments with custom categories
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Create New Asset Style */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Create New Style</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newStyleName}
              onChange={(e) => setNewStyleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g., Growth Stocks, Value Stocks, Tech Sector"
              maxLength={50}
              className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newStyleName.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium"
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
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-lg">Your Styles</h3>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : assetStyles.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-1">No asset styles yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first style to start organizing
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assetStyles.map((style) => (
                  <div
                    key={style.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-accent/50 hover:bg-accent transition-colors"
                  >
                    {editingStyle?.id === style.id ? (
                      <>
                        <input
                          type="text"
                          value={editStyleName}
                          onChange={(e) => setEditStyleName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                          maxLength={50}
                          className="flex-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                        />
                        <div className="flex gap-2 ml-3">
                          <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className="p-2 border rounded-lg hover:bg-accent transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {style.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {style.usageCount} {style.usageCount === 1 ? 'portfolio' : 'portfolios'}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={() => handleStartEdit(style)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-background rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStartDelete(style)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-background rounded-lg transition-colors"
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
            <div className="bg-card rounded-xl shadow-xl w-full max-w-md border">
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      Delete Asset Style
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to delete "{deletingStyle.name}"?
                    </p>
                  </div>
                </div>

                {deletingStyle.usageCount > 0 && (
                  <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 mb-3">
                      This style is used by {deletingStyle.usageCount}{' '}
                      {deletingStyle.usageCount === 1 ? 'portfolio' : 'portfolios'}. Select a replacement:
                    </p>
                    <select
                      value={reassignToStyleId}
                      onChange={(e) => setReassignToStyleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a style...</option>
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
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-accent transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || (deletingStyle.usageCount > 0 && !reassignToStyleId)}
                    className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 font-medium"
                  >
                    {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AssetStyleManagementPage;
