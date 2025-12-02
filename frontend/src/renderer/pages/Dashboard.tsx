import React from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Progress, Space, Spin, Empty, Button } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Transaction, TransactionType, BudgetWithProgress, Account, Category } from '../../shared/types';

const { Title, Text } = Typography;

// Colors for charts
const COLORS = [
  '#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16',
  '#13c2c2', '#f5222d', '#faad14', '#2f54eb', '#a0d911',
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch account balances
  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: ['reports-balances'],
    queryFn: () => apiClient.getAccountBalances(),
  });

  // Fetch income vs expenses for this month
  const { data: incomeExpenseData, isLoading: incomeExpenseLoading } = useQuery({
    queryKey: ['reports-income-expense-month'],
    queryFn: () =>
      apiClient.getIncomeVsExpenses({
        start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
        end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
      }),
  });

  // Fetch spending by category for this month
  const { data: spendingData, isLoading: spendingLoading } = useQuery({
    queryKey: ['reports-spending-month'],
    queryFn: () =>
      apiClient.getSpendingByCategory({
        start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
        end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
      }),
  });

  // Fetch recent transactions
  const { data: recentTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => apiClient.getTransactions({ limit: 10 }),
  });

  // Fetch budgets with progress
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets-progress'],
    queryFn: () => apiClient.getBudgetsWithProgress(),
  });

  // Fetch accounts for display
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  });

  // Fetch categories for display
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  // Helper functions
  const getAccountName = (accountId?: number) => {
    if (!accountId) return '-';
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account?.name || 'Unknown';
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
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
    return findCategory(categories)?.name || 'Unknown';
  };

  // Prepare pie chart data
  const pieChartData = spendingData?.categories?.slice(0, 6).map((cat: any, index: number) => ({
    name: cat.name,
    value: cat.amount,
    color: cat.color || COLORS[index % COLORS.length],
  })) || [];

  // Recent transactions columns
  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'transaction_date',
      key: 'date',
      width: 100,
      render: (date: string) => dayjs(date).format('MMM D'),
    },
    {
      title: 'Description',
      key: 'description',
      render: (_: any, record: Transaction) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.payee || getCategoryName(record.category_id)}</div>
          {record.transaction_type === TransactionType.TRANSFER && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <SwapOutlined /> {getAccountName(record.from_account_id)} → {getAccountName(record.to_account_id)}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number, record: Transaction) => {
        const color =
          record.transaction_type === TransactionType.INCOME
            ? '#52c41a'
            : record.transaction_type === TransactionType.EXPENSE
            ? '#ff4d4f'
            : '#1890ff';
        const prefix =
          record.transaction_type === TransactionType.INCOME
            ? '+'
            : record.transaction_type === TransactionType.EXPENSE
            ? '-'
            : '';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {prefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
  ];

  const isLoading = balancesLoading || incomeExpenseLoading;

  return (
    <div>
      <Title level={2}>Dashboard</Title>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Net Worth"
              value={balancesData?.net_worth || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: (balancesData?.net_worth || 0) >= 0 ? '#3f8600' : '#cf1322' }}
              suffix={<WalletOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Monthly Income"
              value={incomeExpenseData?.income || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Monthly Expenses"
              value={incomeExpenseData?.expenses || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#cf1322' }}
              suffix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic
              title="Monthly Savings"
              value={incomeExpenseData?.net || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: (incomeExpenseData?.net || 0) >= 0 ? '#52c41a' : '#cf1322' }}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  ({incomeExpenseData?.savings_rate?.toFixed(0) || 0}%)
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions and Budget Overview */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title="Recent Transactions"
            extra={
              <Button type="link" onClick={() => navigate('/transactions')}>View All</Button>
            }
          >
            {transactionsLoading ? (
              <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin />
              </div>
            ) : recentTransactions.length === 0 ? (
              <Empty description="No transactions yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table
                columns={transactionColumns}
                dataSource={recentTransactions}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="Budget Overview"
            extra={
              <Button type="link" onClick={() => navigate('/budgets')}>View All</Button>
            }
          >
            {budgetsLoading ? (
              <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin />
              </div>
            ) : budgets.length === 0 ? (
              <Empty description="No budgets set" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div>
                {budgets.slice(0, 5).map((budget: BudgetWithProgress) => (
                  <div key={budget.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>{budget.name}</Text>
                      <Text type="secondary">
                        ${budget.spent.toLocaleString('en-US', { minimumFractionDigits: 0 })} / ${budget.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.min(budget.percentage, 100)}
                      status={budget.percentage >= 100 ? 'exception' : budget.percentage >= 80 ? 'active' : 'success'}
                      strokeColor={
                        budget.percentage >= 100
                          ? '#ff4d4f'
                          : budget.percentage >= 80
                          ? '#faad14'
                          : '#52c41a'
                      }
                      size="small"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Spending by Category and Account Balances */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card
            title="Spending by Category"
            extra={
              <Text type="secondary">{dayjs().format('MMMM YYYY')}</Text>
            }
          >
            {spendingLoading ? (
              <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin />
              </div>
            ) : pieChartData.length === 0 ? (
              <Empty description="No spending this month" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Account Balances"
            extra={
              <Button type="link" onClick={() => navigate('/accounts')}>View All</Button>
            }
          >
            {balancesLoading ? (
              <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin />
              </div>
            ) : !balancesData?.accounts?.length ? (
              <Empty description="No accounts" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div>
                {balancesData.accounts.slice(0, 5).map((acc: any) => (
                  <div
                    key={acc.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
                    }}
                  >
                    <Space>
                      <WalletOutlined />
                      <div>
                        <Text strong>{acc.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {acc.type.replace('_', ' ').toUpperCase()}
                        </Text>
                      </div>
                    </Space>
                    <Text
                      strong
                      style={{
                        color: acc.balance >= 0 ? '#52c41a' : '#ff4d4f',
                      }}
                    >
                      {acc.currency} {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 16,
                    marginTop: 8,
                    borderTop: '2px solid var(--ant-color-border-secondary, #f0f0f0)',
                  }}
                >
                  <Text strong>Net Worth</Text>
                  <Text
                    strong
                    style={{
                      color: (balancesData?.net_worth || 0) >= 0 ? '#52c41a' : '#ff4d4f',
                    }}
                  >
                    ${balancesData?.net_worth?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
