import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ItemMaster } from '@shared/types';
import './ItemMaster.css';

interface Props {
  companyId: string;
}

const NEW_MODEL_OPTION = '__new_model__';

const ItemMasterPage: React.FC<Props> = ({ companyId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    cgstPercent: 9,
    sgstPercent: 9,
  });
  const [selectedModel, setSelectedModel] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const existingModels = useMemo(
    () => Array.from(new Set(items.map((item) => item.model))).sort(),
    [items]
  );

  useEffect(() => {
    loadItems();
  }, [companyId]);

  const loadItems = async () => {
    try {
      const data = await window.electronAPI.getItems({ companyId });
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    const shouldUseNewModel =
      existingModels.length === 0 || selectedModel === NEW_MODEL_OPTION;
    const modelToSave = shouldUseNewModel
      ? newModelName.trim()
      : selectedModel.trim();

    if (!modelToSave || !formData.type.trim()) {
      alert('Please fill all fields');
      return;
    }

    try {
      await window.electronAPI.addItem({
        companyId,
        model: modelToSave,
        type: formData.type.trim(),
        cgstPercent: formData.cgstPercent,
        sgstPercent: formData.sgstPercent,
      });

      closeAddModal();
      await loadItems();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    }
  };

  const openAddModal = (initialItem?: Partial<ItemMaster>) => {
    const initialModel = initialItem?.model?.trim() || '';
    const hasInitialModel = initialModel.length > 0;
    const isExistingModel = hasInitialModel && existingModels.includes(initialModel);

    setFormData({
      type: initialItem?.type || '',
      cgstPercent: initialItem?.cgstPercent ?? 9,
      sgstPercent: initialItem?.sgstPercent ?? 9,
    });

    if (hasInitialModel) {
      setSelectedModel(isExistingModel ? initialModel : NEW_MODEL_OPTION);
      setNewModelName(isExistingModel ? '' : initialModel);
    } else {
      setSelectedModel(existingModels[0] || NEW_MODEL_OPTION);
      setNewModelName('');
    }

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormData({ type: '', cgstPercent: 9, sgstPercent: 9 });
    setSelectedModel('');
    setNewModelName('');
  };

  const handleEdit = (item: ItemMaster) => {
    setEditingId(item.id);
  };

  const handleSaveEdit = async (item: ItemMaster) => {
    try {
      await window.electronAPI.updateItem({
        id: item.id,
        model: item.model,
        type: item.type,
        cgstPercent: item.cgstPercent,
        sgstPercent: item.sgstPercent,
      });
      setEditingId(null);
      await loadItems();
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await window.electronAPI.deleteItem({ id });
      await loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  const handleFieldChange = (id: string, field: keyof ItemMaster, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  if (loading) {
    return <div className="page-container loading">Loading items...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Item Master</h1>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            onClick={openAddModal}
          >
            + Add Item
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No items found. Click "Add Item" to create your first item.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Type</th>
                  <th>CGST %</th>
                  <th>SGST %</th>
                  <th>Total GST %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => openAddModal(item)}
                    className={editingId === item.id ? 'editing' : ''}
                  >
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="form-input"
                          value={item.model}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'model', e.target.value)
                          }
                        />
                      ) : (
                        item.model
                      )}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="form-input"
                          value={item.type}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'type', e.target.value)
                          }
                        />
                      ) : (
                        item.type
                      )}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="form-input"
                          value={item.cgstPercent}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'cgstPercent',
                              parseFloat(e.target.value)
                            )
                          }
                          step="0.1"
                        />
                      ) : (
                        `${item.cgstPercent}%`
                      )}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="form-input"
                          value={item.sgstPercent}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'sgstPercent',
                              parseFloat(e.target.value)
                            )
                          }
                          step="0.1"
                        />
                      ) : (
                        `${item.sgstPercent}%`
                      )}
                    </td>
                    <td>
                      {(item.cgstPercent + item.sgstPercent).toFixed(1)}%
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <div className="action-buttons-inline">
                          <button
                            className="btn-small btn-success"
                            onClick={() => handleSaveEdit(item)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons-inline">
                          <button
                            className="btn-small btn-primary"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Item</h2>
              <button
                className="close-btn"
                onClick={closeAddModal}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Model</label>
                {existingModels.length > 0 ? (
                  <>
                    <select
                      className="form-input"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      {existingModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                      <option value={NEW_MODEL_OPTION}>Add New Model</option>
                    </select>
                    {selectedModel === NEW_MODEL_OPTION && (
                      <input
                        type="text"
                        className="form-input"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="Enter new model name"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Enter new model name"
                  />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  placeholder="e.g., 12V 65Ah"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CGST %</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.cgstPercent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cgstPercent: parseFloat(e.target.value),
                      })
                    }
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SGST %</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.sgstPercent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sgstPercent: parseFloat(e.target.value),
                      })
                    }
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeAddModal}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddItem}>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMasterPage;
