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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
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
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Total Budgeted</Text>
              <Title level={3} style={{ margin: '8px 0', color: '#1890ff' }}>
                ${totalBudgeted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Total Spent</Text>
              <Title level={3} style={{ margin: '8px 0', color: totalSpent > totalBudgeted ? '#ff4d4f' : '#52c41a' }}>
                ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Title>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Over Budget</Text>
              <Title level={3} style={{ margin: '8px 0', color: overBudgetCount > 0 ? '#ff4d4f' : '#52c41a' }}>
                {overBudgetCount} {overBudgetCount === 1 ? 'Budget' : 'Budgets'}
              </Title>
            </div>
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
                actions={[
                  <Tooltip title="Edit" key="edit">
                    <EditOutlined onClick={() => handleOpenModal(budget)} />
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
                      <DeleteOutlined style={{ color: '#ff4d4f' }} />
                    </Tooltip>
                  </Popconfirm>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>{budget.name}</Title>
                      <Text type="secondary">{getCategoryName(budget.category_id)}</Text>
                    </div>
                    <Tag color={
                      budget.percentage >= 100 ? 'red' :
                      budget.percentage >= 80 ? 'orange' : 'green'
                    }>
                      {budgetPeriodLabels[budget.period_type]}
                    </Tag>
                  </div>
                </div>

                <Progress
                  percent={Math.min(budget.percentage, 100)}
                  status={getProgressStatus(budget.percentage)}
                  strokeColor={getProgressColor(budget.percentage)}
                  format={() => `${budget.percentage.toFixed(1)}%`}
                />

                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Text type="secondary">Spent</Text>
                    <div style={{ fontWeight: 'bold', color: getProgressColor(budget.percentage) }}>
                      ${budget.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Budget</Text>
                    <div style={{ fontWeight: 'bold' }}>
                      ${budget.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </Col>
                </Row>

                <div style={{ marginTop: 12, fontSize: 12, color: '#8c8c8c' }}>
                  Period: {dayjs(budget.period_start).format('MMM D')} - {dayjs(budget.period_end).format('MMM D, YYYY')}
                </div>

                {budget.remaining < 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Tag icon={<ExclamationCircleOutlined />} color="error">
                      Over by ${Math.abs(budget.remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Tag>
                  </div>
                )}

                {budget.allow_rollover && budget.rollover_amount !== 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">
                      Rollover: ${budget.rollover_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Tag>
                  </div>
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
