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
  Tabs,
  Table,
  Badge,
  Divider,
  InputNumber,
  Alert,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DataNode } from 'antd/es/tree';
import apiClient from '../api/client';
import { Category, CategoryType, CategoryKeywordWithCategory, MatchMode } from '../../shared/types';

const { Title, Text } = Typography;
const { Option } = Select;

const Categories: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const [keywordForm] = Form.useForm();
  const queryClient = useQueryClient();
  
  // Keyword management state
  const [activeTab, setActiveTab] = useState<string>('categories');
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<CategoryKeywordWithCategory | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

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

  // ===== KEYWORD MANAGEMENT =====
  
  // Fetch keywords
  const { data: keywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => apiClient.getKeywords({ limit: 500 }),
    enabled: activeTab === 'keywords',
  });

  // Fetch keywords count
  const { data: keywordsCount } = useQuery({
    queryKey: ['keywordsCount'],
    queryFn: () => apiClient.getKeywordsCount(),
  });

  // Fetch keyword suggestions
  const { data: suggestions, refetch: refetchSuggestions } = useQuery({
    queryKey: ['keywordSuggestions'],
    queryFn: () => apiClient.suggestKeywords(20),
    enabled: false,
  });

  // Create keyword mutation
  const createKeywordMutation = useMutation({
    mutationFn: (data: any) => apiClient.createKeyword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['keywordsCount'] });
      message.success('Keyword rule created successfully');
      handleCloseKeywordModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create keyword');
    },
  });

  // Update keyword mutation
  const updateKeywordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateKeyword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      message.success('Keyword rule updated successfully');
      handleCloseKeywordModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update keyword');
    },
  });

  // Delete keyword mutation
  const deleteKeywordMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['keywordsCount'] });
      message.success('Keyword rule deleted');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete keyword');
    },
  });

  // Delete all keywords mutation
  const deleteAllKeywordsMutation = useMutation({
    mutationFn: () => apiClient.deleteAllKeywords(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['keywordsCount'] });
      message.success(`${data.deleted_count} keyword rules deleted`);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete keywords');
    },
  });

  // Test keyword mutation
  const testKeywordMutation = useMutation({
    mutationFn: (text: string) => apiClient.testKeyword(text),
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to test keyword');
    },
  });

  // Re-categorize transactions mutation
  const [recategorizeResult, setRecategorizeResult] = useState<any>(null);
  const [showRecategorizeModal, setShowRecategorizeModal] = useState(false);
  const [recategorizeOptions, setRecategorizeOptions] = useState({
    onlyUncategorized: true,
    dryRun: true,
  });

  const recategorizeMutation = useMutation({
    mutationFn: (options: { onlyUncategorized: boolean; dryRun: boolean }) =>
      apiClient.recategorizeTransactions(options),
    onSuccess: (data) => {
      setRecategorizeResult(data);
      if (!data.dry_run && data.categorized > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        message.success(`Successfully categorized ${data.categorized} transaction(s)`);
      }
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to re-categorize transactions');
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

  // ===== KEYWORD MODAL HANDLERS =====
  
  const handleOpenKeywordModal = (keyword?: CategoryKeywordWithCategory) => {
    if (keyword) {
      setEditingKeyword(keyword);
      keywordForm.setFieldsValue({
        keyword: keyword.keyword,
        category_id: keyword.category_id,
        priority: keyword.priority,
        match_mode: keyword.match_mode,
      });
    } else {
      setEditingKeyword(null);
      keywordForm.resetFields();
      keywordForm.setFieldsValue({
        priority: 0,
        match_mode: 'contains',
      });
    }
    setIsKeywordModalOpen(true);
  };

  const handleCloseKeywordModal = () => {
    setIsKeywordModalOpen(false);
    setEditingKeyword(null);
    keywordForm.resetFields();
  };

  const handleKeywordSubmit = async (values: any) => {
    if (editingKeyword) {
      updateKeywordMutation.mutate({ id: editingKeyword.id, data: values });
    } else {
      createKeywordMutation.mutate(values);
    }
  };

  const handleTestKeyword = () => {
    if (testText.trim()) {
      testKeywordMutation.mutate(testText.trim());
    }
  };

  const handleCreateFromSuggestion = (suggestion: any) => {
    keywordForm.setFieldsValue({
      keyword: suggestion.keyword,
      priority: 0,
      match_mode: 'contains',
    });
    setIsKeywordModalOpen(true);
  };

  // Build flat category list for keyword select
  const flatCategories: { id: number; name: string; fullName: string; type: string }[] = [];
  categories.forEach((cat: Category) => {
    if (cat.subcategories) {
      cat.subcategories.forEach((sub: Category) => {
        flatCategories.push({
          id: sub.id,
          name: sub.name,
          fullName: `${cat.name} → ${sub.name}`,
          type: cat.category_type,
        });
      });
    }
  });

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

  // Keywords table columns
  const keywordColumns = [
    {
      title: 'Keyword',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: any, record: CategoryKeywordWithCategory) => (
        <span>
          {record.parent_category_name && <span style={{ color: '#8c8c8c' }}>{record.parent_category_name} → </span>}
          {record.category_name}
        </span>
      ),
    },
    {
      title: 'Match Mode',
      dataIndex: 'match_mode',
      key: 'match_mode',
      width: 120,
      render: (mode: MatchMode) => {
        const modeLabels = {
          contains: 'Contains',
          starts_with: 'Starts With',
          exact: 'Exact Match',
        };
        return <Tag>{modeLabels[mode]}</Tag>;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number) => priority > 0 ? <Badge count={priority} style={{ backgroundColor: '#52c41a' }} /> : '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: CategoryKeywordWithCategory) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenKeywordModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this keyword rule?"
            onConfirm={() => deleteKeywordMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Categories & Auto-Categorization</Title>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'categories',
            label: (
              <span>
                Categories
                <Badge count={incomeCount + expenseCount} style={{ marginLeft: 8, backgroundColor: '#1890ff' }} />
              </span>
            ),
            children: (
              <>
                {/* Category Management Controls */}
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
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
              </>
            ),
          },
          {
            key: 'keywords',
            label: (
              <span>
                <ThunderboltOutlined /> Auto-Categorization Rules
                <Badge 
                  count={keywordsCount?.user_defined || 0} 
                  style={{ marginLeft: 8, backgroundColor: '#52c41a' }} 
                />
              </span>
            ),
            children: (
              <>
                <Alert
                  message="Auto-Categorization Keywords"
                  description={
                    <span>
                      Define keywords that automatically assign categories when importing bank transactions.
                      Your custom rules take priority over the {keywordsCount?.builtin || 0}+ built-in keywords.
                    </span>
                  }
                  type="info"
                  showIcon
                  icon={<BulbOutlined />}
                  style={{ marginBottom: 16 }}
                />

                {/* Keyword Test Tool */}
                <Card 
                  title={<span><SearchOutlined /> Test Keyword Matching</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
                    <Input
                      placeholder="Enter a transaction description to test (e.g., 'STARBUCKS COFFEE')"
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      onPressEnter={handleTestKeyword}
                      allowClear
                    />
                    <Button 
                      type="primary" 
                      onClick={handleTestKeyword}
                      loading={testKeywordMutation.isPending}
                    >
                      Test
                    </Button>
                  </Space.Compact>
                  {testResult && (
                    <div style={{ marginTop: 12 }}>
                      {testResult.matched ? (
                        <Alert
                          type="success"
                          message={
                            <span>
                              <CheckCircleOutlined style={{ marginRight: 8 }} />
                              Matched! Keyword: <Tag color="blue">{testResult.matched_keyword}</Tag>
                              → Category: <strong>{testResult.category_name}</strong>
                              <Tag color={testResult.match_source === 'user' ? 'green' : 'default'} style={{ marginLeft: 8 }}>
                                {testResult.match_source === 'user' ? 'User Rule' : 'Built-in'}
                              </Tag>
                            </span>
                          }
                        />
                      ) : (
                        <Alert
                          type="warning"
                          message={
                            <span>
                              <QuestionCircleOutlined style={{ marginRight: 8 }} />
                              No matching keyword found. Consider adding a custom rule!
                            </span>
                          }
                        />
                      )}
                    </div>
                  )}
                </Card>

                {/* Re-categorize Existing Transactions */}
                <Card 
                  title={<span><ReloadOutlined /> Re-categorize Existing Transactions</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <Row gutter={16} align="middle">
                    <Col flex="auto">
                      <Text type="secondary">
                        Apply your keyword rules to existing transactions. Preview changes before applying.
                      </Text>
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          onClick={() => {
                            setRecategorizeOptions({ onlyUncategorized: true, dryRun: true });
                            setRecategorizeResult(null);
                            setShowRecategorizeModal(true);
                          }}
                        >
                          Re-categorize Uncategorized
                        </Button>
                        <Button
                          onClick={() => {
                            setRecategorizeOptions({ onlyUncategorized: false, dryRun: true });
                            setRecategorizeResult(null);
                            setShowRecategorizeModal(true);
                          }}
                        >
                          Re-categorize All
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Keywords Management */}
                <Card
                  title={
                    <Space>
                      <span>Your Keyword Rules</span>
                      <Badge count={keywordsCount?.user_defined || 0} style={{ backgroundColor: '#52c41a' }} />
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        icon={<BulbOutlined />}
                        onClick={() => refetchSuggestions()}
                      >
                        Get Suggestions
                      </Button>
                      {keywords.length > 0 && (
                        <Popconfirm
                          title="Delete all keyword rules?"
                          description="This will remove all your custom auto-categorization rules."
                          onConfirm={() => deleteAllKeywordsMutation.mutate()}
                          okText="Yes, Delete All"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Button danger icon={<DeleteOutlined />}>
                            Delete All
                          </Button>
                        </Popconfirm>
                      )}
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenKeywordModal()}>
                        Add Keyword Rule
                      </Button>
                    </Space>
                  }
                >
                  {/* Suggestions Section */}
                  {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">
                        Suggestions based on your uncategorized transactions:
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {suggestions.suggestions.slice(0, 10).map((s: any) => (
                          <Tag
                            key={s.keyword}
                            color="orange"
                            style={{ cursor: 'pointer', marginBottom: 4 }}
                            onClick={() => handleCreateFromSuggestion(s)}
                          >
                            <PlusOutlined /> {s.keyword} ({s.occurrence_count}x)
                          </Tag>
                        ))}
                      </div>
                      <Divider style={{ margin: '12px 0' }} />
                    </div>
                  )}

                  <Table
                    columns={keywordColumns}
                    dataSource={keywords}
                    rowKey="id"
                    loading={keywordsLoading}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} keyword rules`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          description={
                            <span>
                              No custom keyword rules yet.
                              <br />
                              Add rules to automatically categorize your imported transactions.
                            </span>
                          }
                        >
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenKeywordModal()}>
                            Create Your First Rule
                          </Button>
                        </Empty>
                      ),
                    }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />

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

      {/* Keyword Add/Edit Modal */}
      <Modal
        title={editingKeyword ? 'Edit Keyword Rule' : 'Add Keyword Rule'}
        open={isKeywordModalOpen}
        onCancel={handleCloseKeywordModal}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form form={keywordForm} layout="vertical" onFinish={handleKeywordSubmit}>
          <Alert
            message="How it works"
            description="When importing transactions, if the payee or description contains this keyword, the transaction will be automatically assigned to the selected category."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="keyword"
            label="Keyword"
            rules={[{ required: true, message: 'Please enter a keyword' }]}
            extra="Enter text that appears in transaction descriptions (e.g., 'walmart', 'netflix', 'payroll')"
          >
            <Input placeholder="e.g., starbucks" style={{ textTransform: 'lowercase' }} />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Assign to Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select 
              placeholder="Select category"
              showSearch
              optionFilterProp="label"
              options={flatCategories.map((cat) => ({
                value: cat.id,
                label: cat.fullName,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="match_mode"
                label="Match Mode"
                extra="How to match the keyword"
              >
                <Select>
                  <Select.Option value="contains">Contains (default)</Select.Option>
                  <Select.Option value="starts_with">Starts With</Select.Option>
                  <Select.Option value="exact">Exact Match</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                extra="Higher = checked first"
              >
                <InputNumber min={0} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseKeywordModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createKeywordMutation.isPending || updateKeywordMutation.isPending}
              >
                {editingKeyword ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Re-categorize Modal */}
      <Modal
        title="Re-categorize Transactions"
        open={showRecategorizeModal}
        onCancel={() => {
          setShowRecategorizeModal(false);
          setRecategorizeResult(null);
        }}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Alert
          message={recategorizeOptions.onlyUncategorized 
            ? "Re-categorize Uncategorized Transactions" 
            : "Re-categorize All Transactions"}
          description={recategorizeOptions.onlyUncategorized
            ? "This will apply keyword rules only to transactions that don't have a category assigned."
            : "Warning: This will re-evaluate ALL transactions and may change existing category assignments based on current keyword rules."}
          type={recategorizeOptions.onlyUncategorized ? "info" : "warning"}
          showIcon
          style={{ marginBottom: 16 }}
        />

        {!recategorizeResult ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Button
              type="primary"
              size="large"
              onClick={() => recategorizeMutation.mutate({ ...recategorizeOptions, dryRun: true })}
              loading={recategorizeMutation.isPending}
            >
              Preview Changes
            </Button>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Click to see what would be changed without applying</Text>
            </div>
          </div>
        ) : (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Transactions Scanned" value={recategorizeResult.processed} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic 
                    title={recategorizeResult.dry_run ? "Would Categorize" : "Categorized"}
                    value={recategorizeResult.categorized} 
                    valueStyle={{ color: recategorizeResult.categorized > 0 ? '#52c41a' : undefined }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic 
                    title="Status"
                    value={recategorizeResult.dry_run ? "Preview" : "Applied"}
                    valueStyle={{ color: recategorizeResult.dry_run ? '#faad14' : '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            {recategorizeResult.changes && recategorizeResult.changes.length > 0 ? (
              <>
                <Title level={5}>Changes {recategorizeResult.dry_run ? '(Preview)' : '(Applied)'}</Title>
                <Table
                  dataSource={recategorizeResult.changes}
                  rowKey="transaction_id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'date',
                      key: 'date',
                      width: 100,
                    },
                    {
                      title: 'Payee',
                      dataIndex: 'payee',
                      key: 'payee',
                      ellipsis: true,
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      width: 100,
                      render: (v: number) => `$${v.toFixed(2)}`,
                    },
                    {
                      title: 'Old Category',
                      dataIndex: 'old_category',
                      key: 'old_category',
                      render: (v: string | null) => v || <Tag color="default">None</Tag>,
                    },
                    {
                      title: '',
                      key: 'arrow',
                      width: 30,
                      render: () => '→',
                    },
                    {
                      title: 'New Category',
                      dataIndex: 'new_category',
                      key: 'new_category',
                      render: (v: string) => <Tag color="green">{v}</Tag>,
                    },
                  ]}
                />
                
                {recategorizeResult.dry_run && recategorizeResult.categorized > 0 && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Space>
                      <Button onClick={() => {
                        setRecategorizeResult(null);
                      }}>
                        Cancel
                      </Button>
                      <Popconfirm
                        title="Apply these changes?"
                        description={`This will update ${recategorizeResult.categorized} transaction(s).`}
                        onConfirm={() => recategorizeMutation.mutate({ ...recategorizeOptions, dryRun: false })}
                        okText="Yes, Apply"
                        cancelText="No"
                      >
                        <Button type="primary" loading={recategorizeMutation.isPending}>
                          Apply {recategorizeResult.categorized} Change(s)
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                )}
              </>
            ) : (
              <Empty description="No transactions would be changed" />
            )}

            {!recategorizeResult.dry_run && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button type="primary" onClick={() => {
                  setShowRecategorizeModal(false);
                  setRecategorizeResult(null);
                }}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Categories;
