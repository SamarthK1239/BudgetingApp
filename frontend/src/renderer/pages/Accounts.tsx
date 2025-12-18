import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  CreditCardOutlined,
  WalletOutlined,
  DollarOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Account, AccountType } from '../../shared/types';

const { Title } = Typography;
const { Option } = Select;

const accountTypeLabels: Record<AccountType, string> = {
  [AccountType.CHECKING]: 'Checking',
  [AccountType.SAVINGS]: 'Savings',
  [AccountType.CREDIT_CARD]: 'Credit Card',
  [AccountType.CASH]: 'Cash',
  [AccountType.INVESTMENT]: 'Investment',
  [AccountType.LOAN]: 'Loan',
  [AccountType.OTHER]: 'Other',
};

const accountTypeIcons: Record<AccountType, React.ReactNode> = {
  [AccountType.CHECKING]: <BankOutlined />,
  [AccountType.SAVINGS]: <WalletOutlined />,
  [AccountType.CREDIT_CARD]: <CreditCardOutlined />,
  [AccountType.CASH]: <DollarOutlined />,
  [AccountType.INVESTMENT]: <LineChartOutlined />,
  [AccountType.LOAN]: <BankOutlined />,
  [AccountType.OTHER]: <WalletOutlined />,
};

const accountTypeColors: Record<AccountType, string> = {
  [AccountType.CHECKING]: 'blue',
  [AccountType.SAVINGS]: 'green',
  [AccountType.CREDIT_CARD]: 'red',
  [AccountType.CASH]: 'gold',
  [AccountType.INVESTMENT]: 'purple',
  [AccountType.LOAN]: 'orange',
  [AccountType.OTHER]: 'default',
};

const Accounts: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [balanceAdjustAccount, setBalanceAdjustAccount] = useState<Account | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Account created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to create account');
    },
  });

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiClient.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Account updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to update account');
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Account deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.message || 'Failed to delete account');
    },
  });

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      form.setFieldsValue(account);
    } else {
      setEditingAccount(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Calculate totals
  const totalAssets = accounts
    .filter((acc: Account) => acc.is_active && !['credit_card', 'loan'].includes(acc.account_type))
    .reduce((sum: number, acc: Account) => sum + acc.current_balance, 0);

  const totalLiabilities = accounts
    .filter((acc: Account) => acc.is_active && ['credit_card', 'loan'].includes(acc.account_type))
    .reduce((sum: number, acc: Account) => sum + Math.abs(acc.current_balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const columns = [
    {
      title: 'Account',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Account) => (
        <Space>
          {accountTypeIcons[record.account_type]}
          <span>{name}</span>
          {!record.is_active && <Tag color="default">Inactive</Tag>}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type: AccountType) => (
        <Tag color={accountTypeColors[type]}>{accountTypeLabels[type]}</Tag>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
    },
    {
      title: 'Current Balance',
      dataIndex: 'current_balance',
      key: 'current_balance',
      align: 'right' as const,
      render: (balance: number, record: Account) => {
        // For credit cards and loans, positive balance means debt (red)
        // For other accounts, positive balance is good (green)
        const isDebtAccount = ['credit_card', 'loan'].includes(record.account_type);
        let color: string;
        
        if (isDebtAccount) {
          // Debt accounts: positive balance (owing money) is red, zero/negative is green
          color = balance > 0 ? '#ff4d4f' : '#52c41a';
        } else {
          // Asset accounts: positive balance is green, negative is red
          color = balance >= 0 ? '#52c41a' : '#ff4d4f';
        }
        
        return (
          <span
            style={{
              color: color,
              fontWeight: 'bold',
            }}
          >
            {record.currency} {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: 'Initial Balance',
      dataIndex: 'initial_balance',
      key: 'initial_balance',
      align: 'right' as const,
      render: (balance: number, record: Account) => (
        <span style={{ color: '#8c8c8c' }}>
          {record.currency} {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: Account) => (
        <Space>
          <Tooltip title="Adjust Balance">
            <Button
              type="text"
              icon={<DollarOutlined />}
              onClick={() => {
                setBalanceAdjustAccount(record);
                setNewBalance(record.current_balance);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Account"
            description="Are you sure you want to delete this account?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Accounts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Assets"
              value={totalAssets}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Liabilities"
              value={totalLiabilities}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Net Worth"
              value={netWorth}
              precision={2}
              prefix="$"
              valueStyle={{ color: netWorth >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Accounts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            currency: 'USD',
            initial_balance: 0,
            account_type: AccountType.CHECKING,
          }}
        >
          <Form.Item
            name="name"
            label="Account Name"
            rules={[{ required: true, message: 'Please enter account name' }]}
          >
            <Input placeholder="e.g., Main Checking" />
          </Form.Item>

          <Form.Item
            name="account_type"
            label="Account Type"
            rules={[{ required: true, message: 'Please select account type' }]}
          >
            <Select placeholder="Select account type">
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <Option key={value} value={value}>
                  <Space>
                    {accountTypeIcons[value as AccountType]}
                    {label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="currency" label="Currency">
            <Select placeholder="Select currency">
              <Option value="USD">USD - US Dollar</Option>
              <Option value="EUR">EUR - Euro</Option>
              <Option value="GBP">GBP - British Pound</Option>
              <Option value="CAD">CAD - Canadian Dollar</Option>
              <Option value="AUD">AUD - Australian Dollar</Option>
              <Option value="JPY">JPY - Japanese Yen</Option>
            </Select>
          </Form.Item>

          {!editingAccount ? (
            <Form.Item name="initial_balance" label="Initial Balance">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
              />
            </Form.Item>
          ) : (
            <Form.Item 
              name="current_balance" 
              label="Current Balance"
              extra="Adjust the current balance to match your actual account balance"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
              />
            </Form.Item>
          )}

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Optional notes about this account" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingAccount ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Quick Balance Adjustment Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined />
            Adjust Balance - {balanceAdjustAccount?.name}
          </Space>
        }
        open={!!balanceAdjustAccount}
        onCancel={() => {
          setBalanceAdjustAccount(null);
          setNewBalance(null);
        }}
        onOk={() => {
          if (balanceAdjustAccount && newBalance !== null) {
            updateMutation.mutate({ 
              id: balanceAdjustAccount.id, 
              data: { current_balance: newBalance } 
            });
            setBalanceAdjustAccount(null);
            setNewBalance(null);
          }
        }}
        okText="Update Balance"
        okButtonProps={{ loading: updateMutation.isPending }}
        destroyOnClose
      >
        {balanceAdjustAccount && (
          <div>
            <p style={{ marginBottom: 16 }}>
              Current balance: <strong>{balanceAdjustAccount.currency} {balanceAdjustAccount.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </p>
            <Form.Item label="New Balance">
              <InputNumber
                style={{ width: '100%' }}
                value={newBalance}
                onChange={(value) => setNewBalance(value)}
                placeholder="0.00"
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                autoFocus
              />
            </Form.Item>
            {newBalance !== null && newBalance !== balanceAdjustAccount.current_balance && (
              <p style={{ 
                color: (newBalance - balanceAdjustAccount.current_balance) >= 0 ? '#52c41a' : '#ff4d4f',
                marginTop: 8 
              }}>
                Difference: {(newBalance - balanceAdjustAccount.current_balance) >= 0 ? '+' : ''}
                {balanceAdjustAccount.currency} {(newBalance - balanceAdjustAccount.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Accounts;
