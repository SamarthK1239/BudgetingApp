import React, { useState } from 'react';
import {
  Typography,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Progress,
  message,
  Popconfirm,
  Tooltip,
  Switch,
  Empty,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { BudgetWithProgress, BudgetPeriod, Category } from '../../shared/types';

const { Title, Text } = Typography;
const { Option } = Select;

const budgetPeriodLabels: Record<BudgetPeriod, string> = {
  [BudgetPeriod.WEEKLY]: 'Weekly',
  [BudgetPeriod.MONTHLY]: 'Monthly',
  [BudgetPeriod.QUARTERLY]: 'Quarterly',
  [BudgetPeriod.ANNUAL]: 'Annual',
};

const budgetPeriodColors: Record<BudgetPeriod, string> = {
  [BudgetPeriod.WEEKLY]: 'cyan',
  [BudgetPeriod.MONTHLY]: 'blue',
  [BudgetPeriod.QUARTERLY]: 'purple',
  [BudgetPeriod.ANNUAL]: 'magenta',
};

const getProgressStatus = (percentage: number): 'success' | 'normal' | 'exception' => {
  if (percentage >= 100) return 'exception';
  if (percentage >= 80) return 'normal';
  return 'success';
};

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return '#ff4d4f';
  if (percentage >= 80) return '#faad14';
  return '#52c41a';
};

const Budgets: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch budgets with progress
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets-progress'],
    queryFn: () => apiClient.getBudgetsWithProgress(),
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
      message.success('Budget created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create budget');
    },
  });

  // Update budget mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
      message.success('Budget updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update budget');
    },
  });

  // Delete budget mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets-progress'] });
      message.success('Budget deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete budget');
    },
  });

  const handleOpenModal = (budget?: BudgetWithProgress) => {
    if (budget) {
      setEditingBudget(budget);
      form.setFieldsValue({
        ...budget,
        start_date: dayjs(budget.start_date),
      });
    } else {
      setEditingBudget(null);
      form.resetFields();
      form.setFieldsValue({
        start_date: dayjs().startOf('month'),
        period_type: BudgetPeriod.MONTHLY,
        allow_rollover: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      start_date: values.start_date.format('YYYY-MM-DD'),
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const findCategory = (cats: Category[]): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === categoryId) return cat;
        if (cat.subcategories) {
          const found = findCategory(cat.subcategories);
          if (found) return found;
        }
      }
      return undefined;
    };
    const category = findCategory(categories);
    return category?.name || 'Unknown';
  };

  // Get expense categories only (for budgets)
  const expenseCategories = categories.filter((c: Category) => c.category_type === 'expense');

  // Calculate summary stats
  const totalBudgeted = budgets.reduce((sum: number, b: BudgetWithProgress) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum: number, b: BudgetWithProgress) => sum + b.spent, 0);
  const overBudgetCount = budgets.filter((b: BudgetWithProgress) => b.percentage >= 100).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Budgets</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Add Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Budgeted"
              value={totalBudgeted}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Spent"
              value={totalSpent}
              precision={2}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: totalSpent > totalBudgeted ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Over Budget"
              value={overBudgetCount}
              suffix={overBudgetCount === 1 ? 'Budget' : 'Budgets'}
              prefix={<WarningOutlined />}
              valueStyle={{ color: overBudgetCount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Budget Cards Grid */}
      {budgets.length === 0 && !isLoading ? (
        <Card>
          <Empty
            description="No budgets yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => handleOpenModal()}>
              Create Your First Budget
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {budgets.map((budget: BudgetWithProgress) => (
            <Col xs={24} sm={12} lg={8} key={budget.id}>
              <Card
                hoverable
                style={{ height: '100%' }}
                styles={{ 
                  body: { paddingBottom: 16 },
                  actions: { borderTop: 'none', background: 'transparent' }
                }}
                actions={[
                  <Tooltip title="Edit" key="edit">
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(budget)} />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="Delete Budget"
                    description="Are you sure you want to delete this budget?"
                    onConfirm={() => handleDelete(budget.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Tooltip title="Delete">
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>,
                ]}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <Title level={4} style={{ margin: 0, marginBottom: 4 }}>{budget.name}</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>{getCategoryName(budget.category_id)}</Text>
                  </div>
                  <Tag color={budgetPeriodColors[budget.period_type]} style={{ margin: 0 }}>
                    {budgetPeriodLabels[budget.period_type]}
                  </Tag>
                </div>

                {/* Progress Section */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: getProgressColor(budget.percentage), fontWeight: 600 }}>
                      ${budget.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: 500 }}>
                      ${budget.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </div>
                  <Progress
                    percent={Math.min(budget.percentage, 100)}
                    status={getProgressStatus(budget.percentage)}
                    strokeColor={getProgressColor(budget.percentage)}
                    strokeWidth={10}
                    showInfo={false}
                    style={{ marginBottom: 4 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Spent</Text>
                    <Text style={{ 
                      fontSize: 13, 
                      fontWeight: 600,
                      color: getProgressColor(budget.percentage)
                    }}>
                      {budget.percentage.toFixed(1)}%
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>Budget</Text>
                  </div>
                </div>

                {/* Period Info */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 6,
                  marginBottom: budget.remaining < 0 || (budget.allow_rollover && budget.rollover_amount !== 0) ? 12 : 0
                }}>
                  <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                  <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {dayjs(budget.period_start).format('MMM D')} - {dayjs(budget.period_end).format('MMM D, YYYY')}
                  </Text>
                </div>

                {/* Status Tags */}
                {budget.remaining < 0 && (
                  <Tag icon={<ExclamationCircleOutlined />} color="error" style={{ marginTop: 0 }}>
                    Over by ${Math.abs(budget.remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Tag>
                )}

                {budget.allow_rollover && budget.rollover_amount !== 0 && (
                  <Tag color="blue" style={{ marginTop: budget.remaining < 0 ? 8 : 0 }}>
                    Rollover: ${budget.rollover_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Tag>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingBudget ? 'Edit Budget' : 'Add Budget'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Budget Name"
            rules={[{ required: true, message: 'Please enter budget name' }]}
          >
            <Input placeholder="e.g., Groceries Budget" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Select category" showSearch optionFilterProp="children">
              {expenseCategories.map((cat: Category) => (
                <React.Fragment key={cat.id}>
                  <Option value={cat.id} disabled={!!cat.subcategories?.length}>
                    <strong>{cat.name}</strong>
                  </Option>
                  {cat.subcategories?.map((sub: Category) => (
                    <Option key={sub.id} value={sub.id}>
                      &nbsp;&nbsp;&nbsp;&nbsp;{sub.name}
                    </Option>
                  ))}
                </React.Fragment>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Budget Amount"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="period_type"
                label="Budget Period"
                rules={[{ required: true, message: 'Please select period' }]}
              >
                <Select placeholder="Select period">
                  {Object.entries(budgetPeriodLabels).map(([value, label]) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="start_date"
            label="Start Date"
            rules={[{ required: true, message: 'Please select start date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="allow_rollover"
            label="Allow Rollover"
            valuePropName="checked"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingBudget ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Budgets;
