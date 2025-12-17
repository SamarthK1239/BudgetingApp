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
  message,
  Popconfirm,
  Tooltip,
  Select,
  Empty,
  Statistic,
  List,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { IncomeSchedule, IncomeFrequency, UpcomingIncome, IncomeSummary, Account, Category } from '../../shared/types';

const { Title, Text } = Typography;
const { Option } = Select;

const frequencyLabels: Record<IncomeFrequency, string> = {
  [IncomeFrequency.WEEKLY]: 'Weekly',
  [IncomeFrequency.BIWEEKLY]: 'Biweekly (Every 2 weeks)',
  [IncomeFrequency.SEMIMONTHLY]: 'Semimonthly (Twice a month)',
  [IncomeFrequency.MONTHLY]: 'Monthly',
  [IncomeFrequency.QUARTERLY]: 'Quarterly',
  [IncomeFrequency.ANNUAL]: 'Annual',
};

const Income: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<IncomeSchedule | null>(null);
  const [form] = Form.useForm();
  const [selectedFrequency, setSelectedFrequency] = useState<IncomeFrequency>(IncomeFrequency.MONTHLY);
  const queryClient = useQueryClient();

  // Fetch income schedules
  const { data: schedules = [], isLoading } = useQuery<IncomeSchedule[]>({
    queryKey: ['income-schedules'],
    queryFn: () => apiClient.getIncomeSchedules({ is_active: true }),
  });

  // Fetch upcoming income
  const { data: upcomingIncome = [] } = useQuery<UpcomingIncome[]>({
    queryKey: ['upcoming-income'],
    queryFn: () => apiClient.getUpcomingIncome(30),
  });

  // Fetch income summary
  const { data: summary } = useQuery<IncomeSummary>({
    queryKey: ['income-summary'],
    queryFn: () => apiClient.getIncomeSummary('month'),
  });

  // Fetch accounts and categories
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts({ is_active: true }),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createIncomeSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-income'] });
      queryClient.invalidateQueries({ queryKey: ['income-summary'] });
      message.success('Income schedule created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create income schedule');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateIncomeSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-income'] });
      queryClient.invalidateQueries({ queryKey: ['income-summary'] });
      message.success('Income schedule updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update income schedule');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteIncomeSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-income'] });
      queryClient.invalidateQueries({ queryKey: ['income-summary'] });
      message.success('Income schedule deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete income schedule');
    },
  });

  // Advance mutation
  const advanceMutation = useMutation({
    mutationFn: (id: number) => apiClient.advanceIncomeSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-income'] });
      message.success('Advanced to next payment date');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to advance schedule');
    },
  });

  const handleOpenModal = (schedule?: IncomeSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setSelectedFrequency(schedule.frequency);
      form.setFieldsValue({
        name: schedule.name,
        description: schedule.description,
        amount: schedule.amount,
        frequency: schedule.frequency,
        start_date: dayjs(schedule.start_date),
        semimonthly_day1: schedule.semimonthly_day1,
        semimonthly_day2: schedule.semimonthly_day2,
        account_id: schedule.account_id,
        category_id: schedule.category_id,
      });
    } else {
      setEditingSchedule(null);
      setSelectedFrequency(IncomeFrequency.MONTHLY);
      form.resetFields();
      form.setFieldsValue({
        start_date: dayjs(),
        frequency: IncomeFrequency.MONTHLY,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      start_date: values.start_date.format('YYYY-MM-DD'),
    };

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleAdvance = (id: number) => {
    advanceMutation.mutate(id);
  };

  // Get income categories
  const incomeCategories = categories.filter((c: Category) => c.category_type === 'income');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Income Schedules</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Add Income Schedule
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Expected This Month"
                value={summary.total_expected_income}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Expected Payments"
                value={summary.expected_payment_count}
                suffix="payments"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Active Schedules"
                value={summary.active_schedules}
                suffix="schedules"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* Income Schedules List */}
        <Col xs={24} lg={14}>
          <Card title="Income Schedules">
            {schedules.length === 0 && !isLoading ? (
              <Empty description="No income schedules" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" onClick={() => handleOpenModal()}>
                  Add Your First Income Schedule
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={schedules}
                renderItem={(schedule: IncomeSchedule) => (
                  <List.Item
                    actions={[
                      <Tooltip title="Mark as Received & Advance" key="advance">
                        <Button
                          type="text"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleAdvance(schedule.id)}
                        />
                      </Tooltip>,
                      <Tooltip title="Edit" key="edit">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenModal(schedule)}
                        />
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title="Delete Income Schedule"
                        description="Are you sure you want to delete this income schedule?"
                        onConfirm={() => handleDelete(schedule.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Tooltip title="Delete">
                          <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{schedule.name}</span>
                          <Badge
                            count={frequencyLabels[schedule.frequency]}
                            style={{ backgroundColor: '#1890ff' }}
                          />
                        </div>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                            ${schedule.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            <CalendarOutlined /> Next expected: {dayjs(schedule.next_expected_date).format('MMM D, YYYY')}
                          </Text>
                          {schedule.description && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {schedule.description}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Upcoming Income */}
        <Col xs={24} lg={10}>
          <Card title="Upcoming Income (Next 30 Days)">
            {upcomingIncome.length === 0 ? (
              <Empty description="No upcoming income" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                dataSource={upcomingIncome}
                renderItem={(income: UpcomingIncome) => {
                  const isOverdue = income.days_until < 0;
                  const isDueToday = income.days_until === 0;
                  
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <div style={{ 
                            width: 48, 
                            height: 48, 
                            borderRadius: 24,
                            background: isOverdue ? '#ff4d4f' : isDueToday ? '#faad14' : '#52c41a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            {isOverdue ? '!' : isDueToday ? '•' : income.days_until}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{income.schedule_name}</span>
                            <Text strong style={{ color: '#52c41a' }}>
                              ${income.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                          </div>
                        }
                        description={
                          <div>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {dayjs(income.expected_date).format('MMM D, YYYY')}
                            </Text>
                            {' • '}
                            <Text style={{ 
                              fontSize: 13,
                              color: isOverdue ? '#ff4d4f' : isDueToday ? '#faad14' : '#52c41a'
                            }}>
                              {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : `In ${income.days_until} days`}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal
        title={editingSchedule ? 'Edit Income Schedule' : 'Add Income Schedule'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Income Name"
            rules={[{ required: true, message: 'Please enter income name' }]}
          >
            <Input placeholder="e.g., Primary Job Salary, Freelance Project" />
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <Input placeholder="Additional details..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
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
                name="frequency"
                label="Frequency"
                rules={[{ required: true, message: 'Please select frequency' }]}
              >
                <Select 
                  placeholder="Select frequency"
                  onChange={(value) => setSelectedFrequency(value as IncomeFrequency)}
                >
                  {Object.entries(frequencyLabels).map(([value, label]) => (
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

          {selectedFrequency === IncomeFrequency.SEMIMONTHLY && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="semimonthly_day1"
                  label="First Day of Month"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={31}
                    placeholder="e.g., 1"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="semimonthly_day2"
                  label="Second Day of Month"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={31}
                    placeholder="e.g., 15"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="account_id" label="Account (Optional)">
                <Select placeholder="Select account" allowClear>
                  {accounts.map((account: Account) => (
                    <Option key={account.id} value={account.id}>
                      {account.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category_id" label="Category (Optional)">
                <Select placeholder="Select category" allowClear>
                  {incomeCategories.map((cat: Category) => (
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
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingSchedule ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Income;
