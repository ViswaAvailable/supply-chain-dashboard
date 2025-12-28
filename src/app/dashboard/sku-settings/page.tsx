'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSKUs, useCategories } from '@/lib/hooks/useForecastData';
import { useUpdateSKU, useBulkUpdateSKUs, useCreateCategory, useDeleteCategory } from '@/lib/hooks/useSKUMutations';
import { getCategoryColor, formatINR } from '@/lib/forecast-utils';
import { Search, Save, Plus, Trash2, RefreshCw, Settings, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { SKU, Category } from '@/lib/types';

interface SKUEdit {
  min_quantity?: number;
  category_id?: string;
}

export default function SKUSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pendingChanges, setPendingChanges] = useState<Map<string, SKUEdit>>(new Map());
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { data: skus = [], isLoading, refetch } = useSKUs();
  const { data: categories = [] } = useCategories();

  const updateSKU = useUpdateSKU();
  const bulkUpdateSKUs = useBulkUpdateSKUs();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  // Filter out new products (those are handled separately)
  const regularSKUs = useMemo(() => {
    return skus.filter(s => !s.is_new_product);
  }, [skus]);

  // Apply filters
  const filteredSKUs = useMemo(() => {
    return regularSKUs.filter(sku => {
      // Category filter
      if (categoryFilter === 'uncategorized') {
        // Show only SKUs without a category
        if (sku.category_id !== null && sku.category_id !== undefined) return false;
      } else if (categoryFilter !== 'all') {
        if (sku.category_id !== categoryFilter) return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = sku.name.toLowerCase().includes(query);
        const matchesCategory = sku.category?.name.toLowerCase().includes(query);
        
        if (!matchesName && !matchesCategory) return false;
      }
      
      return true;
    });
  }, [regularSKUs, categoryFilter, searchQuery]);

  // Get current value (pending change or original)
  const getCurrentValue = (sku: SKU, field: keyof SKUEdit) => {
    const pending = pendingChanges.get(sku.id);
    if (pending && pending[field] !== undefined) {
      return pending[field];
    }
    return sku[field];
  };

  // Handle field change
  const handleFieldChange = (skuId: string, field: keyof SKUEdit, value: number | string) => {
    const newChanges = new Map(pendingChanges);
    const existing = newChanges.get(skuId) || {};
    newChanges.set(skuId, { ...existing, [field]: value });
    setPendingChanges(newChanges);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = pendingChanges.size > 0;

  // Save all changes
  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) return;

    const updates = Array.from(pendingChanges.entries()).map(([id, data]) => ({
      id,
      data,
    }));

    try {
      await bulkUpdateSKUs.mutateAsync(updates);
      setPendingChanges(new Map());
      toast.success(`${updates.length} SKU(s) updated successfully`);
    } catch (error) {
      toast.error('Failed to save changes. Please try again.');
      console.error(error);
    }
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      await createCategory.mutateAsync(newCategoryName.trim());
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      toast.success('Category created successfully');
    } catch (error) {
      toast.error('Failed to create category. Please try again.');
      console.error(error);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category. Please try again.');
      console.error(error);
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const withMinQty = regularSKUs.filter(s => s.min_quantity > 0).length;
    const withCategory = regularSKUs.filter(s => s.category_id).length;
    const totalValue = regularSKUs.reduce((sum, s) => sum + (s.avg_forecast * s.price_per_unit), 0);
    
    return { withMinQty, withCategory, totalValue };
  }, [regularSKUs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading SKU settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SKU Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure minimum quantities and categories for your products
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsManageCategoriesOpen(true)} 
            variant="outline" 
            size="sm"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={!hasUnsavedChanges || bulkUpdateSKUs.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {bulkUpdateSKUs.isPending ? 'Saving...' : `Save Changes${hasUnsavedChanges ? ` (${pendingChanges.size})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Unsaved changes warning */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <Settings className="h-5 w-5" />
            <span>You have {pendingChanges.size} unsaved change(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setPendingChanges(new Map())}
            >
              Discard
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveAll}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Save Now
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total SKUs</p>
            <p className="text-2xl font-bold">{regularSKUs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">With Min Quantity</p>
            <p className="text-2xl font-bold">{stats.withMinQty}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Daily Value</p>
            <p className="text-2xl font-bold">{formatINR(stats.totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SKU Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Product Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>SKU Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Avg Forecast</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Min Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSKUs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No SKUs matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredSKUs.map((sku) => {
                  const currentCategory = getCurrentValue(sku, 'category_id') as string;
                  const currentMinQty = getCurrentValue(sku, 'min_quantity') as number;
                  const hasChanges = pendingChanges.has(sku.id);
                  const categoryColor = sku.category ? getCategoryColor(sku.category.name) : null;

                  return (
                    <TableRow 
                      key={sku.id} 
                      className={hasChanges ? 'bg-amber-50/50' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sku.name}</span>
                          {hasChanges && (
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                              Modified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={currentCategory || 'none'} 
                          onValueChange={(v) => handleFieldChange(sku.id, 'category_id', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue>
                              {currentCategory ? (
                                <Badge className={`${categoryColor?.bg || 'bg-gray-100'} ${categoryColor?.text || 'text-gray-800'} border-0`}>
                                  {categories.find(c => c.id === currentCategory)?.name || sku.category?.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Select category</span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                            <div className="border-t mt-1 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setIsCategoryModalOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Category
                              </Button>
                            </div>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sku.avg_forecast.toLocaleString('en-IN')} units
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatINR(sku.price_per_unit)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={currentMinQty}
                          onChange={(e) => handleFieldChange(sku.id, 'min_quantity', parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your SKUs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              placeholder="e.g., Seasonal Specials"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCategory}
              disabled={createCategory.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {createCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Modal */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              View, create, and delete product categories.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Add new category */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button 
                onClick={handleCreateCategory}
                disabled={createCategory.isPending || !newCategoryName.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Category list */}
            <div className="border rounded-lg divide-y">
              {categories.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No categories created yet
                </div>
              ) : (
                categories.map((cat) => {
                  const skuCount = regularSKUs.filter(s => s.category_id === cat.id).length;
                  const categoryColor = getCategoryColor(cat.name);
                  
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`${categoryColor.bg} ${categoryColor.text} border-0`}>
                          {cat.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {skuCount} SKU{skuCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={deleteCategory.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManageCategoriesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

