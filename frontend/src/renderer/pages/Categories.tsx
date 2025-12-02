import React, { useState } from 'react';
import {
  Typography,
  Tree,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Card,
  Row,
  Col,
  message,
  Popconfirm,
  Tooltip,
  ColorPicker,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataNode } from 'antd/es/tree';
import apiClient from '../api/client';
import { Category, CategoryType } from '../../shared/types';

const { Title, Text } = Typography;
const { Option } = Select;

const Categories: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Category created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Category updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Category deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete category');
    },
  });

  // Reset categories mutation
  const resetMutation = useMutation({
    mutationFn: () => apiClient.resetCategories(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success(`Categories reset successfully. ${data.categories_created} categories created.`);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to reset categories');
    },
  });

  // Delete all categories mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.deleteAllCategories(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success(`${data.categories_deleted} categories deleted.`);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete categories');
    },
  });

  // Delete categories by type mutation
  const deleteByTypeMutation = useMutation({
    mutationFn: (categoryType: 'income' | 'expense') => apiClient.deleteCategoriesByType(categoryType),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success(`${data.categories_deleted} categories deleted.`);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete categories');
    },
  });

  const handleOpenModal = (category?: Category, parent?: Category) => {
    if (category) {
      setEditingCategory(category);
      setParentCategory(null);
      form.setFieldsValue({
        ...category,
        color: category.color || '#1890ff',
      });
    } else {
      setEditingCategory(null);
      setParentCategory(parent || null);
      form.resetFields();
      form.setFieldsValue({
        category_type: parent?.category_type || CategoryType.EXPENSE,
        color: '#1890ff',
        parent_id: parent?.id,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setParentCategory(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      color: typeof values.color === 'string' ? values.color : values.color?.toHexString(),
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Convert categories to tree data
  const convertToTreeData = (cats: Category[], isChild: boolean = false): DataNode[] => {
    return cats.map((cat) => ({
      key: cat.id,
      title: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          width: '100%', 
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
        }}>
          <Space>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: cat.color || '#1890ff',
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: isChild ? 'normal' : 500 }}>{cat.name}</span>
            {cat.is_system && <Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>System</Tag>}
            {!cat.is_active && <Tag color="default" style={{ fontSize: 10, marginLeft: 4 }}>Inactive</Tag>}
          </Space>
          <Space size={0}>
            {!cat.parent_id && (
              <Tooltip title="Add Subcategory">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(undefined, cat);
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(cat);
                }}
              />
            </Tooltip>
            {/* Allow deletion of: non-system categories OR system subcategories (has parent_id) */}
            {(!cat.is_system || cat.parent_id) && (
              <Popconfirm
                title="Delete Category"
                description={cat.parent_id 
                  ? "Are you sure you want to delete this subcategory?" 
                  : "Are you sure you want to delete this category and all its subcategories?"}
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(cat.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        </div>
      ),
      children: cat.subcategories?.length ? convertToTreeData(cat.subcategories, true) : undefined,
    }));
  };

  const incomeCategories = categories.filter((c: Category) => c.category_type === 'income' && !c.parent_id);
  const expenseCategories = categories.filter((c: Category) => c.category_type === 'expense' && !c.parent_id);

  const incomeCount = categories.filter((c: Category) => c.category_type === 'income').length;
  const expenseCount = categories.filter((c: Category) => c.category_type === 'expense').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Categories</Title>
        <Space>
          <Popconfirm
            title="Delete All Categories"
            description="This will permanently delete ALL categories (income and expense). Are you sure?"
            onConfirm={() => deleteAllMutation.mutate()}
            okText="Yes, Delete All"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleteAllMutation.isPending}>
              Delete All
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Reset Categories"
            description="This will delete all categories and restore the default presets. Are you sure?"
            onConfirm={() => resetMutation.mutate()}
            okText="Yes, Reset"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<ReloadOutlined />} loading={resetMutation.isPending}>
              Reset to Defaults
            </Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Category
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>INCOME</Tag>
              <Title level={3} style={{ margin: '8px 0' }}>{incomeCount}</Title>
              <Text type="secondary">Categories</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>EXPENSE</Tag>
              <Title level={3} style={{ margin: '8px 0' }}>{expenseCount}</Title>
              <Text type="secondary">Categories</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Category Trees */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <Tag color="green">INCOME</Tag>
                <Text>Income Categories</Text>
              </Space>
            }
            extra={
              <Space>
                <Popconfirm
                  title="Delete Income Categories"
                  description="This will delete all income categories. Are you sure?"
                  onConfirm={() => deleteByTypeMutation.mutate('income')}
                  okText="Yes, Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={deleteByTypeMutation.isPending}
                  >
                    Delete All
                  </Button>
                </Popconfirm>
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    form.setFieldsValue({ category_type: CategoryType.INCOME });
                    handleOpenModal();
                  }}
                >
                  Add
                </Button>
              </Space>
            }
          >
            {incomeCategories.length === 0 ? (
              <Empty description="No income categories" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Tree
                defaultExpandAll
                treeData={convertToTreeData(incomeCategories)}
                blockNode
                style={{ background: 'transparent' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Tag color="red">EXPENSE</Tag>
                <Text>Expense Categories</Text>
              </Space>
            }
            extra={
              <Space>
                <Popconfirm
                  title="Delete Expense Categories"
                  description="This will delete all expense categories. Are you sure?"
                  onConfirm={() => deleteByTypeMutation.mutate('expense')}
                  okText="Yes, Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={deleteByTypeMutation.isPending}
                  >
                    Delete All
                  </Button>
                </Popconfirm>
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    form.setFieldsValue({ category_type: CategoryType.EXPENSE });
                    handleOpenModal();
                  }}
                >
                  Add
                </Button>
              </Space>
            }
          >
            {expenseCategories.length === 0 ? (
              <Empty description="No expense categories" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Tree
                defaultExpandAll
                treeData={convertToTreeData(expenseCategories)}
                blockNode
                style={{ background: 'transparent' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal
        title={
          editingCategory
            ? 'Edit Category'
            : parentCategory
            ? `Add Subcategory to "${parentCategory.name}"`
            : 'Add Category'
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g., Groceries" />
          </Form.Item>

          {!parentCategory && !editingCategory?.parent_id && (
            <Form.Item
              name="category_type"
              label="Category Type"
              rules={[{ required: true, message: 'Please select category type' }]}
            >
              <Select placeholder="Select category type" disabled={!!editingCategory}>
                <Option value={CategoryType.INCOME}>
                  <Space>
                    <Tag color="green">Income</Tag>
                    Money coming in
                  </Space>
                </Option>
                <Option value={CategoryType.EXPENSE}>
                  <Space>
                    <Tag color="red">Expense</Tag>
                    Money going out
                  </Space>
                </Option>
              </Select>
            </Form.Item>
          )}

          {parentCategory && (
            <Form.Item name="parent_id" hidden>
              <Input />
            </Form.Item>
          )}

          {parentCategory && (
            <Form.Item name="category_type" hidden>
              <Input />
            </Form.Item>
          )}

          <Form.Item name="color" label="Color">
            <ColorPicker
              showText
              format="hex"
              presets={[
                {
                  label: 'Recommended',
                  colors: [
                    '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#fa8c16',
                    '#13c2c2', '#f5222d', '#faad14', '#2f54eb', '#a0d911',
                  ],
                },
              ]}
            />
          </Form.Item>

          <Form.Item name="icon" label="Icon (optional)">
            <Input placeholder="e.g., shopping-cart" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categories;
