import React, { useState } from 'react';
import {
  Typography,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Space,
  Card,
  Row,
  Col,
  Progress,
  message,
  Popconfirm,
  Tooltip,
  Select,
  Empty,
  Statistic,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TrophyOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  WalletOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { GoalWithProgress, GoalStatus, GoalSummary, Account, IncomeSummary, BudgetWithProgress } from '../../shared/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const goalStatusLabels: Record<GoalStatus, string> = {
  [GoalStatus.NOT_STARTED]: 'Not Started',
  [GoalStatus.IN_PROGRESS]: 'In Progress',
  [GoalStatus.COMPLETED]: 'Completed',
  [GoalStatus.PAUSED]: 'Paused',
  [GoalStatus.CANCELLED]: 'Cancelled',
};

const goalStatusColors: Record<GoalStatus, string> = {
  [GoalStatus.NOT_STARTED]: 'default',
  [GoalStatus.IN_PROGRESS]: 'blue',
  [GoalStatus.COMPLETED]: 'success',
  [GoalStatus.PAUSED]: 'warning',
  [GoalStatus.CANCELLED]: 'error',
};

const goalStatusIcons: Record<GoalStatus, React.ReactNode> = {
  [GoalStatus.NOT_STARTED]: <RocketOutlined />,
  [GoalStatus.IN_PROGRESS]: <TrophyOutlined />,
  [GoalStatus.COMPLETED]: <CheckCircleOutlined />,
  [GoalStatus.PAUSED]: <PauseCircleOutlined />,
  [GoalStatus.CANCELLED]: <CloseCircleOutlined />,
};

const priorityColors = ['#d9d9d9', '#bfbfbf', '#1890ff', '#fa8c16', '#f5222d'];

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return '#52c41a';
  if (percentage >= 75) return '#1890ff';
  if (percentage >= 50) return '#13c2c2';
  if (percentage >= 25) return '#faad14';
  return '#8c8c8c';
};

const Goals: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);
  const [contributingGoal, setContributingGoal] = useState<GoalWithProgress | null>(null);
  const [form] = Form.useForm();
  const [contributeForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch goals with progress
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals-progress'],
    queryFn: () => apiClient.getGoalsWithProgress(),
  });

  // Fetch summary stats
  const { data: summary } = useQuery<GoalSummary>({
    queryKey: ['goals-summary'],
    queryFn: () => apiClient.getGoalsSummary(),
  });

  // Fetch accounts for dropdown
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts({ is_active: true }),
  });

  // Fetch income summary
  const { data: incomeSummary } = useQuery<IncomeSummary>({
    queryKey: ['income-summary'],
    queryFn: () => apiClient.getIncomeSummary('month'),
  });

  // Fetch budgets for spending calculation
  const { data: budgets = [] } = useQuery<BudgetWithProgress[]>({
    queryKey: ['budgets-progress'],
    queryFn: () => apiClient.getBudgetsWithProgress(),
  });

  // Create goal mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      message.success('Goal created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create goal');
    },
  });

  // Update goal mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      message.success('Goal updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update goal');
    },
  });

  // Delete goal mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      message.success('Goal deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete goal');
    },
  });

  // Contribute to goal mutation
  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      apiClient.contributeToGoal(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      queryClient.invalidateQueries({ queryKey: ['goals-summary'] });
      message.success('Contribution added successfully');
      handleCloseContributeModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to add contribution');
    },
  });

  const handleOpenModal = (goal?: GoalWithProgress) => {
    if (goal) {
      setEditingGoal(goal);
      form.setFieldsValue({
        ...goal,
        start_date: dayjs(goal.start_date),
        target_date: dayjs(goal.target_date),
      });
    } else {
      setEditingGoal(null);
      form.resetFields();
      form.setFieldsValue({
        start_date: dayjs(),
        target_date: dayjs().add(1, 'year'),
        current_amount: 0,
        priority: 3,
        status: GoalStatus.IN_PROGRESS,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
    form.resetFields();
  };

  const handleOpenContributeModal = (goal: GoalWithProgress) => {
    setContributingGoal(goal);
    contributeForm.resetFields();
    setIsContributeModalOpen(true);
  };

  const handleCloseContributeModal = () => {
    setIsContributeModalOpen(false);
    setContributingGoal(null);
    contributeForm.resetFields();
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      start_date: values.start_date.format('YYYY-MM-DD'),
      target_date: values.target_date.format('YYYY-MM-DD'),
    };

    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleContribute = async (values: { amount: number }) => {
    if (contributingGoal) {
      contributeMutation.mutate({ id: contributingGoal.id, amount: values.amount });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Filter goals by status
  const activeGoals = goals.filter((g: GoalWithProgress) => 
    g.status === GoalStatus.IN_PROGRESS || g.status === GoalStatus.NOT_STARTED
  );
  const completedGoals = goals.filter((g: GoalWithProgress) => g.status === GoalStatus.COMPLETED);
  const otherGoals = goals.filter((g: GoalWithProgress) => 
    g.status === GoalStatus.PAUSED || g.status === GoalStatus.CANCELLED
  );

  // Calculate available income for goals
  const expectedIncome = incomeSummary?.total_expected_income || 0;
  const totalBudgeted = budgets.reduce((sum: number, b: BudgetWithProgress) => sum + b.amount, 0);
  const availableForGoals = Math.max(0, expectedIncome - totalBudgeted);
  
  // Calculate suggested monthly contribution for active goals
  const totalRemainingForGoals = activeGoals.reduce((sum: number, g: GoalWithProgress) => sum + g.remaining_amount, 0);
  const suggestedMonthlyContribution = availableForGoals > 0 && totalRemainingForGoals > 0
    ? Math.min(availableForGoals, totalRemainingForGoals)
    : 0;

  const renderGoalCard = (goal: GoalWithProgress) => {
    const isOverdue = goal.days_remaining === 0 && goal.status !== GoalStatus.COMPLETED;
    
    return (
      <Col xs={24} sm={12} lg={8} key={goal.id}>
        <Badge.Ribbon 
          text={goalStatusLabels[goal.status]} 
          color={goalStatusColors[goal.status]}
        >
          <Card
            hoverable
            style={{ height: '100%', position: 'relative' }}
            styles={{ 
              body: { paddingBottom: 16 },
              actions: { borderTop: 'none', background: 'transparent' }
            }}
            actions={[
              <Tooltip title="Add Contribution" key="contribute">
                <Button 
                  type="text" 
                  icon={<DollarOutlined />} 
                  onClick={() => handleOpenContributeModal(goal)}
                  disabled={goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CANCELLED}
                />
              </Tooltip>,
              <Tooltip title="Edit" key="edit">
                <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(goal)} />
              </Tooltip>,
              <Popconfirm
                key="delete"
                title="Delete Goal"
                description="Are you sure you want to delete this goal?"
                onConfirm={() => handleDelete(goal.id)}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete">
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>,
            ]}
          >
            {/* Priority Stars */}
            <div style={{ position: 'absolute', top: 40, right: 12, display: 'flex', gap: 2, zIndex: 1 }}>
              {[1, 2, 3, 4, 5].map((level) => (
                level <= goal.priority ? (
                  <StarFilled key={level} style={{ fontSize: 12, color: priorityColors[goal.priority - 1] }} />
                ) : (
                  <StarOutlined key={level} style={{ fontSize: 12, color: '#d9d9d9' }} />
                )
              ))}
            </div>

            {/* Header */}
            <div style={{ marginBottom: 16, paddingRight: 80, paddingTop: 4 }}>
              <Title level={4} style={{ margin: 0, marginBottom: 4 }}>{goal.name}</Title>
              {goal.description && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {goal.description.length > 60 ? `${goal.description.substring(0, 60)}...` : goal.description}
                </Text>
              )}
            </div>

            {/* Progress Section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: getProgressColor(goal.progress_percentage), fontWeight: 600 }}>
                  ${goal.current_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: 500 }}>
                  ${goal.target_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </div>
              <Progress
                percent={Math.min(goal.progress_percentage, 100)}
                strokeColor={getProgressColor(goal.progress_percentage)}
                strokeWidth={10}
                showInfo={false}
                style={{ marginBottom: 4 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Saved</Text>
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: 600,
                  color: getProgressColor(goal.progress_percentage)
                }}>
                  {goal.progress_percentage.toFixed(1)}%
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>Goal</Text>
              </div>
            </div>

            {/* Remaining Amount */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: 'rgba(24, 144, 255, 0.05)',
              borderRadius: 6,
              marginBottom: 12
            }}>
              <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Remaining</Text>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#1890ff' }}>
                ${goal.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </div>

            {/* Date Info */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '8px 12px',
              background: isOverdue ? 'rgba(255, 77, 79, 0.08)' : 'rgba(255,255,255,0.04)',
              borderRadius: 6,
              marginBottom: 8
            }}>
              <CalendarOutlined style={{ color: isOverdue ? '#ff4d4f' : '#8c8c8c', fontSize: 12 }} />
              <Text style={{ fontSize: 12, color: isOverdue ? '#ff4d4f' : '#8c8c8c' }}>
                {goal.status === GoalStatus.COMPLETED ? (
                  `Completed ${dayjs(goal.completed_date).format('MMM D, YYYY')}`
                ) : (
                  <>
                    {isOverdue ? 'Overdue' : `${goal.days_remaining} days remaining`} • Target: {dayjs(goal.target_date).format('MMM D, YYYY')}
                  </>
                )}
              </Text>
            </div>

            {/* Account Link */}
            {goal.account_id && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                padding: '6px 12px',
                background: 'rgba(82, 196, 26, 0.08)',
                borderRadius: 6,
              }}>
                <WalletOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#52c41a' }}>
                  Linked to account
                </Text>
              </div>
            )}
          </Card>
        </Badge.Ribbon>
      </Col>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Goals</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Add Goal
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {summary && (
          <>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Active Goals"
                  value={summary.active_goals}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Target"
                  value={summary.total_target_amount}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total Saved"
                  value={summary.total_saved_amount}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Avg Progress"
                  value={summary.average_progress}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Income-Based Insights */}
      {incomeSummary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <span>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  Available for Goals
                </span>
              }
              style={{ height: '100%' }}
            >
              <Statistic
                value={availableForGoals}
                precision={2}
                prefix="$"
                suffix="/ month"
                valueStyle={{ color: availableForGoals > 0 ? '#52c41a' : '#ff4d4f', fontSize: 28 }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Expected Income: ${expectedIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Budgeted Expenses: ${totalBudgeted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </div>
              {availableForGoals <= 0 && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 8, 
                  background: 'rgba(255, 77, 79, 0.1)', 
                  borderRadius: 4 
                }}>
                  <Text style={{ fontSize: 12, color: '#ff4d4f' }}>
                    ⚠️ Your budgets exceed expected income. Review your budgets or increase income.
                  </Text>
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <span>
                  <RocketOutlined style={{ marginRight: 8 }} />
                  Suggested Monthly Savings
                </span>
              }
              style={{ height: '100%' }}
            >
              <Statistic
                value={suggestedMonthlyContribution}
                precision={2}
                prefix="$"
                suffix="/ month"
                valueStyle={{ color: '#1890ff', fontSize: 28 }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Remaining goal total: ${totalRemainingForGoals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </div>
              {suggestedMonthlyContribution > 0 && activeGoals.length > 0 && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 8, 
                  background: 'rgba(24, 144, 255, 0.1)', 
                  borderRadius: 4 
                }}>
                  <Text style={{ fontSize: 12, color: '#1890ff' }}>
                    💡 At this rate, you could reach your goals in approximately{' '}
                    {Math.ceil(totalRemainingForGoals / suggestedMonthlyContribution)} months
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Goals Grid */}
      {goals.length === 0 && !isLoading ? (
        <Card>
          <Empty
            description="No goals yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => handleOpenModal()}>
              Create Your First Goal
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <>
              <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
                Active Goals ({activeGoals.length})
              </Title>
              <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                {activeGoals.map(renderGoalCard)}
              </Row>
            </>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <>
              <Title level={4} style={{ marginBottom: 16 }}>
                Completed Goals ({completedGoals.length})
              </Title>
              <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                {completedGoals.map(renderGoalCard)}
              </Row>
            </>
          )}

          {/* Other Goals */}
          {otherGoals.length > 0 && (
            <>
              <Title level={4} style={{ marginBottom: 16 }}>
                Other Goals ({otherGoals.length})
              </Title>
              <Row gutter={[16, 16]}>
                {otherGoals.map(renderGoalCard)}
              </Row>
            </>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingGoal ? 'Edit Goal' : 'Add Goal'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Goal Name"
            rules={[{ required: true, message: 'Please enter goal name' }]}
          >
            <Input placeholder="e.g., Emergency Fund, Vacation, New Car" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <TextArea rows={3} placeholder="Describe your goal..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="target_amount"
                label="Target Amount"
                rules={[{ required: true, message: 'Please enter target amount' }]}
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
                name="current_amount"
                label="Current Amount"
                rules={[{ required: true, message: 'Please enter current amount' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="start_date"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_date"
                label="Target Date"
                rules={[{ required: true, message: 'Please select target date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select placeholder="Select priority">
                  <Option value={1}>⭐ Low</Option>
                  <Option value={2}>⭐⭐ Medium-Low</Option>
                  <Option value={3}>⭐⭐⭐ Medium</Option>
                  <Option value={4}>⭐⭐⭐⭐ High</Option>
                  <Option value={5}>⭐⭐⭐⭐⭐ Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="account_id"
                label="Linked Account (Optional)"
              >
                <Select placeholder="Select account" allowClear>
                  {accounts.map((account: Account) => (
                    <Option key={account.id} value={account.id}>
                      {account.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {editingGoal && (
            <Form.Item
              name="status"
              label="Status"
            >
              <Select placeholder="Select status">
                {Object.entries(goalStatusLabels).map(([value, label]) => (
                  <Option key={value} value={value}>
                    {goalStatusIcons[value as GoalStatus]} {label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="color"
            label="Color (Optional)"
          >
            <Input type="color" style={{ width: 100, height: 40 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingGoal ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        title={`Add Contribution to ${contributingGoal?.name}`}
        open={isContributeModalOpen}
        onCancel={handleCloseContributeModal}
        footer={null}
        destroyOnClose
      >
        {contributingGoal && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Current Amount:</Text>
                <Text strong>${contributingGoal.current_amount.toFixed(2)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Target Amount:</Text>
                <Text strong>${contributingGoal.target_amount.toFixed(2)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Remaining:</Text>
                <Text strong style={{ color: '#1890ff' }}>
                  ${contributingGoal.remaining_amount.toFixed(2)}
                </Text>
              </div>
            </div>

            <Form form={contributeForm} layout="vertical" onFinish={handleContribute}>
              <Form.Item
                name="amount"
                label="Contribution Amount"
                rules={[
                  { required: true, message: 'Please enter contribution amount' },
                  { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  autoFocus
                  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCloseContributeModal}>Cancel</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={contributeMutation.isPending}
                  >
                    Add Contribution
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Goals;
